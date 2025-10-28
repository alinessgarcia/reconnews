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

// Fontes RSS de portais evangélicos, cristãos, arqueologia e história
const RSS_FEEDS = [
  // Portais Evangélicos e Cristãos
  {
    url: 'https://noticias.gospelmais.com.br/feed',
    source: 'Gospel+',
    category: 'Notícias Gospel',
  },
  {
    url: 'https://voltemosaoevangelho.com/blog/feed/',
    source: 'Voltemos ao Evangelho',
    category: 'Teologia Reformada',
  },
  {
    url: 'https://pleno.news/feed',
    source: 'Pleno News',
    category: 'Notícias Evangélicas',
  },
  {
    url: 'https://comunhao.com.br/feed',
    source: 'Comunhão',
    category: 'Portal Evangélico',
  },
  
  // Arqueologia e História
  {
    url: 'http://www.bbc.co.uk/portuguese/index.xml',
    source: 'BBC Brasil',
    category: 'Ciência e Arqueologia',
  },
  {
    url: 'https://masp.org.br/feed',
    source: 'MASP',
    category: 'Arte e Arqueologia',
  },
  {
    url: 'https://arqueologia-iab.com.br/blog-de-noticias/feed',
    source: 'Instituto de Arqueologia Brasileira',
    category: 'Arqueologia de Jerusalém',
  },
  {
    url: 'https://incrivelhistoria.com.br/feed',
    source: 'Incrível História',
    category: 'História Cristã',
  },
  {
    url: 'http://agencia.fapesp.br/rss/',
    source: 'Agência FAPESP',
    category: 'Ciência e Pesquisa',
  },
  {
    url: 'https://www.nexojornal.com.br/rss.xml',
    source: 'Nexo Jornal',
    category: 'Análises e Ciência',
  },
  {
    url: 'https://feeds.folha.uol.com.br/ciencia/rss091.xml',
    source: 'Folha de S.Paulo - Ciência',
    category: 'Ciência',
  },
  
  // Arqueologia Bíblica Internacional
  {
    url: 'https://www.biblicalarchaeology.org/feed',
    source: 'Biblical Archaeology Society',
    category: 'Evidências Bíblicas',
  },
  {
    url: 'https://pt.christianitytoday.com/feed',
    source: 'Christianity Today Brasil',
    category: 'Apologética',
  },
];

// Política editorial: permitir apenas fontes alinhadas ao conservadorismo e à comunidade evangélica
// Você pode personalizar via variáveis de ambiente RECON_ALLOWED_SOURCES (nomes) e RECON_BLOCKED_HOSTS (domínios)
const FEEDS_ALLOWLIST = new Set(
  (Deno.env.get('RECON_ALLOWED_SOURCES')?.split(',').map(s => s.trim()).filter(Boolean)) ?? [
    'Gospel+',
    'Voltemos ao Evangelho',
    'Pleno News',
    'Comunhão',
    'Biblical Archaeology Society',
    'Christianity Today Brasil',
  ]
);

const BLOCKED_HOSTS = new Set(
  (Deno.env.get('RECON_BLOCKED_HOSTS')?.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)) ?? [
    'bbc.co.uk', 'bbc.com', 'nexojornal.com.br', 'folha.uol.com.br', 'agencia.fapesp.br', 'masp.org.br', 'incrivelhistoria.com.br', 'arqueologia-iab.com.br'
  ]
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
      { term: 'arqueologia bíblica', category: 'Arqueologia Bíblica' },
      { term: 'descoberta arqueológica Israel Terra Santa', category: 'Descobertas Arqueológicas' },
      { term: 'manuscritos antigos bíblia', category: 'Manuscritos Bíblicos' },
      { term: 'Mar Morto descoberta arqueológica', category: 'Manuscritos do Mar Morto' },
      { term: 'teologia reformada', category: 'Teologia Reformada' },
      { term: 'história cristianismo primitivo', category: 'História Cristã' },
      { term: 'apologética cristã', category: 'Apologética' },
      { term: 'evidências históricas bíblia', category: 'Evidências Bíblicas' },
      { term: 'descoberta científica comprova bíblia', category: 'Ciência e Fé' },
      { term: 'arqueologia Jerusalém templo', category: 'Arqueologia de Jerusalém' },
      { term: 'perseguição cristãos', category: 'Perseguição Religiosa' },
      { term: 'igreja evangélica Brasil notícias', category: 'Igreja Evangélica' },
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

    // Inserir artigos no banco de dados
    console.log('\n💾 Salvando artigos no banco de dados...');
    for (const article of uniqueArticles) {
      const c = classifyArticle(article.title, article.description);
      const { error } = await supabase
        .from('articles')
        .upsert(
          {
            title: article.title,
            description: article.description,
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
