import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Article {
  title: string;
  description?: string;
  url: string;
  source: string;
  published_at?: string;
  image_url?: string;
  category?: string;
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
    console.log(`  📡 Buscando RSS: ${source}`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
    });

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
      
      // Tentar extrair imagem da descrição
      let imageUrl: string | undefined;
      if (description) {
        const imgMatch = description.match(/<img[^>]+src=["']([^"']+)["']/i);
        if (imgMatch) {
          imageUrl = imgMatch[1];
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
          .substring(0, 300);
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

// Fontes RSS de portais evangélicos e cristãos brasileiros
const RSS_FEEDS = [
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
  {
    url: 'https://noticias.adventistas.org/pt/feed/',
    source: 'Notícias Adventistas',
    category: 'Notícias Cristãs',
  },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
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

    // Buscar RSS feeds especializados
    console.log('\n📚 Buscando feeds RSS especializados...');
    for (const feed of RSS_FEEDS) {
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
    }, [] as Article[]);

    console.log(`📊 Artigos únicos após deduplicação: ${uniqueArticles.length}`);

    // Inserir artigos no banco de dados
    console.log('\n💾 Salvando artigos no banco de dados...');
    for (const article of uniqueArticles) {
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
            scraped_at: new Date().toISOString(),
          },
          { onConflict: 'url', ignoreDuplicates: true }
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
