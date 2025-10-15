import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Traduzir texto para português usando Lovable AI
async function translateToPortuguese(texts: string[]): Promise<string[]> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    console.warn('⚠️ LOVABLE_API_KEY não encontrada, pulando tradução');
    return texts;
  }

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'Você é um tradutor especializado. Traduza os textos para português do Brasil de forma natural e fluente. Retorne apenas as traduções, uma por linha, na mesma ordem.'
          },
          {
            role: 'user',
            content: `Traduza estes textos para português:\n\n${texts.map((t, i) => `${i + 1}. ${t}`).join('\n')}`
          }
        ],
      }),
    });

    if (!response.ok) {
      console.error('Erro na tradução:', response.status);
      return texts;
    }

    const data = await response.json();
    const translated = data.choices[0].message.content
      .split('\n')
      .filter((line: string) => line.trim().match(/^\d+\./))
      .map((line: string) => line.replace(/^\d+\.\s*/, '').trim());
    
    return translated.length === texts.length ? translated : texts;
  } catch (error) {
    console.error('Erro ao traduzir:', error);
    return texts;
  }
}

// Gerar imagem para notícia usando Lovable AI
async function generateImage(title: string): Promise<string | null> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    return null;
  }

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: `Crie uma imagem ilustrativa fotorrealista para esta notícia de arqueologia bíblica: ${title}. A imagem deve ser histórica, profissional e apropriada para um site de notícias.`
          }
        ],
        modalities: ['image', 'text'],
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    return imageUrl || null;
  } catch (error) {
    console.error('Erro ao gerar imagem:', error);
    return null;
  }
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

// Função auxiliar para extrair texto entre tags XML
function extractXMLTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

// Função auxiliar para extrair CDATA
function cleanCDATA(text: string): string {
  return text
    .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
    .replace(/<[^>]*>/g, ' ')
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

      const cleanDesc = description ? cleanCDATA(description).substring(0, 300) : undefined;

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

// Fontes RSS especializadas em arqueologia
const RSS_FEEDS = [
  {
    url: 'https://www.biblicalarchaeology.org/feed/',
    source: 'Biblical Archaeology Society',
    category: 'Arqueologia Bíblica',
  },
  {
    url: 'https://www.archaeology.org/feed',
    source: 'Archaeology Magazine',
    category: 'Arqueologia',
  },
  {
    url: 'https://archaeologynewsnetwork.blogspot.com/feeds/posts/default',
    source: 'Archaeology News Network',
    category: 'Notícias Arqueológicas',
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

    console.log('🚀 Iniciando coleta de notícias sobre Arqueologia Bíblica...\n');

    let totalArticles = 0;
    let newArticles = 0;
    const allArticles: Article[] = [];

    // Buscar Google News para termos específicos
    console.log('🔍 Buscando no Google News...');
    
    const queries = [
      { term: 'arqueologia bíblica', category: 'Arqueologia Bíblica' },
      { term: 'descoberta arqueológica israel', category: 'Descobertas Arqueológicas' },
      { term: 'manuscritos antigos bíblia', category: 'Manuscritos Antigos' },
      { term: 'cidades bíblicas descobertas', category: 'Cidades Bíblicas' },
      { term: 'pesquisa arqueológica cristianismo', category: 'Pesquisas Científicas' },
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

    // Traduzir títulos e descrições
    console.log('\n🌐 Traduzindo notícias para português...');
    const titlesToTranslate = uniqueArticles.map(a => a.title);
    const descriptionsToTranslate = uniqueArticles.map(a => a.description || '');
    
    const translatedTitles = await translateToPortuguese(titlesToTranslate);
    const translatedDescriptions = await translateToPortuguese(descriptionsToTranslate);
    
    // Aplicar traduções
    for (let i = 0; i < uniqueArticles.length; i++) {
      uniqueArticles[i].title = translatedTitles[i] || uniqueArticles[i].title;
      uniqueArticles[i].description = translatedDescriptions[i] || uniqueArticles[i].description;
    }
    
    console.log('✓ Tradução concluída');

    // Gerar imagens para artigos sem imagem
    console.log('\n🎨 Gerando imagens para notícias sem imagem...');
    let generatedImages = 0;
    for (const article of uniqueArticles) {
      if (!article.image_url) {
        const imageUrl = await generateImage(article.title);
        if (imageUrl) {
          article.image_url = imageUrl;
          generatedImages++;
        }
        // Rate limiting para geração de imagens
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    console.log(`✓ ${generatedImages} imagens geradas`);

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
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
