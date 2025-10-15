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

// Categorias especializadas em arqueologia bíblica
const CATEGORIES = {
  ARCHAEOLOGICAL_DISCOVERY: 'Descobertas Arqueológicas',
  ANCIENT_MANUSCRIPTS: 'Manuscritos Antigos',
  BIBLICAL_CITIES: 'Cidades Bíblicas',
  BIBLICAL_CHARACTERS: 'Personagens Bíblicos',
  SCIENTIFIC_FINDINGS: 'Achados Científicos',
  RESEARCHERS: 'Pesquisadores e Estudos',
  HISTORICAL_BOOKS: 'Livros Históricos',
  CHRISTIAN_ARCHAEOLOGY: 'Arqueologia Cristã',
};

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

// Parser para Biblical Archaeology Society
async function scrapeBAS(url: string): Promise<Article[]> {
  try {
    console.log(`  Buscando: ${url}`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      console.log(`  ✗ BAS: Erro HTTP ${response.status}`);
      return [];
    }

    const html = await response.text();
    const articles: Article[] = [];

    const patterns = [
      /<article[^>]*>(.*?)<\/article>/gis,
      /<div[^>]*class="[^"]*(?:post|article|entry)[^"]*"[^>]*>(.*?)<\/div>/gis,
    ];
    
    for (const pattern of patterns) {
      const matches = html.matchAll(pattern);
      
      for (const match of Array.from(matches)) {
        const blockHtml = match[1] || match[0];
        
        const linkMatch = blockHtml.match(/<a[^>]*href=["']([^"']+)["']/i);
        if (!linkMatch) continue;
        
        let articleUrl = linkMatch[1];
        if (!articleUrl.startsWith('http')) {
          articleUrl = `https://www.biblicalarchaeology.org${articleUrl}`;
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
          source: 'Biblical Archaeology Society',
          image_url: imageUrl,
          category: 'Arqueologia Bíblica',
        });
        
        if (articles.length >= 10) break;
      }
      
      if (articles.length > 0) break;
    }

    console.log(`  ✓ BAS: ${articles.length} artigos encontrados`);
    return articles;
  } catch (error) {
    console.error('  ✗ Erro no scraping BAS:', error);
    return [];
  }
}

// Parser para Bible History Daily
async function scrapeBHD(url: string): Promise<Article[]> {
  try {
    console.log(`  Buscando: ${url}`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      console.log(`  ✗ BHD: Erro HTTP ${response.status}`);
      return [];
    }

    const html = await response.text();
    const articles: Article[] = [];

    const patterns = [
      /<article[^>]*>(.*?)<\/article>/gis,
      /<div[^>]*class="[^"]*(?:post|article)[^"]*"[^>]*>(.*?)<\/div>/gis,
    ];
    
    for (const pattern of patterns) {
      const matches = html.matchAll(pattern);
      
      for (const match of Array.from(matches)) {
        const blockHtml = match[1] || match[0];
        
        const linkMatch = blockHtml.match(/<a[^>]*href=["']([^"']+)["']/i);
        if (!linkMatch) continue;
        
        let articleUrl = linkMatch[1];
        if (!articleUrl.startsWith('http')) {
          articleUrl = `https://www.biblicalarchaeology.org${articleUrl}`;
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
          source: 'Bible History Daily',
          image_url: imageUrl,
          category: 'História Bíblica',
        });
        
        if (articles.length >= 10) break;
      }
      
      if (articles.length > 0) break;
    }

    console.log(`  ✓ BHD: ${articles.length} artigos encontrados`);
    return articles;
  } catch (error) {
    console.error('  ✗ Erro no scraping BHD:', error);
    return [];
  }
}

