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

// Função auxiliar para extrair texto limpo de HTML
function extractTextFromHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Função auxiliar para extrair imagem de um bloco HTML
function extractImageUrl(html: string, baseUrl: string): string | undefined {
  // Procura por tags img com src
  const imgMatch = html.match(/<img[^>]*src=["']([^"']+)["']/i);
  if (imgMatch && imgMatch[1]) {
    let imgUrl = imgMatch[1];
    // Se a URL for relativa, converte para absoluta
    if (!imgUrl.startsWith('http')) {
      try {
        const base = new URL(baseUrl);
        imgUrl = new URL(imgUrl, base.origin).href;
      } catch (e) {
        return undefined;
      }
    }
    return imgUrl;
  }
  
  // Procura por data-src (lazy loading)
  const dataSrcMatch = html.match(/data-src=["']([^"']+)["']/i);
  if (dataSrcMatch && dataSrcMatch[1]) {
    let imgUrl = dataSrcMatch[1];
    if (!imgUrl.startsWith('http')) {
      try {
        const base = new URL(baseUrl);
        imgUrl = new URL(imgUrl, base.origin).href;
      } catch (e) {
        return undefined;
      }
    }
    return imgUrl;
  }
  
  return undefined;
}

// Parser específico para BBC
async function scrapeBBC(url: string): Promise<Article[]> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) return [];

    const html = await response.text();
    const articles: Article[] = [];

    // BBC usa estrutura específica com data attributes
    const promoMatches = html.matchAll(/<div[^>]*data-testid="promo"[^>]*>(.*?)<\/div>/gis);
    
    for (const match of Array.from(promoMatches).slice(0, 15)) {
      const promoHtml = match[1];
      
      const titleMatch = promoHtml.match(/<h\d[^>]*>([^<]+)<\/h\d>/i);
      const linkMatch = promoHtml.match(/<a[^>]*href=["']([^"']+)["']/i);
      const descMatch = promoHtml.match(/<p[^>]*>([^<]+)<\/p>/i);
      
      if (titleMatch && linkMatch) {
        let articleUrl = linkMatch[1];
        if (articleUrl.startsWith('/')) {
          articleUrl = `https://www.bbc.com${articleUrl}`;
        }
        
        const imageUrl = extractImageUrl(promoHtml, url);
        
        articles.push({
          title: extractTextFromHtml(titleMatch[1]),
          description: descMatch ? extractTextFromHtml(descMatch[1]) : undefined,
          url: articleUrl,
          source: 'BBC',
          image_url: imageUrl,
          category: 'Notícias',
        });
      }
    }

    return articles;
  } catch (error) {
    console.error('Erro no scraping BBC:', error);
    return [];
  }
}

// Parser específico para Revista Galileu
async function scrapeGalileu(url: string): Promise<Article[]> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) return [];

    const html = await response.text();
    const articles: Article[] = [];

    // Galileu usa bastter-card ou feed-post
    const cardMatches = html.matchAll(/<div[^>]*class="[^"]*(?:bastter-card|feed-post)[^"]*"[^>]*>(.*?)<\/div>/gis);
    
    for (const match of Array.from(cardMatches).slice(0, 15)) {
      const cardHtml = match[1];
      
      const linkMatch = cardHtml.match(/<a[^>]*href=["']([^"']+)["']/i);
      const titleMatch = cardHtml.match(/<h\d[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/h\d>/i) ||
                        cardHtml.match(/<h\d[^>]*>([^<]+)<\/h\d>/i);
      const descMatch = cardHtml.match(/<p[^>]*>([^<]+)<\/p>/i);
      
      if (linkMatch && titleMatch) {
        let articleUrl = linkMatch[1];
        if (!articleUrl.startsWith('http')) {
          articleUrl = `https://revistagalileu.globo.com${articleUrl}`;
        }
        
        const imageUrl = extractImageUrl(cardHtml, url);
        
        articles.push({
          title: extractTextFromHtml(titleMatch[1]),
          description: descMatch ? extractTextFromHtml(descMatch[1]) : undefined,
          url: articleUrl,
          source: 'Galileu',
          image_url: imageUrl,
          category: 'Arqueologia',
        });
      }
    }

    return articles;
  } catch (error) {
    console.error('Erro no scraping Galileu:', error);
    return [];
  }
}

