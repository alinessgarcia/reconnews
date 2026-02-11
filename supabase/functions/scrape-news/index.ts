import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Verificar robots.txt antes de fazer scraping
async function checkRobotsTxt(url: string): Promise<boolean> {
  try {
    const urlObj = new URL(url);
    const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`;

    const response = await fetch(robotsUrl, {
      headers: { 'User-Agent': 'ReconNews-Bot/1.0' },
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      console.log(`⚠️ Robots.txt não encontrado para ${urlObj.host}, prosseguindo com scraping`);
      return true; // Se não há robots.txt, assumimos que é permitido
    }

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

    if (disallowed) {
      console.log(`🚫 Scraping não permitido pelo robots.txt de ${urlObj.host}`);
      return false;
    }

    console.log(`✅ Scraping permitido pelo robots.txt de ${urlObj.host}`);
    return true;
  } catch (error) {
    console.log(`⚠️ Erro ao verificar robots.txt para ${url}:`, error.message);
    return true; // Em caso de erro, assumimos que é permitido
  }
}

// Fetch com retry e backoff para robustez
async function fetchWithRetry(url: string, init: RequestInit = {}, attempts = 3, baseTimeoutMs = 10000, backoffMs = 1500): Promise<Response> {
  let lastError: unknown = null;
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(baseTimeoutMs),
        headers: {
          'User-Agent': 'ReconNews-Bot/1.0 (Christian News Aggregator)',
          ...(init.headers || {} as Record<string, string>)
        }
      });
      if (res.ok) return res;
      lastError = new Error(`HTTP ${res.status}`);
      console.log(`  ⚠️ Tentativa ${i}/${attempts} falhou para ${url}: HTTP ${res.status}`);
    } catch (err) {
      lastError = err;
      console.log(`  ⚠️ Tentativa ${i}/${attempts} falhou para ${url}: ${err?.message || err}`);
    }
    if (i < attempts) await new Promise(r => setTimeout(r, backoffMs * i));
  }
  throw lastError || new Error(`Falha ao buscar ${url}`);
}

interface Article {
  title: string;
  description?: string;
  url: string;
  source: string;
  published_at?: string;
  image_url?: string;
  category?: string;
}

// ===== Tradução e extração de conteúdo para resumo estendido =====
function isLikelyEnglish(text: string): boolean {
  const s = (text || '').toLowerCase();
  // Heurística simples: presença de termos comuns em inglês e ausência de acentos
  const commonEn = [' the ', ' of ', ' and ', ' in ', ' on ', ' with ', ' for ', ' from ', ' by '];
  const hasAccents = /[áéíóúâêîôûãõç]/i.test(s);
  const enHits = commonEn.filter(w => s.includes(w)).length;
  return enHits >= 2 && !hasAccents;
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
      // DeepL aceita 'PT-BR' ou 'PT'; usamos PT-BR para melhor regionalização
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
    // Espaço para outros provedores (openai, google)
    return null;
  } catch (err) {
    console.log('⚠️ Erro ao traduzir:', err?.message || err);
    return null;
  }
}

async function translateViaMyMemory(text: string): Promise<{ translated: string; provider: string } | null> {
  // MyMemory exige langpair com ISO de 2 letras; usar 'en|pt' para conteúdo internacional
  // Se já for PT, não traduz
  const s = (text || '').toLowerCase();
  const isPtLike = /[áéíóúâêîôûãõç]/.test(s) || /ção|que|de |para | com /.test(s);
  if (isPtLike) return { translated: text, provider: 'mymemory' };
  try {
    const qs = `q=${encodeURIComponent(text)}&langpair=en|pt`;
    const res = await fetch(`https://api.mymemory.translated.net/get?${qs}`, {
      headers: { 'User-Agent': 'ReconNews-Bot/1.0' },
      signal: AbortSignal.timeout(12000)
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.responseStatus !== 200) return null;
    const translated = data?.responseData?.translatedText || '';
    if (isInvalidTranslation(translated)) return null;
    return translated ? { translated, provider: 'mymemory' } : null;
  } catch {
    return null;
  }
}

