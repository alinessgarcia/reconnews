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

// Função auxiliar para fazer scraping de um site
async function scrapeWebsite(url: string, source: string): Promise<Article[]> {
  try {
    console.log(`Scraping ${source} - ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      console.error(`Erro ao acessar ${source}: ${response.status}`);
      return [];
    }

    const html = await response.text();
    const articles: Article[] = [];

    // Parser básico para extrair informações
    // BBC Portuguese
    if (source === 'BBC') {
      const titleMatches = html.matchAll(/<h2[^>]*class="[^"]*bbc[^"]*"[^>]*>([^<]+)<\/h2>/gi);
      const linkMatches = html.matchAll(/<a[^>]*href="([^"]*)"[^>]*>/gi);
      
      const titles = Array.from(titleMatches).map(m => m[1].trim());
      const links = Array.from(linkMatches)
        .map(m => m[1])
        .filter(link => link.includes('/portuguese/'));
      
      for (let i = 0; i < Math.min(titles.length, links.length, 10); i++) {
        if (titles[i] && links[i]) {
          articles.push({
            title: titles[i],
            url: links[i].startsWith('http') ? links[i] : `https://www.bbc.com${links[i]}`,
            source,
            category: 'Geral',
          });
        }
      }
    }
    
    // Outras fontes - implementação simplificada
    else {
      // Parser genérico para artigos
      const articleMatches = html.matchAll(/<article[^>]*>(.*?)<\/article>/gis);
      
      for (const match of Array.from(articleMatches).slice(0, 10)) {
        const articleHtml = match[1];
        const titleMatch = articleHtml.match(/<h[1-3][^>]*>([^<]+)<\/h[1-3]>/i);
        const linkMatch = articleHtml.match(/<a[^>]*href="([^"]+)"/i);
        
        if (titleMatch && linkMatch) {
          let articleUrl = linkMatch[1];
          if (!articleUrl.startsWith('http')) {
            const baseUrl = new URL(url);
            articleUrl = `${baseUrl.origin}${articleUrl}`;
          }
          
          articles.push({
            title: titleMatch[1].trim(),
            url: articleUrl,
            source,
            category: 'Arqueologia',
          });
        }
      }
    }

    console.log(`${source}: ${articles.length} artigos encontrados`);
    return articles;
  } catch (error) {
    console.error(`Erro ao fazer scraping de ${source}:`, error);
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

    // Lista de sites para fazer scraping
    const sources = [
      { url: 'https://www.bbc.com/portuguese', source: 'BBC' },
      { url: 'https://www.bbc.com/portuguese/topics/c06gq6k4vk3t', source: 'BBC' },
      { url: 'https://revistagalileu.globo.com/ciencia/arqueologia/', source: 'Galileu' },
      { url: 'https://www.cnnbrasil.com.br/tudo-sobre/arqueologia/', source: 'CNN' },
      { url: 'https://www.nationalgeographicbrasil.com/assunto/temas/historia/arqueologia', source: 'National Geographic' },
    ];

    let totalArticles = 0;
    let newArticles = 0;

    // Fazer scraping de cada fonte
    for (const { url, source } of sources) {
      const articles = await scrapeWebsite(url, source);
      totalArticles += articles.length;

      // Inserir artigos no banco de dados
      for (const article of articles) {
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
        } else if (error.code !== '23505') { // Ignore duplicate key errors
          console.error('Erro ao inserir artigo:', error);
        }
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
