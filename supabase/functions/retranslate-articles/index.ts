import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helpers reutilizados do scrape-news
async function checkRobotsTxt(url: string): Promise<boolean> {
  try {
    const urlObj = new URL(url);
    const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`;
    const response = await fetch(robotsUrl, {
      headers: { 'User-Agent': 'ReconNews-Bot/1.0' },
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) return true;
    const robotsText = await response.text();
    const lines = robotsText.split('\n').map(line => line.trim().toLowerCase());
    let userAgentMatch = false;
    let disallowed = false;
    for (const line of lines) {
      if (line.startsWith('user-agent:')) {
        const agent = line.split(':')[1].trim();
        userAgentMatch = agent === '*' || agent.includes('reconnews') || agent.includes('bot');
      } else if (userAgentMatch && line.startsWith('disallow:')) {
        const path = line.split(':')[1].trim();
        if (path === '/' || path === '*') {
          disallowed = true;
          break;
        }
      }
    }
    return !disallowed;
  } catch {
    return true;
  }
}

async function fetchWithRetry(url: string, init: RequestInit = {}, attempts = 2, baseTimeoutMs = 10000, backoffMs = 1500): Promise<Response> {
  let lastError: any = null;
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(baseTimeoutMs),
        headers: {
          'User-Agent': 'ReconNews-Bot/1.0 (Retranslate)',
          ...(init.headers || {} as Record<string,string>)
        }
      });
      if (res.ok) return res;
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err;
    }
    if (i < attempts) await new Promise(r => setTimeout(r, backoffMs * i));
  }
  throw lastError || new Error(`Falha ao buscar ${url}`);
}

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractMainContent(html: string): string {
  const articleMatch = html.match(/<article[\s\S]*?<\/article>/i);
  if (articleMatch) return stripTags(articleMatch[0]);
  const mainMatch = html.match(/<main[\s\S]*?<\/main>/i);
  if (mainMatch) return stripTags(mainMatch[0]);
  const ps = html.match(/<p[\s\S]*?<\/p>/gi);
  if (ps && ps.length > 3) return stripTags(ps.join(' '));
  return stripTags(html);
}

async function translateTextToPt(text: string): Promise<{ translated: string; provider: string } | null> {
  const provider = (Deno.env.get('RECON_TRANSLATION_PROVIDER') || '').toLowerCase();
  if (!provider) return null;
  try {
    if (provider === 'deepl') {
      const key = Deno.env.get('RECON_DEEPL_API_KEY') || Deno.env.get('DEEPL_API_KEY');
      if (!key) return null;
      const params = new URLSearchParams();
      params.set('text', text);
      params.set('target_lang', 'PT-BR');
      const res = await fetch('https://api-free.deepl.com/v2/translate', {
        method: 'POST',
        headers: {
          'Authorization': `DeepL-Auth-Key ${key}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'ReconNews-Bot/1.0'
        },
        body: params,
        signal: AbortSignal.timeout(12000)
      });
      if (!res.ok) {
        console.log('⚠️ Falha DeepL:', res.status, await res.text());
        return null;
      }
      const data = await res.json();
      const translated = data?.translations?.[0]?.text || '';
      return translated ? { translated, provider: 'deepl' } : null;
    }
    return null;
  } catch (err) {
    console.log('⚠️ Erro ao traduzir:', err?.message || err);
    return null;
  }
}

async function translateViaMyMemory(text: string): Promise<{ translated: string; provider: string } | null> {
  try {
    const qs = `q=${encodeURIComponent(text)}&langpair=${encodeURIComponent('auto|pt-BR')}`;
    const res = await fetch(`https://api.mymemory.translated.net/get?${qs}`, {
      headers: { 'User-Agent': 'ReconNews-Bot/1.0' },
      signal: AbortSignal.timeout(12000)
    });
    if (!res.ok) return null;
    const data = await res.json();
    const translated = data?.responseData?.translatedText || '';
    return translated ? { translated, provider: 'mymemory' } : null;
  } catch {
    return null;
  }
}

async function translateTextToPtWithFallback(text: string): Promise<{ translated: string; provider: string } | null> {
  const primary = await translateTextToPt(text);
  if (primary) return primary;
  if ((text || '').length <= 500) return await translateViaMyMemory(text);
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += 480) {
    chunks.push(text.slice(i, i + 480));
  }
  const parts: string[] = [];
  for (const c of chunks) {
    const t = await translateViaMyMemory(c);
    parts.push(t?.translated || c);
    await new Promise(r => setTimeout(r, 300));
  }
  const joined = parts.join(' ');
  return { translated: joined, provider: 'mymemory' };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let limit = Math.max(1, Math.min(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 200));
    try {
      const body = await req.json();
      if (body && typeof body.limit === 'number') {
        limit = Math.max(1, Math.min(parseInt(String(body.limit), 10) || limit, 200));
      }
    } catch {}

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('PROJECT_URL') ?? Deno.env.get('RECON_SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('RECON_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const provider = (Deno.env.get('RECON_TRANSLATION_PROVIDER') || '').toLowerCase();
    if (!provider) {
      return new Response(JSON.stringify({ success: false, error: 'Translation provider não configurado (RECON_TRANSLATION_PROVIDER)' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
    }

    const { data: articles, error } = await supabase
      .from('articles')
      .select('id, url, title, description, title_pt, description_pt, extended_summary_pt, translation_provider, scraped_at')
      .or('title_pt.is.null,description_pt.is.null,extended_summary_pt.is.null')
      .order('scraped_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('✗ Erro ao consultar artigos:', error.message);
      return new Response(JSON.stringify({ success: false, error: 'Falha ao consultar artigos' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
    }

    let processed = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const a of articles || []) {
      processed++;
      const patch: Record<string, any> = {};

      if (!a.title_pt && a.title) {
        const t = await translateTextToPtWithFallback(a.title);
        if (t) {
          patch.title_pt = t.translated;
          patch.translation_provider = t.provider;
        }
      }
      if (!a.description_pt && a.description) {
        const t = await translateTextToPtWithFallback(a.description);
        if (t) {
          patch.description_pt = t.translated;
          patch.translation_provider = t.provider;
        }
      }
      if (!a.extended_summary_pt && a.url && await checkRobotsTxt(a.url)) {
        try {
          const pageRes = await fetchWithRetry(a.url, { headers: { 'User-Agent': 'ReconNews-Bot/1.0' } }, 2, 12000, 2000);
          if (pageRes.ok) {
            const html = await pageRes.text();
            let content = extractMainContent(html).substring(0, 8000);
            if (content) {
              const t = await translateTextToPtWithFallback(content);
              if (t) {
                patch.extended_summary_pt = t.translated;
                patch.translation_provider = t.provider;
              }
            }
          }
        } catch (err) {
          console.log('⚠️ Falha ao obter resumo estendido:', err?.message || err);
        }
      }

      if (Object.keys(patch).length > 0) {
        const { error: upErr } = await supabase
          .from('articles')
          .update(patch)
          .eq('id', a.id);
        if (upErr) {
          errors.push(`id=${a.id}: ${upErr.message}`);
          skipped++;
        } else {
          updated++;
        }
      } else {
        skipped++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed, updated, skipped, limit }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('❌ Erro na retranslação:', error);
    return new Response(JSON.stringify({ success: false, error: 'Falha ao reprocessar traduções' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});