async function translateViaFreeAPI(text: string): Promise<{ translated: string; provider: string } | null> {
  let url = Deno.env.get('RECON_FREE_API_URL') || '';
  const key = Deno.env.get('RECON_FREE_API_KEY') || '';
  let providerType = (Deno.env.get('RECON_FREE_API_PROVIDER') || '').toLowerCase();
  if (!url) {
    url = 'https://libretranslate.com/translate';
    providerType = 'libretranslate';
  }
  const s = (text || '').toLowerCase();
  const isPtLike = /[áéíóúâêîôûãõç]/.test(s) || /ção| que | de | para | com /.test(s);
  const src = isPtLike ? 'pt' : 'en';
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'ReconNews-Bot/1.0'
    };
    if (key && providerType !== 'libretranslate') headers['Authorization'] = `Bearer ${key}`;
    const body = providerType === 'libretranslate'
      ? JSON.stringify({ q: text, source: src, target: 'pt', format: 'text', api_key: key || undefined })
      : JSON.stringify({ text, source_language: src, target_language: 'pt-BR' });

    const res = await fetch(url, { method: 'POST', headers, body, signal: AbortSignal.timeout(12000) });
    if (!res.ok) return null;
    const data = await res.json();
    const translated = data?.translated_text || data?.translation || data?.translatedText || '';
    if (isInvalidTranslation(translated)) return null;
    return translated ? { translated, provider: 'freeapi' } : null;
  } catch {
    return null;
  }
}

async function translateTextToPtWithFallback(text: string): Promise<{ translated: string; provider: string } | null> {
  const primary = await translateTextToPt(text);
  if (primary) return primary;
  const freeApi = await translateViaFreeAPI(text);
  if (freeApi) return freeApi;
  if ((text || '').length <= 400) return await translateViaMyMemory(text);
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += 380) {
    chunks.push(text.slice(i, i + 380));
  }
  const parts: string[] = [];
  for (const c of chunks) {
    const t = await translateViaMyMemory(c);
    parts.push(isInvalidTranslation(t?.translated) ? c : (t?.translated || c));
    await new Promise(r => setTimeout(r, 300));
  }
  const joined = parts.join(' ');
  return { translated: joined, provider: 'mymemory' };
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
  // Tenta pegar <article>, depois <main>, senão junta <p> e fallback body
  const articleMatch = html.match(/<article[\s\S]*?<\/article>/i);
  if (articleMatch) return stripTags(articleMatch[0]);
  const mainMatch = html.match(/<main[\s\S]*?<\/main>/i);
  if (mainMatch) return stripTags(mainMatch[0]);
  const ps = html.match(/<p[\s\S]*?<\/p>/gi);
  if (ps && ps.length > 3) return stripTags(ps.join(' '));
  return stripTags(html);
}

