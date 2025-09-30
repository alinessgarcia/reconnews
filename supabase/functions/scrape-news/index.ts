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
  // Tenta várias formas de encontrar imagens
  const patterns = [
    /<img[^>]*src=["']([^"']+)["']/i,
    /data-src=["']([^"']+)["']/i,
    /data-lazy-src=["']([^"']+)["']/i,
    /srcset=["']([^"'\s]+)/i,
    /background-image:\s*url\(["']?([^"')]+)["']?\)/i,
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      let imgUrl = match[1];
      
      // Ignora imagens placeholders e logos
      if (imgUrl.includes('placeholder') || imgUrl.includes('logo') || 
          imgUrl.includes('icon') || imgUrl.includes('sprite') ||
          imgUrl.includes('1x1') || imgUrl.endsWith('.svg')) {
        continue;
      }
      
      // Converte URLs relativas em absolutas
      if (!imgUrl.startsWith('http')) {
        try {
          const base = new URL(baseUrl);
          imgUrl = new URL(imgUrl, base.origin).href;
        } catch (e) {
          continue;
        }
      }
      
      return imgUrl;
    }
  }
  
  return undefined;
}

// Função para validar se é um artigo real (não elemento de navegação)
function isValidArticle(title: string, url: string): boolean {
  if (!title || title.length < 10) return false;
  
  const invalidTitles = [
    'nossos parceiros', 'redes sociais', 'menu', 'navegação',
    'compartilhe', 'siga-nos', 'assine', 'newsletter', 'mais lidas',
    'últimas notícias', 'veja mais', 'leia também', 'publicidade',
    'home', 'início', 'buscar', 'pesquisar'
  ];
  
  const titleLower = title.toLowerCase();
  if (invalidTitles.some(invalid => titleLower.includes(invalid))) {
    return false;
  }
  
  // Verifica se a URL parece ser de artigo
  const urlLower = url.toLowerCase();
  if (urlLower.includes('/tag/') || urlLower.includes('/category/') ||
      urlLower.includes('/author/') || urlLower === '/' || 
      urlLower.endsWith('/home') || urlLower.endsWith('/index')) {
    return false;
  }
  
  return true;
}

// Parser específico para BBC
async function scrapeBBC(url: string): Promise<Article[]> {
  try {
    console.log(`  Buscando: ${url}`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      console.log(`  ✗ BBC: Erro HTTP ${response.status}`);
      return [];
    }

    const html = await response.text();
    const articles: Article[] = [];

    // BBC usa diferentes estruturas, vamos tentar todas
    const patterns = [
      /<article[^>]*>(.*?)<\/article>/gis,
      /<div[^>]*data-testid="[^"]*promo[^"]*"[^>]*>(.*?)<\/div>/gis,
      /<div[^>]*class="[^"]*promo[^"]*"[^>]*>(.*?)<\/div>/gis,
    ];
    
    for (const pattern of patterns) {
      const matches = html.matchAll(pattern);
      
      for (const match of Array.from(matches)) {
        const blockHtml = match[1] || match[0];
        
        // Extrai link primeiro
        const linkMatch = blockHtml.match(/<a[^>]*href=["']([^"']+)["']/i);
        if (!linkMatch) continue;
        
        let articleUrl = linkMatch[1];
        if (articleUrl.startsWith('/')) {
          articleUrl = `https://www.bbc.com${articleUrl}`;
        }
        
        // Extrai título de diferentes tags
        const titleMatch = blockHtml.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/i) ||
                          blockHtml.match(/<span[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/span>/i);
        if (!titleMatch) continue;
        
        const title = extractTextFromHtml(titleMatch[1]);
        
        // Valida se é um artigo real
        if (!isValidArticle(title, articleUrl)) continue;
        
        // Extrai descrição/resumo
        const descMatch = blockHtml.match(/<p[^>]*class="[^"]*summary[^"]*"[^>]*>([^<]+)<\/p>/i) ||
                         blockHtml.match(/<p[^>]*>([^<]+)<\/p>/i);
        
        const imageUrl = extractImageUrl(blockHtml, url);
        
        articles.push({
          title,
          description: descMatch ? extractTextFromHtml(descMatch[1]) : undefined,
          url: articleUrl,
          source: 'BBC',
          image_url: imageUrl,
          category: 'Notícias',
        });
        
        if (articles.length >= 10) break;
      }
      
      if (articles.length > 0) break;
    }

    console.log(`  ✓ BBC: ${articles.length} artigos encontrados`);
    return articles;
  } catch (error) {
    console.error('  ✗ Erro no scraping BBC:', error);
    return [];
  }
}

