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
  let lastError: any = null;
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(baseTimeoutMs),
        headers: {
          'User-Agent': 'ReconNews-Bot/1.0 (Christian News Aggregator)',
          ...(init.headers || {} as Record<string,string>)
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
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`, 'i');
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

  for (const itemXml of items.slice(0, 20)) {
      const title = extractXMLTag(itemXml, 'title');
      const link = extractXMLTag(itemXml, 'link');
      
      if (!title || !link || title.length < 10) continue;

      const description = extractXMLTag(itemXml, 'description');
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
      // Remover trailing artefatos como "The post ... appeared first on ..." e reticências
      if (cleanDesc) {
        cleanDesc = cleanDesc
          .replace(/The post[\s\S]*$/i, '')
          .replace(/•?\s*Leia mais.*$/i, '')
          .replace(/…$/g, '')
          .trim()
          // Aumenta o tamanho do resumo para oferecer mais contexto no popup
          // Mantém limite razoável para não estourar layout; o Dialog terá scroll
          .substring(0, 1500);
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

// Scraper para Google News via RSS
async function scrapeGoogleNews(query: string, category: string): Promise<Article[]> {
  const encodedQuery = encodeURIComponent(query);
  const url = `https://news.google.com/rss/search?q=${encodedQuery}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
  return parseRSSFeed(url, 'Google News', category);
}

// Fontes RSS focadas em Arqueologia, Manuscritos e História Bíblica
const RSS_FEEDS = [
  // Arqueologia Bíblica e Manuscritos
  {
    url: 'https://www.biblicalarchaeology.org/feed',
    source: 'Biblical Archaeology Society',
    category: 'Arqueologia Bíblica',
  },
  {
    url: 'https://asorblog.org/feed/',
    source: 'ASOR Blog',
    category: 'Arqueologia do Oriente Próximo',
  },
  // Portais amplos de arqueologia
  {
    url: 'https://www.heritagedaily.com/feed',
    source: 'HeritageDaily',
    category: 'Descobertas Arqueológicas',
  },
  {
    url: 'https://arkeonews.net/feed/',
    source: 'ArkeoNews',
    category: 'Descobertas Arqueológicas',
  },
  {
    url: 'https://popular-archaeology.com/feed/',
    source: 'Popular Archaeology',
    category: 'Descobertas Arqueológicas',
  },
  {
    url: 'https://www.ancient-origins.net/rss.xml',
    source: 'Ancient Origins',
    category: 'História Antiga',
  },
  // Agregadores de ciência com seção de arqueologia
  {
    url: 'https://www.sciencedaily.com/rss/archaeology.xml',
    source: 'ScienceDaily – Archaeology',
    category: 'Achados Científicos',
  },
  {
    url: 'https://www.sciencedaily.com/rss/fossils_ruins.xml',
    source: 'ScienceDaily – Fossils & Ruins',
    category: 'Achados Científicos',
  },
  {
    url: 'https://phys.org/rss-feed/archaeology-fossils/',
    source: 'Phys.org – Archaeology & Fossils',
    category: 'Achados Científicos',
  },
  // Mídia internacional com seção dedicada
  {
    url: 'https://www.theguardian.com/science/archaeology/rss',
    source: 'The Guardian – Archaeology',
    category: 'Arqueologia',
  },
];

// Política editorial: permitir apenas fontes focadas em arqueologia, manuscritos e história bíblica
// Você pode personalizar via variáveis de ambiente RECON_ALLOWED_SOURCES (nomes) e RECON_BLOCKED_HOSTS (domínios)
const FEEDS_ALLOWLIST = new Set(
  (Deno.env.get('RECON_ALLOWED_SOURCES')?.split(',').map(s => s.trim()).filter(Boolean)) ?? [
    'Biblical Archaeology Society',
    'ASOR Blog',
    'HeritageDaily',
    'ArkeoNews',
    'Popular Archaeology',
    'Ancient Origins',
    'ScienceDaily – Archaeology',
    'ScienceDaily – Fossils & Ruins',
    'Phys.org – Archaeology & Fossils',
    'The Guardian – Archaeology',
  ]
);

const BLOCKED_HOSTS = new Set(
  (Deno.env.get('RECON_BLOCKED_HOSTS')?.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)) ?? []
);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('PROJECT_URL') ?? Deno.env.get('RECON_SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('RECON_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Limpar notícias antigas antes de coletar novas
    console.log('🧹 Limpando notícias antigas...');
    const { error: cleanupError } = await supabase.rpc('cleanup_old_articles');
    if (cleanupError) {
      console.error('⚠️ Erro ao limpar artigos antigos:', cleanupError);
    } else {
      console.log('✓ Limpeza concluída\n');
    }

    console.log('🚀 Iniciando coleta de notícias sobre Fé Cristã e Arqueologia Bíblica...\n');

    let totalArticles = 0;
    let newArticles = 0;
    const allArticles: Article[] = [];

    // Buscar Google News para termos específicos
    console.log('🔍 Buscando no Google News...');
    
    const queries = [
      // Núcleo do tema
      { term: 'arqueologia bíblica', category: 'Arqueologia Bíblica' },
      { term: 'descoberta arqueológica Israel', category: 'Descobertas Arqueológicas' },
      { term: 'manuscritos antigos bíblia', category: 'Manuscritos e Documentos' },
      { term: 'Mar Morto manuscritos descoberta', category: 'Manuscritos e Documentos' },
      // Cidades e sítios arqueológicos relevantes
      { term: 'escavações Jerusalém Cidade de David', category: 'Arqueologia de Jerusalém' },
      { term: 'Tel Hazor escavações', category: 'Cidades e Personagens Bíblicos' },
      { term: 'Tel Lachish escavações', category: 'Cidades e Personagens Bíblicos' },
      { term: 'Tel Dan estela descoberta', category: 'Cidades e Personagens Bíblicos' },
      { term: 'Masada descoberta arqueológica', category: 'Cidades e Personagens Bíblicos' },
      // Inscrições e documentos
      { term: 'inscrições hebraico aramaico bíblia achado', category: 'Manuscritos e Documentos' },
      { term: 'papiros bíblicos pergaminhos descoberta', category: 'Manuscritos e Documentos' },
      // Pesquisadores e estudos
      { term: 'Israel Finkelstein arqueologia bíblica', category: 'Pesquisadores Renomados' },
      { term: 'William Dever arqueologia bíblica', category: 'Pesquisadores Renomados' },
      { term: 'Yigael Yadin descoberta arqueológica', category: 'Pesquisadores Renomados' },
    ];

    for (const { term, category } of queries) {
      const articles = await scrapeGoogleNews(term, category);
      allArticles.push(...articles);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
    }

    // Buscar RSS feeds especializados (filtrados pela política editorial)
    console.log('\n📚 Buscando feeds RSS especializados (política editorial ativa)...');
    for (const feed of RSS_FEEDS) {
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
        if (BLOCKED_HOSTS.has(host)) {
          console.log(`  🚫 Bloqueado por domínio: ${host}`);
          return false;
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
        const tTitle = await translateTextToPt(article.title);
        if (tTitle) {
          title_pt = tTitle.translated;
          translation_provider = tTitle.provider;
        }
        if (article.description) {
          const tDesc = await translateTextToPt(article.description);
          if (tDesc) {
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
            let content = extractMainContent(html).substring(0, 6000);
            if (content && maybeEnglish) {
              const tFull = await translateTextToPt(content);
              if (tFull) {
                extended_summary_pt = tFull.translated;
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