// ===== Classificação de facetas acadêmicas =====
function normalizeForMatch(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const KEYWORDS = {
  regions: {
    'Israel': ['israel', 'jerusalem', 'jerusalém', 'galileia', 'judah', 'judá', 'samaria', 'samaria'],
    'Terra Santa': ['terra santa', 'holy land'],
    'Egito': ['egito', 'egypt', 'egipcio', 'egípcio', 'farao', 'faraó'],
    'Grécia': ['grecia', 'grécia', 'greece', 'helenistico', 'helenístico'],
    'Roma': ['roma', 'rome', 'romano', 'imperio romano', 'império romano'],
    'Pérsia': ['persia', 'pérsia', 'aquemenida', 'aquemênida'],
    'Babilônia': ['babilonia', 'babilônia', 'babylon', 'mesopotamia', 'mesopotâmia'],
    'Assíria': ['assiria', 'assíria', 'assyrian', 'ninive', 'nínive', 'nineveh'],
    'Síria': ['siria', 'síria', 'syria'],
    'Crescente Fértil': ['crescente fertil', 'fertile crescent'],
  },
  evidence: {
    'Sítio': ['sitio', 'sítio', 'escavacao', 'escavação', 'estratigrafia', 'camadas', 'tell', 'tel', 'qumran', 'jerico', 'jericó'],
    'Museu': ['museu', 'exposicao', 'exposição', 'acervo', 'curadoria'],
    'Achados': ['achado', 'achados', 'descoberta', 'descobertas', 'artefato', 'artefatos', 'inscricao', 'inscrição', 'inscricoes', 'inscrições', 'ossario', 'ossário', 'ossos', 'estela', 'bulla', 'selo'],
    'Cópias': ['copia', 'cópia', 'copias', 'cópias', 'manuscrito', 'manuscritos', 'papiro', 'papiros', 'pergaminho', 'pergaminhos', 'codex', 'códice', 'codice', 'rolos do mar morto', 'dead sea scrolls', 'qumran']
  },
  themes: {
    'Perspectiva Cristã': ['criacionismo', 'criacionista', 'criacao', 'criação', 'design inteligente', 'intelligent design']
  }
};

function classifyArticle(title?: string, description?: string) {
  const text = normalizeForMatch(`${title || ''} ${description || ''}`);
  const pickMatch = (group: Record<string, string[]>) => {
    for (const key of Object.keys(group)) {
      const kws = group[key];
      if (kws.some(k => text.includes(k))) return key;
    }
    return null;
  };

  return {
    region: pickMatch(KEYWORDS.regions),
    evidenceType: pickMatch(KEYWORDS.evidence),
    theme: pickMatch(KEYWORDS.themes),
  } as { region: string | null; evidenceType: string | null; theme: string | null };
}

// Função auxiliar para extrair texto entre tags XML
function extractXMLTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

// Função auxiliar para limpar texto de RSS
function cleanCDATA(text: string): string {
  return text
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/\]\]>/g, '')
    // Remove tags HTML comuns e entidades restantes
    .replace(/<[^>]*>/g, ' ')
    // Decodifica entidades HTML como &#8230; e &amp;
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&(quot|amp|apos|lt|gt);/g, (m) => ({
      '&quot;': '"',
      '&amp;': '&',
      '&apos;': "'",
      '&lt;': '<',
      '&gt;': '>'
    }[m] || ' '))
    .replace(/\[&[^\]]*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Parser RSS genérico
async function parseRSSFeed(url: string, source: string, category: string): Promise<Article[]> {
  try {
    console.log(`  📡 Verificando robots.txt para: ${source}`);

    // Verificar robots.txt antes de fazer scraping
    const robotsAllowed = await checkRobotsTxt(url);
    if (!robotsAllowed) {
      console.log(`  🚫 Scraping não permitido pelo robots.txt: ${source}`);
      return [];
    }

    console.log(`  📡 Buscando RSS: ${source}`);
    const response = await fetchWithRetry(url, {
      headers: {
        'User-Agent': 'ReconNews-Bot/1.0 (Christian News Aggregator)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
    }, 3, 10000, 2000);

    if (!response.ok) {
      console.log(`  ✗ ${source}: Erro HTTP ${response.status}`);
      return [];
    }

    const xml = await response.text();
    const articles: Article[] = [];

    // Extrair todos os items do RSS
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    const items = xml.match(itemRegex) || [];

    const maxItems = 40;
    for (const itemXml of items.slice(0, maxItems)) {
      const title = extractXMLTag(itemXml, 'title');
      let link = extractXMLTag(itemXml, 'link');

      if (!title || !link || title.length < 10) continue;

      // Google News costuma usar redirecionador; extrair link final quando houver parâmetro url=
      try {
        const u = new URL(cleanCDATA(link));
        const real = u.searchParams.get('url');
        if (real) link = real;
      } catch { void 0; }

      const description = extractXMLTag(itemXml, 'description');
      const contentEncoded = extractXMLTag(itemXml, 'content:encoded');
      const pubDate = extractXMLTag(itemXml, 'pubDate');

      // Tentar extrair imagem de múltiplos campos (description, enclosure, media:content, media:thumbnail)
      let imageUrl: string | undefined;
      if (description) {
        const imgMatch = description.match(/<img[^>]+src=["']([^"']+)["']/i);
        if (imgMatch) {
          imageUrl = imgMatch[1];
        }
      }
      if (!imageUrl) {
        const enclosureMatch = itemXml.match(/<enclosure[^>]*url=["']([^"']+)["'][^>]*>/i);
        if (enclosureMatch) {
          imageUrl = enclosureMatch[1];
        }
      }
      if (!imageUrl) {
        const mediaContentMatch = itemXml.match(/<media:content[^>]*url=["']([^"']+)["'][^>]*>/i);
        if (mediaContentMatch) {
          imageUrl = mediaContentMatch[1];
        }
      }
      if (!imageUrl) {
        const mediaThumbMatch = itemXml.match(/<media:thumbnail[^>]*url=["']([^"']+)["'][^>]*>/i);
        if (mediaThumbMatch) {
          imageUrl = mediaThumbMatch[1];
        }
      }
      // Fallback: buscar a página e extrair og:image ou twitter:image
      if (!imageUrl && link) {
        try {
          const pageRes = await fetchWithRetry(cleanCDATA(link), { headers: { 'User-Agent': 'ReconNews-Bot/1.0' } }, 2, 7000, 1500);
          if (pageRes.ok) {
            const html = await pageRes.text();
            const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
            const twMatch = html.match(/<meta[^>]+name=["']twitter:image[^"']*["'][^>]+content=["']([^"']+)["']/i);
            const inlineImgMatch = html.match(/<img[^>]+src=["']([^"']+\.(?:jpg|jpeg|png|webp))["'][^>]*>/i);
            imageUrl = (ogMatch?.[1] || twMatch?.[1] || inlineImgMatch?.[1]);
            if (imageUrl && imageUrl.startsWith('/')) {
              const base = new URL(cleanCDATA(link));
              imageUrl = `${base.protocol}//${base.host}${imageUrl}`;
            }
          }
        } catch (err) {
          console.log(`  ⚠️ Falha ao buscar imagem de ${source}:`, err?.message || err);
        }
      }

      let cleanDesc = description ? cleanCDATA(description) : undefined;
      const cleanEncoded = contentEncoded ? cleanCDATA(contentEncoded) : undefined;
      // Remover trailing artefatos como "The post ... appeared first on ..." e reticências
      if (cleanDesc) {
        cleanDesc = cleanDesc
          .replace(/The post[\s\S]*$/i, '')
          .replace(/•?\s*Leia mais.*$/i, '')
          .replace(/…$/g, '')
          .trim()
          .substring(0, 3000);
      }
      // Preferir content:encoded quando fornecer um corpo mais rico que a description
      if (cleanEncoded) {
        const richer = cleanEncoded
          .replace(/The post[\s\S]*$/i, '')
          .replace(/•?\s*Leia mais.*$/i, '')
          .replace(/…$/g, '')
          .trim()
          .substring(0, 3000);
        if (!cleanDesc || richer.length > (cleanDesc?.length || 0)) {
          cleanDesc = richer;
        }
      }

      articles.push({
        title: cleanCDATA(title),
        description: cleanDesc,
        url: cleanCDATA(link),
        source,
        published_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        image_url: imageUrl,
        category,
      });
    }

    console.log(`  ✓ ${source}: ${articles.length} artigos encontrados`);
    return articles;
  } catch (error) {
    console.error(`  ✗ Erro ao buscar ${source}:`, error);
    return [];
  }
}

type GoogleNewsLocaleKey = 'BR' | 'US' | 'GB';

const GOOGLE_NEWS_LOCALES: Record<GoogleNewsLocaleKey, { hl: string; gl: string; ceid: string }> = {
  BR: { hl: 'pt-BR', gl: 'BR', ceid: 'BR:pt-419' },
  US: { hl: 'en-US', gl: 'US', ceid: 'US:en' },
  GB: { hl: 'en-GB', gl: 'GB', ceid: 'GB:en' },
};

// Scraper para Google News via RSS
async function scrapeGoogleNews(query: string, category: string, locale: GoogleNewsLocaleKey): Promise<Article[]> {
  const encodedQuery = encodeURIComponent(query);
  const loc = GOOGLE_NEWS_LOCALES[locale] ?? GOOGLE_NEWS_LOCALES.BR;
  const url = `https://news.google.com/rss/search?q=${encodedQuery}&hl=${loc.hl}&gl=${loc.gl}&ceid=${loc.ceid}`;
  return parseRSSFeed(url, 'Google News', category);
}

// ─── Fontes RSS brasileiras e portuguesas por categoria ───
const RSS_FEEDS = [
  // ✝️ Fé e Vida Cristã
  { url: 'https://www.gospelprime.com.br/feed/', source: 'Gospel Prime', category: 'Fé e Vida Cristã' },
  { url: 'https://www.gospelmais.com.br/feed/', source: 'Gospel Mais', category: 'Fé e Vida Cristã' },
  { url: 'https://guiame.com.br/feed/', source: 'Guiame', category: 'Fé e Vida Cristã' },
  { url: 'https://nfrfrases.com.br/feed/', source: 'NFR Frases', category: 'Fé e Vida Cristã' },
  { url: 'https://www.cpadnews.com.br/feed/', source: 'CPAD News', category: 'Fé e Vida Cristã' },

  // 🕊️ Liberdade e Perseguição Religiosa
  { url: 'https://www.portasabertas.org.br/feed/', source: 'Portas Abertas', category: 'Perseguição Religiosa' },
  { url: 'https://www.acidigital.com/rss/noticias.xml', source: 'ACI Digital', category: 'Liberdade Religiosa' },
  { url: 'https://nfrfrases.com.br/feed/', source: 'NFR – Perseguição', category: 'Perseguição Religiosa' },

  // 🍎 Saúde, Bem-Estar e Alimentos
  { url: 'https://www.minhavida.com.br/feed', source: 'Minha Vida', category: 'Saúde e Bem-Estar' },
  { url: 'https://www.tuasaude.com/feed/', source: 'Tua Saúde', category: 'Saúde e Bem-Estar' },
  { url: 'https://saude.abril.com.br/feed/', source: 'Veja Saúde', category: 'Saúde e Bem-Estar' },
  { url: 'https://vidasaudavel.einstein.br/feed/', source: 'Einstein Vida Saudável', category: 'Saúde e Bem-Estar' },
  { url: 'https://g1.globo.com/rss/g1/ciencia-e-saude/', source: 'G1 Saúde', category: 'Saúde e Bem-Estar' },

  // 🌿 Natureza e Plantas Medicinais
  { url: 'https://www.ecycle.com.br/feed/', source: 'eCycle', category: 'Natureza e Meio Ambiente' },
  { url: 'https://ciclovivo.com.br/feed/', source: 'CicloVivo', category: 'Natureza e Meio Ambiente' },
  { url: 'https://www.greenme.com.br/feed/', source: 'GreenMe', category: 'Plantas Medicinais' },
  { url: 'https://www.tuasaude.com/categorias/plantas-medicinais/feed/', source: 'Tua Saúde – Plantas', category: 'Plantas Medicinais' },

  // 🥗 Dieta Proteica e Saladas
  { url: 'https://www.mundoboaforma.com.br/feed/', source: 'Mundo Boa Forma', category: 'Dieta Proteica' },
  { url: 'https://www.ativo.com/feed/', source: 'Ativo', category: 'Dieta e Exercícios' },
  { url: 'https://receitasninja.com/feed/', source: 'Receitas Ninja', category: 'Saladas e Receitas' },
];

// Política editorial: fontes brasileiras e portuguesas
const FEEDS_ALLOWLIST = new Set(
  (Deno.env.get('RECON_ALLOWED_SOURCES')?.split(',').map(s => s.trim()).filter(Boolean)) ?? [
    'Gospel Prime', 'Gospel Mais', 'Guiame', 'NFR Frases', 'CPAD News',
    'Portas Abertas', 'ACI Digital', 'NFR – Perseguição',
    'Minha Vida', 'Tua Saúde', 'Veja Saúde', 'Einstein Vida Saudável', 'G1 Saúde',
    'eCycle', 'CicloVivo', 'GreenMe', 'Tua Saúde – Plantas',
    'Mundo Boa Forma', 'Ativo', 'Receitas Ninja',
  ]
);

const BLOCKED_HOSTS = new Set(
  (Deno.env.get('RECON_BLOCKED_HOSTS')?.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)) ?? []
);

// Domínios BR/PT permitidos por padrão
const DEFAULT_ALLOWED_HOSTS = [
  // Fé e Vida Cristã
  'gospelprime.com.br', 'gospelmais.com.br', 'guiame.com.br',
  'nfrfrases.com.br', 'cpadnews.com.br',
  // Liberdade Religiosa
  'portasabertas.org.br', 'acidigital.com',
  // Saúde / Bem-Estar
  'minhavida.com.br', 'tuasaude.com', 'abril.com.br', 'uol.com.br',
  'einstein.br', 'globo.com', 'g1.globo.com',
  // Natureza / Plantas
  'ecycle.com.br', 'ciclovivo.com.br', 'greenme.com.br',
  // Dieta / Receitas
  'mundoboaforma.com.br', 'ativo.com', 'receitasninja.com',
  // Portais genéricos BR confiáveis
  'folha.uol.com.br', 'estadao.com.br', 'terra.com.br',
  'r7.com', 'correiobraziliense.com.br', 'gazetadopovo.com.br',
  'bbc.com',
];

function normalizeHostList(hosts: string[]): string[] {
  return hosts
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean)
    .map((h) => (h.startsWith('.') ? h.slice(1) : h));
}