// Parser específico para Revista Galileu
async function scrapeGalileu(url: string): Promise<Article[]> {
  try {
    console.log(`  Buscando: ${url}`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      console.log(`  ✗ Galileu: Erro HTTP ${response.status}`);
      return [];
    }

    const html = await response.text();
    const articles: Article[] = [];

    // Padrões comuns em sites Globo
    const patterns = [
      /<article[^>]*>(.*?)<\/article>/gis,
      /<div[^>]*class="[^"]*(?:feed-post|bastter|card|post-item)[^"]*"[^>]*>(.*?)<\/div>/gis,
    ];
    
    for (const pattern of patterns) {
      const matches = html.matchAll(pattern);
      
      for (const match of Array.from(matches)) {
        const blockHtml = match[1] || match[0];
        
        const linkMatch = blockHtml.match(/<a[^>]*href=["']([^"']+)["']/i);
        if (!linkMatch) continue;
        
        let articleUrl = linkMatch[1];
        if (!articleUrl.startsWith('http')) {
          articleUrl = `https://revistagalileu.globo.com${articleUrl}`;
        }
        
        const titleMatch = blockHtml.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/i);
        if (!titleMatch) continue;
        
        const title = extractTextFromHtml(titleMatch[1]);
        if (!isValidArticle(title, articleUrl)) continue;
        
        const descMatch = blockHtml.match(/<p[^>]*class="[^"]*(?:summary|description|excerpt)[^"]*"[^>]*>([^<]+)<\/p>/i) ||
                         blockHtml.match(/<p[^>]*>([^<]+)<\/p>/i);
        
        const imageUrl = extractImageUrl(blockHtml, url);
        
        articles.push({
          title,
          description: descMatch ? extractTextFromHtml(descMatch[1]) : undefined,
          url: articleUrl,
          source: 'Galileu',
          image_url: imageUrl,
          category: 'Arqueologia',
        });
        
        if (articles.length >= 10) break;
      }
      
      if (articles.length > 0) break;
    }

    console.log(`  ✓ Galileu: ${articles.length} artigos encontrados`);
    return articles;
  } catch (error) {
    console.error('  ✗ Erro no scraping Galileu:', error);
    return [];
  }
}

// Parser específico para CNN Brasil
async function scrapeCNN(url: string): Promise<Article[]> {
  try {
    console.log(`  Buscando: ${url}`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      console.log(`  ✗ CNN: Erro HTTP ${response.status}`);
      return [];
    }

    const html = await response.text();
    const articles: Article[] = [];

    const patterns = [
      /<article[^>]*>(.*?)<\/article>/gis,
      /<li[^>]*class="[^"]*(?:list-item|post-item)[^"]*"[^>]*>(.*?)<\/li>/gis,
      /<div[^>]*class="[^"]*(?:post|article|card)[^"]*"[^>]*>(.*?)<\/div>/gis,
    ];
    
    for (const pattern of patterns) {
      const matches = html.matchAll(pattern);
      
      for (const match of Array.from(matches)) {
        const blockHtml = match[1] || match[0];
        
        const linkMatch = blockHtml.match(/<a[^>]*href=["']([^"']+)["']/i);
        if (!linkMatch) continue;
        
        let articleUrl = linkMatch[1];
        if (!articleUrl.startsWith('http')) {
          articleUrl = `https://www.cnnbrasil.com.br${articleUrl}`;
        }
        
        const titleMatch = blockHtml.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/i);
        if (!titleMatch) continue;
        
        const title = extractTextFromHtml(titleMatch[1]);
        if (!isValidArticle(title, articleUrl)) continue;
        
        const descMatch = blockHtml.match(/<p[^>]*>([^<]+)<\/p>/i);
        
        const imageUrl = extractImageUrl(blockHtml, url);
        
        articles.push({
          title,
          description: descMatch ? extractTextFromHtml(descMatch[1]) : undefined,
          url: articleUrl,
          source: 'CNN',
          image_url: imageUrl,
          category: 'Arqueologia',
        });
        
        if (articles.length >= 10) break;
      }
      
      if (articles.length > 0) break;
    }

    console.log(`  ✓ CNN: ${articles.length} artigos encontrados`);
    return articles;
  } catch (error) {
    console.error('  ✗ Erro no scraping CNN:', error);
    return [];
  }
}