// Parser para Arqueologia Bíblica BR
async function scrapeArqueologiaBiblica(url: string): Promise<Article[]> {
  try {
    console.log(`  Buscando: ${url}`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      console.log(`  ✗ Arqueologia Bíblica: Erro HTTP ${response.status}`);
      return [];
    }

    const html = await response.text();
    const articles: Article[] = [];

    const patterns = [
      /<article[^>]*>(.*?)<\/article>/gis,
      /<div[^>]*class="[^"]*(?:post|entry)[^"]*"[^>]*>(.*?)<\/div>/gis,
    ];
    
    for (const pattern of patterns) {
      const matches = html.matchAll(pattern);
      
      for (const match of Array.from(matches)) {
        const blockHtml = match[1] || match[0];
        
        const linkMatch = blockHtml.match(/<a[^>]*href=["']([^"']+)["']/i);
        if (!linkMatch) continue;
        
        let articleUrl = linkMatch[1];
        if (!articleUrl.startsWith('http')) continue;
        
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
          source: 'Arqueologia Bíblica',
          image_url: imageUrl,
          category: 'Arqueologia Bíblica',
        });
        
        if (articles.length >= 15) break;
      }
      
      if (articles.length > 0) break;
    }

    console.log(`  ✓ Arqueologia Bíblica: ${articles.length} artigos encontrados`);
    return articles;
  } catch (error) {
    console.error('  ✗ Erro no scraping Arqueologia Bíblica:', error);
    return [];
  }
}

// Parser para Science Daily - Biblical Archaeology
async function scrapeScienceDaily(url: string): Promise<Article[]> {
  try {
    console.log(`  Buscando: ${url}`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      console.log(`  ✗ Science Daily: Erro HTTP ${response.status}`);
      return [];
    }

    const html = await response.text();
    const articles: Article[] = [];

    const patterns = [
      /<div[^>]*id="featured"[^>]*>(.*?)<\/div>/gis,
      /<div[^>]*class="[^"]*story[^"]*"[^>]*>(.*?)<\/div>/gis,
    ];
    
    for (const pattern of patterns) {
      const matches = html.matchAll(pattern);
      
      for (const match of Array.from(matches)) {
        const blockHtml = match[1] || match[0];
        
        const linkMatch = blockHtml.match(/<a[^>]*href=["']([^"']+)["']/i);
        if (!linkMatch) continue;
        
        let articleUrl = linkMatch[1];
        if (!articleUrl.startsWith('http')) {
          articleUrl = `https://www.sciencedaily.com${articleUrl}`;
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
          source: 'Science Daily',
          image_url: imageUrl,
          category: 'Ciência e Arqueologia',
        });
        
        if (articles.length >= 10) break;
      }
      
      if (articles.length > 0) break;
    }

    console.log(`  ✓ Science Daily: ${articles.length} artigos encontrados`);
    return articles;
  } catch (error) {
    console.error('  ✗ Erro no scraping Science Daily:', error);
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

    console.log('🚀 Iniciando scraping de notícias sobre Arqueologia Bíblica...\n');

    let totalArticles = 0;
    let newArticles = 0;

    // Fazer scraping de cada fonte especializada em arqueologia bíblica
    console.log('📖 Scraping Biblical Archaeology Society...');
    const basArticles = await scrapeBAS('https://www.biblicalarchaeology.org/news/');
    
    console.log('\n📚 Scraping Bible History Daily...');
    const bhdArticles = await scrapeBHD('https://www.biblicalarchaeology.org/daily/');
    
    console.log('\n🏺 Scraping Arqueologia Bíblica BR...');
    const arqueoArticles = await scrapeArqueologiaBiblica('https://arqueologiabiblica.blogspot.com/');
    
    console.log('\n🔬 Scraping Science Daily - Archaeology...');
    const scienceArticles = await scrapeScienceDaily('https://www.sciencedaily.com/news/fossils_ruins/biblical_archaeology/');
    
    console.log('\n🏛️ Scraping National Geographic - Arqueologia...');
    const natGeoArticles = await scrapeNatGeo('https://www.nationalgeographicbrasil.com/assunto/temas/historia/arqueologia');
    
    // Combinar todos os artigos
    const allArticles = [
      ...basArticles,
      ...bhdArticles,
      ...arqueoArticles,
      ...scienceArticles,
      ...natGeoArticles,
    ];
    
    console.log(`\n📊 Total de artigos encontrados: ${allArticles.length}`);
    console.log(`   - Biblical Archaeology Society: ${basArticles.length}`);
    console.log(`   - Bible History Daily: ${bhdArticles.length}`);
    console.log(`   - Arqueologia Bíblica BR: ${arqueoArticles.length}`);
    console.log(`   - Science Daily: ${scienceArticles.length}`);
    console.log(`   - National Geographic: ${natGeoArticles.length}`);
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