function isHostAllowed(host: string, allowed: string[]): boolean {
  const h = host.trim().toLowerCase();
  return allowed.some((a) => h === a || h.endsWith(`.${a}`));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('PROJECT_URL') ?? Deno.env.get('RECON_SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('RECON_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    let batch: string | null = null;
    try {
      const body = await req.json();
      batch = (body?.batch ?? null);
    } catch { void 0; }
    if (!batch) {
      const u = new URL(req.url);
      batch = u.searchParams.get('batch');
    }
    const startedAt = Date.now();

    // Limpar notícias antigas antes de coletar novas
    console.log('🧹 Limpando notícias antigas...');
    const { error: cleanupError } = await supabase.rpc('cleanup_old_articles');
    if (cleanupError) {
      console.error('⚠️ Erro ao limpar artigos antigos:', cleanupError);
    } else {
      console.log('✓ Limpeza concluída\n');
    }

    console.log('🚀 Iniciando coleta de notícias — Fé, Saúde, Natureza, Dieta e Liberdade Religiosa...\n');

    let totalArticles = 0;
    let newArticles = 0;
    const allArticles: Article[] = [];

    // Buscar Google News para termos específicos
    console.log('🔍 Buscando no Google News...');

    const queries: Array<{ term: string; category: string; locale?: GoogleNewsLocaleKey }> = [
      // ✝️ Fé e Vida Cristã (8 queries)
      { term: 'notícias evangélicas Brasil', category: 'Fé e Vida Cristã' },
      { term: 'mundo cristão notícias igreja', category: 'Fé e Vida Cristã' },
      { term: 'igreja evangélica Brasil notícias', category: 'Fé e Vida Cristã' },
      { term: 'pastor pregação testemunho cristão', category: 'Fé e Vida Cristã' },
      { term: 'devocional cristão estudo bíblico', category: 'Fé e Vida Cristã' },
      { term: 'louvor gospel novidades música', category: 'Fé e Vida Cristã' },
      { term: 'missões cristãs evangelismo', category: 'Fé e Vida Cristã' },
      { term: 'fé cristã reflexão diária', category: 'Fé e Vida Cristã' },

      // 🕊️ Liberdade e Perseguição Religiosa (8 queries)
      { term: 'perseguição religiosa cristãos Brasil', category: 'Perseguição Religiosa' },
      { term: 'liberdade religiosa leis cristãos Brasil', category: 'Liberdade Religiosa' },
      { term: 'leis que afetam doutrina evangélica Brasil', category: 'Liberdade Religiosa' },
      { term: 'liberdade religiosa cristãos tribunal', category: 'Liberdade Religiosa' },
      { term: 'perseguição cristãos relatório mundial', category: 'Perseguição Religiosa' },
      { term: 'ataque igreja cristã perseguição', category: 'Perseguição Religiosa' },
      { term: 'cristãos perseguidos mundo árabe', category: 'Perseguição Religiosa' },
      { term: 'política religiosa liberdade de culto Brasil', category: 'Liberdade Religiosa' },
      { term: 'intolerância religiosa contra evangélicos', category: 'Perseguição Religiosa' },
      { term: 'direitos religiosos constituição brasileira', category: 'Liberdade Religiosa' },

      // 🍎 Saúde, Bem-Estar e Alimentos (10 queries)
      { term: 'saúde bem estar estudos alimentação saudável', category: 'Saúde e Bem-Estar' },
      { term: 'alimentos saudáveis comprovados estudo', category: 'Alimentos Saudáveis' },
      { term: 'saúde estudos clínicos alimentação', category: 'Saúde e Bem-Estar' },
      { term: 'dicas de saúde para maiores de 40', category: 'Saúde e Bem-Estar' },
      { term: 'benefícios chá natural saúde', category: 'Saúde e Bem-Estar' },
      { term: 'prevenção doenças alimentação natural', category: 'Saúde e Bem-Estar' },
      { term: 'imunidade alimentos vitaminas minerais', category: 'Saúde e Bem-Estar' },
      { term: 'colesterol diabetes hipertensão alimentação', category: 'Saúde e Bem-Estar' },
      { term: 'sono qualidade saúde mental bem estar', category: 'Saúde e Bem-Estar' },
      { term: 'envelhecimento saudável longevidade estudo', category: 'Saúde e Bem-Estar' },

      // 🌿 Natureza e Plantas Medicinais (10 queries)
      { term: 'plantas medicinais estudos Brasil', category: 'Plantas Medicinais' },
      { term: 'plantas medicinais evidência científica', category: 'Plantas Medicinais' },
      { term: 'natureza conservação Brasil descobertas', category: 'Natureza e Meio Ambiente' },
      { term: 'conservação ambiental descoberta científica', category: 'Natureza e Meio Ambiente' },
      { term: 'ervas medicinais benefícios comprovados', category: 'Plantas Medicinais' },
      { term: 'chá camomila hortelã gengibre benefícios', category: 'Plantas Medicinais' },
      { term: 'fitoterapia remédio natural planta', category: 'Plantas Medicinais' },
      { term: 'biodiversidade brasileira flora fauna', category: 'Natureza e Meio Ambiente' },
      { term: 'horta orgânica cultivo caseiro', category: 'Natureza e Meio Ambiente' },
      { term: 'sustentabilidade meio ambiente ecologia Brasil', category: 'Natureza e Meio Ambiente' },

      // 🥗 Dieta Proteica e Saladas (10 queries)
      { term: 'dieta proteica ovos frango peixe benefícios', category: 'Dieta Proteica' },
      { term: 'benefícios peixe frango alimentação saudável estudo', category: 'Dieta Proteica' },
      { term: 'receita saudável frango peixe ovos nutrição', category: 'Dieta Proteica' },
      { term: 'dieta carne vermelha saúde estudos', category: 'Dieta de Carnes Vermelhas' },
      { term: 'benefícios riscos carne vermelha nutrição', category: 'Dieta de Carnes Vermelhas' },
      { term: 'carne vermelha alimentação saúde estudo clínico', category: 'Dieta de Carnes Vermelhas' },
      { term: 'saladas saudáveis corpo mente benefícios', category: 'Saladas para Corpo e Mente' },
      { term: 'receita salada nutritiva saúde mental estudo', category: 'Saladas para Corpo e Mente' },
      { term: 'receita low carb proteína prato saudável', category: 'Dieta Proteica' },
      { term: 'suplemento proteína whey treino alimentação', category: 'Dieta Proteica' },
    ];

    let selectedQueries = queries;
    const totalQ = queries.length;
    const sliceSize = 10;
    const m = (batch || '').match(/^q(\d+)$/i);
    if (m) {
      const idx = Math.max(0, parseInt(m[1], 10) - 1);
      const start = idx * sliceSize;
      const end = Math.min(start + sliceSize, totalQ);
      selectedQueries = queries.slice(start, end);
    }
    for (const { term, category, locale } of selectedQueries) {
      const articles = await scrapeGoogleNews(term, category, locale ?? 'BR');
      allArticles.push(...articles);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
    }

    // Buscar RSS feeds especializados (filtrados pela política editorial)
    console.log('\n📚 Buscando feeds RSS especializados (política editorial ativa)...');
    const selectedFeeds = batch === 'rss' ? RSS_FEEDS : [];
    for (const feed of selectedFeeds) {
      if (!FEEDS_ALLOWLIST.has(feed.source)) {
        console.log(`  ⏭️ Ignorando feed não permitido pela política: ${feed.source}`);
        continue;
      }
      const articles = await parseRSSFeed(feed.url, feed.source, feed.category);
      allArticles.push(...articles);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    totalArticles = allArticles.length;
    console.log(`\n📊 Total de artigos encontrados: ${totalArticles}`);

    // Remover duplicatas baseado na URL
    const normalizedBlockedHosts = normalizeHostList([...BLOCKED_HOSTS]);
    const uniqueArticles = allArticles.reduce((acc, article) => {
      if (!acc.find(a => a.url === article.url)) {
        acc.push(article);
      }
      return acc;
    }, [] as Article[])
      // Aplicar bloqueio por domínio (host) adicional
      .filter(a => {
        try {
          const host = new URL(a.url).hostname.toLowerCase();
          if (isHostAllowed(host, normalizedBlockedHosts)) {
            console.log(`  🚫 Bloqueado por domínio: ${host}`);
            return false;
          }
          const countryOnly = (Deno.env.get('RECON_COUNTRY_ONLY') || '').toUpperCase();
          const tldWhitelist = (Deno.env.get('RECON_TLD_WHITELIST') || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
          let allowedHosts = (Deno.env.get('RECON_ALLOWED_HOSTS') || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
          if (allowedHosts.length === 0) allowedHosts = DEFAULT_ALLOWED_HOSTS;
          const normalizedAllowedHosts = normalizeHostList(allowedHosts);
          if (countryOnly === 'BR') {
            if (!(host.endsWith('.br') || isHostAllowed(host, normalizedAllowedHosts))) {
              return false;
            }
          } else if (tldWhitelist.length > 0) {
            if (!(tldWhitelist.some(suf => host.endsWith(suf)) || isHostAllowed(host, normalizedAllowedHosts))) {
              return false;
            }
          }
          return true;
        } catch {
          return true;
        }
      });

    console.log(`📊 Artigos únicos após deduplicação: ${uniqueArticles.length}`);

    // Inserir artigos no banco de dados (com tradução e resumo estendido quando possível)
    console.log('\n💾 Salvando artigos no banco de dados...');
    for (const article of uniqueArticles) {
      const c = classifyArticle(article.title, article.description);
      let title_pt: string | undefined;
      let description_pt: string | undefined;
      let translation_provider: string | undefined;
      let extended_summary_pt: string | undefined;

      const maybeEnglish = isLikelyEnglish(`${article.title} ${article.description || ''}`);
      // Traduzir sempre título e descrição quando há provedor configurado (sem depender da heurística)
      {
        const tTitle = await translateTextToPtWithFallback(article.title);
        if (tTitle) {
          title_pt = tTitle.translated;
          translation_provider = tTitle.provider;
        }
        if (article.description) {
          const tDesc = await translateTextToPtWithFallback(article.description);
          if (tDesc && !isInvalidTranslation(tDesc.translated)) {
            description_pt = tDesc.translated;
            translation_provider = tDesc.provider;
          }
        }
      }

      // Resumo estendido: só tenta quando o resumo é curto ou é inglês
      try {
        const needsExtended = maybeEnglish || !article.description || (article.description?.length || 0) < 280;
        if (needsExtended && await checkRobotsTxt(article.url)) {
          const pageRes = await fetchWithRetry(article.url, { headers: { 'User-Agent': 'ReconNews-Bot/1.0' } }, 2, 12000, 2000);
          if (pageRes.ok) {
            const html = await pageRes.text();
            const content = extractMainContent(html).substring(0, 8000);
            if (content) {
              const tFull = await translateTextToPtWithFallback(content);
              if (tFull && !isInvalidTranslation(tFull.translated)) {
                extended_summary_pt = refinePtSummary(tFull.translated).substring(0, 2500);
                translation_provider = tFull.provider;
              }
            }
          }
        }
      } catch (err) {
        console.log('⚠️ Falha ao obter resumo estendido:', err?.message || err);
      }

      const { error } = await supabase
        .from('articles')
        .upsert(
          {
            title: article.title,
            description: article.description,
            title_pt,
            description_pt,
            translation_provider,
            extended_summary_pt,
            url: article.url,
            source: article.source,
            published_at: article.published_at,
            image_url: article.image_url,
            category: article.category,
            region: c.region,
            evidence_type: c.evidenceType,
            theme: c.theme,
            scraped_at: new Date().toISOString(),
          },
          // Removido ignoreDuplicates para permitir atualização de registros existentes
          { onConflict: 'url' }
        );

      if (!error) {
        newArticles++;
      } else if (error.code !== '23505') {
        console.error(`✗ Erro ao inserir artigo:`, error.message);
      }
    }

    console.log(`\n✅ Coleta concluída!`);
    console.log(`   Total processado: ${totalArticles} artigos`);
    console.log(`   Artigos únicos: ${uniqueArticles.length}`);
    console.log(`   Novos artigos inseridos: ${newArticles}`);

    return new Response(
      JSON.stringify({
        success: true,
        totalArticles,
        uniqueArticles: uniqueArticles.length,
        newArticles,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
        batch: batch || 'all'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Erro na coleta:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Falha ao coletar notícias. Tente novamente mais tarde.',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
function isInvalidTranslation(text: string | null | undefined): boolean {
  const s = (text || '').toLowerCase();
  return (
    s.includes("invalid source language") ||
    s.includes("example: langpair=") ||
    s.includes("max allowed query") ||
    s.includes("500 chars") ||
    s.includes("some may have no content")
  );
}

function refinePtSummary(text: string): string {
  let t = (text || '').replace(/<[^>]*>/g, ' ');
  const noise = [
    'doar', 'renovar', 'inscrever-se', 'revista', 'biblioteca', 'viagens/estudos', 'loja', 'sobre', 'contato',
    'facebook', 'twitter', 'rss', 'tags:', 'related posts', 'by:', 'newsletter', 'subscreva hoje', 'torne-se um membro',
    'all-access', 'saiba mais', 'free ebook', 'free e-book', 'registe-se', 'o seu endereço de e-mail não será publicado',
    'campos obrigatórios', 'comente', 'comentários'
  ];
  const pattern = new RegExp(noise.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gi');
  t = t.replace(pattern, ' ');
  t = t.replace(/\s+\d+\s+\d+\s+\d+(\s+\d+)?(\s+\d+)?/g, ' ');
  t = t.replace(/The post[\s\S]*$/i, ' ').replace(/Leia mais[\s\S]*$/i, ' ');
  t = t.replace(/\s+/g, ' ').trim();
  const sentences = t.split(/(?<=[.!?])\s+/).filter(s => s.length > 40 && s.length < 400);
  const filtered = sentences.filter(s => !pattern.test(s));
  const selected = (filtered.length > 0 ? filtered : sentences).slice(0, 12);
  return selected.join(' ');
}
