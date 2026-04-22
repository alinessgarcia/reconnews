import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_ALLOWED_HOSTS = [
  'gospelprime.com.br', 'gospelmais.com.br', 'guiame.com.br',
  'nfrfrases.com.br', 'cpadnews.com.br',
  'portasabertas.org.br', 'acidigital.com',
  'minhavida.com.br', 'tuasaude.com', 'abril.com.br', 'uol.com.br',
  'einstein.br', 'globo.com', 'g1.globo.com',
  'ecycle.com.br', 'ciclovivo.com.br', 'greenme.com.br',
  'mundoboaforma.com.br', 'ativo.com', 'receitasninja.com',
  'folha.uol.com.br', 'estadao.com.br', 'terra.com.br',
  'r7.com', 'correiobraziliense.com.br', 'gazetadopovo.com.br',
  'bbc.com',
];

function getBearerToken(req: Request): string {
  const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization');
  if (!authHeader) return '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) return '';
  return authHeader.slice(7).trim();
}

function getApiKey(req: Request): string {
  return (req.headers.get('apikey') ?? req.headers.get('x-api-key') ?? '').trim();
}

function getHost(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function normalizeHostList(hosts: string[]): string[] {
  return hosts
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean)
    .map((h) => (h.startsWith('.') ? h.slice(1) : h));
}

function isHostAllowed(host: string, allowed: string[]): boolean {
  const normalizedHost = host.trim().toLowerCase();
  return allowed.some((allowedHost) => normalizedHost === allowedHost || normalizedHost.endsWith(`.${allowedHost}`));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('PROJECT_URL') ?? Deno.env.get('RECON_SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('RECON_SERVICE_ROLE_KEY')!;
    const bearerToken = getBearerToken(req);
    const apiKey = getApiKey(req);

    if (!supabaseServiceKey || (bearerToken !== supabaseServiceKey && apiKey !== supabaseServiceKey)) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized caller' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const countryOnly = (Deno.env.get('RECON_COUNTRY_ONLY') || 'BR').toUpperCase();
    const suffix = countryOnly === 'BR' ? '.br' : `.${countryOnly.toLowerCase()}`;

    let allowedHosts = (Deno.env.get('RECON_ALLOWED_HOSTS') || '')
      .split(',')
      .map((h) => h.trim())
      .filter(Boolean);
    if (allowedHosts.length === 0) {
      allowedHosts = DEFAULT_ALLOWED_HOSTS;
    }
    const normalizedAllowedHosts = normalizeHostList(allowedHosts);

    const { data: articles, error } = await supabase
      .from('articles')
      .select('id,url')
      .limit(10000);

    if (error) {
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const toDeleteIds: string[] = [];
    let keptByAllowlist = 0;

    for (const article of articles || []) {
      const host = getHost(article.url);
      if (!host) continue;

      const matchesCountrySuffix = host.endsWith(suffix);
      const matchesAllowlist = isHostAllowed(host, normalizedAllowedHosts);

      if (!matchesCountrySuffix && !matchesAllowlist) {
        toDeleteIds.push(article.id as unknown as string);
      } else if (!matchesCountrySuffix && matchesAllowlist) {
        keptByAllowlist++;
      }
    }

    let deleted = 0;
    if (toDeleteIds.length > 0) {
      const { error: deleteError, count } = await supabase
        .from('articles')
        .delete({ count: 'exact' })
        .in('id', toDeleteIds);

      if (deleteError) {
        return new Response(JSON.stringify({ success: false, error: deleteError.message }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }

      deleted = count || toDeleteIds.length;
    }

    return new Response(
      JSON.stringify({
        success: true,
        checked: (articles || []).length,
        deleted,
        keptByAllowlist,
        countryOnly,
        allowlistSize: normalizedAllowedHosts.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error?.message || String(error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