// Parser específico para National Geographic
async function scrapeNatGeo(url: string): Promise<Article[]> {
  try {
    console.log(`  Buscando: ${url}`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      console.log(`  ✗ NatGeo: Erro HTTP ${response.status}`);
      return [];
    }

    const html = await response.text();
    const articles: Article[] = [];

    const patterns = [
      /<article[^>]*>(.*?)<\/article>/gis,
      /<div[^>]*class="[^"]*(?:card|post|article-item)[^"]*"[^>]*>(.*?)<\/div>/gis,
    ];
    
    for (const pattern of patterns) {
      const matches = html.matchAll(pattern);
      
      for (const match of Array.from(matches)) {
        const blockHtml = match[1] || match[0];
        
        const linkMatch = blockHtml.match(/<a[^>]*href=["']([^"']+)["']/i);
        if (!linkMatch) continue;
        
        let articleUrl = linkMatch[1];
        if (!articleUrl.startsWith('http')) {
          articleUrl = `https://www.nationalgeographicbrasil.com${articleUrl}`;
        }
        
        const titleMatch = blockHtml.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/i);
        if (!titleMatch) continue;
        
        const title = extractTextFromHtml(titleMatch[1]);
        if (!isValidArticle(title, articleUrl)) continue;
        
        const descMatch = blockHtml.match(/<p[^>]*>([^<]+)<\/p>/i);
        
        const imageUrl = extractImageUrl(blockHtml, url);
        
        articles.push({
          title,
          description: descMatch ? extractTextFromHtml(descMatch[1]) : undefined,
          url: articleUrl,
          source: 'National Geographic',
          image_url: imageUrl,
          category: 'Arqueologia',
        });
        
        if (articles.length >= 10) break;
      }
      
      if (articles.length > 0) break;
    }

    console.log(`  ✓ NatGeo: ${articles.length} artigos encontrados`);
    return articles;
  } catch (error) {
    console.error('  ✗ Erro no scraping NatGeo:', error);
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

    console.log('🚀 Iniciando scraping de notícias...\n');

    let totalArticles = 0;
    let newArticles = 0;

    // Fazer scraping de cada fonte com parsers específicos
    console.log('📰 Scraping BBC Portuguese...');
    const bbcArticles1 = await scrapeBBC('https://www.bbc.com/portuguese');
    const bbcArticles2 = await scrapeBBC('https://www.bbc.com/portuguese/topics/c06gq6k4vk3t');
    const bbcArticles = [...bbcArticles1, ...bbcArticles2];
    
    console.log('\n📰 Scraping Revista Galileu...');
    const galileuArticles = await scrapeGalileu('https://revistagalileu.globo.com/ciencia/arqueologia/');
    
    console.log('\n📰 Scraping CNN Brasil...');
    const cnnArticles = await scrapeCNN('https://www.cnnbrasil.com.br/tudo-sobre/arqueologia/');
    
    console.log('\n📰 Scraping National Geographic...');
    const natGeoArticles = await scrapeNatGeo('https://www.nationalgeographicbrasil.com/assunto/temas/historia/arqueologia');
    
    // Combinar todos os artigos
    const allArticles = [
      ...bbcArticles,
      ...galileuArticles,
      ...cnnArticles,
      ...natGeoArticles,
    ];
    
    console.log(`\n📊 Total de artigos encontrados: ${allArticles.length}`);
    console.log(`   - BBC: ${bbcArticles.length}`);
    console.log(`   - Galileu: ${galileuArticles.length}`);
    console.log(`   - CNN: ${cnnArticles.length}`);
    console.log(`   - NatGeo: ${natGeoArticles.length}`);
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
      } else if (error.code !== '23505') { // Ignore duplicate key errors
        console.error(`✗ Erro ao inserir artigo (${article.source}):`, error.message);
      }
    }

    console.log(`\n✅ Scraping concluído!`);
    console.log(`   Total processado: ${totalArticles} artigos`);
    console.log(`   Novos artigos: ${newArticles}`);

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