// Parser específico para CNN Brasil
async function scrapeCNN(url: string): Promise<Article[]> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) return [];

    const html = await response.text();
    const articles: Article[] = [];

    // CNN usa list-item ou post
    const itemMatches = html.matchAll(/<(?:li|article)[^>]*class="[^"]*(?:list-item|post)[^"]*"[^>]*>(.*?)<\/(?:li|article)>/gis);
    
    for (const match of Array.from(itemMatches).slice(0, 15)) {
      const itemHtml = match[1];
      
      const linkMatch = itemHtml.match(/<a[^>]*href=["']([^"']+)["']/i);
      const titleMatch = itemHtml.match(/<h\d[^>]*>([^<]+)<\/h\d>/i);
      const descMatch = itemHtml.match(/<p[^>]*>([^<]+)<\/p>/i);
      
      if (linkMatch && titleMatch) {
        let articleUrl = linkMatch[1];
        if (!articleUrl.startsWith('http')) {
          articleUrl = `https://www.cnnbrasil.com.br${articleUrl}`;
        }
        
        const imageUrl = extractImageUrl(itemHtml, url);
        
        articles.push({
          title: extractTextFromHtml(titleMatch[1]),
          description: descMatch ? extractTextFromHtml(descMatch[1]) : undefined,
          url: articleUrl,
          source: 'CNN',
          image_url: imageUrl,
          category: 'Arqueologia',
        });
      }
    }

    return articles;
  } catch (error) {
    console.error('Erro no scraping CNN:', error);
    return [];
  }
}

// Parser específico para National Geographic
async function scrapeNatGeo(url: string): Promise<Article[]> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) return [];

    const html = await response.text();
    const articles: Article[] = [];

    // NatGeo usa article ou card
    const articleMatches = html.matchAll(/<(?:article|div)[^>]*class="[^"]*(?:article|card)[^"]*"[^>]*>(.*?)<\/(?:article|div)>/gis);
    
    for (const match of Array.from(articleMatches).slice(0, 15)) {
      const articleHtml = match[1];
      
      const linkMatch = articleHtml.match(/<a[^>]*href=["']([^"']+)["']/i);
      const titleMatch = articleHtml.match(/<h\d[^>]*>([^<]+)<\/h\d>/i);
      const descMatch = articleHtml.match(/<p[^>]*>([^<]+)<\/p>/i);
      
      if (linkMatch && titleMatch) {
        let articleUrl = linkMatch[1];
        if (!articleUrl.startsWith('http')) {
          articleUrl = `https://www.nationalgeographicbrasil.com${articleUrl}`;
        }
        
        const imageUrl = extractImageUrl(articleHtml, url);
        
        articles.push({
          title: extractTextFromHtml(titleMatch[1]),
          description: descMatch ? extractTextFromHtml(descMatch[1]) : undefined,
          url: articleUrl,
          source: 'National Geographic',
          image_url: imageUrl,
          category: 'Arqueologia',
        });
      }
    }

    return articles;
  } catch (error) {
    console.error('Erro no scraping NatGeo:', error);
    return [];
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Iniciando scraping de notícias...');

    let totalArticles = 0;
    let newArticles = 0;

    // Fazer scraping de cada fonte com parsers específicos
    console.log('Scraping BBC Portuguese...');
    const bbcArticles1 = await scrapeBBC('https://www.bbc.com/portuguese');
    const bbcArticles2 = await scrapeBBC('https://www.bbc.com/portuguese/topics/c06gq6k4vk3t');
    const bbcArticles = [...bbcArticles1, ...bbcArticles2];
    
    console.log('Scraping Revista Galileu...');
    const galileuArticles = await scrapeGalileu('https://revistagalileu.globo.com/ciencia/arqueologia/');
    
    console.log('Scraping CNN Brasil...');
    const cnnArticles = await scrapeCNN('https://www.cnnbrasil.com.br/tudo-sobre/arqueologia/');
    
    console.log('Scraping National Geographic...');
    const natGeoArticles = await scrapeNatGeo('https://www.nationalgeographicbrasil.com/assunto/temas/historia/arqueologia');
    
    // Combinar todos os artigos
    const allArticles = [
      ...bbcArticles,
      ...galileuArticles,
      ...cnnArticles,
      ...natGeoArticles,
    ];
    
    console.log(`Total de artigos encontrados: ${allArticles.length}`);
    totalArticles = allArticles.length;

    // Inserir artigos no banco de dados
    for (const article of allArticles) {

      const { error } = await supabase
        .from('articles')
        .upsert(
          {
            title: article.title,
            description: article.description,
            url: article.url,
            source: article.source,
            published_at: article.published_at || new Date().toISOString(),
            image_url: article.image_url,
            category: article.category,
            scraped_at: new Date().toISOString(),
          },
          { onConflict: 'url', ignoreDuplicates: true }
        );

      if (!error) {
        newArticles++;
        console.log(`✓ ${article.source}: ${article.title.substring(0, 50)}...`);
      } else if (error.code !== '23505') { // Ignore duplicate key errors
        console.error('Erro ao inserir artigo:', error);
      }
    }

    console.log(`Scraping concluído: ${totalArticles} artigos processados, ${newArticles} novos artigos`);

    return new Response(
      JSON.stringify({
        success: true,
        totalArticles,
        newArticles,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Erro no scraping:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
