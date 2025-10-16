import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArticleCard } from "@/components/ArticleCard";
import { NewsFilters } from "@/components/NewsFilters";
import { CategoryFilter } from "@/components/CategoryFilter";
import { StatsBar } from "@/components/StatsBar";
import { SearchBar } from "@/components/SearchBar";
import { Pagination } from "@/components/Pagination";
import { CollectingBar } from "@/components/CollectingBar";
import { Newspaper, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

interface Article {
  id: string;
  title: string;
  description?: string;
  url: string;
  source: string;
  published_at?: string;
  image_url?: string;
  category?: string;
  scraped_at: string;
}

const Index = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isCollecting, setIsCollecting] = useState(false);
  const [collectProgress, setCollectProgress] = useState(0);
  const { toast } = useToast();
  
  const ITEMS_PER_PAGE = 12;

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .order("scraped_at", { ascending: false })
        .limit(200);

      if (error) throw error;

      setArticles(data || []);
    } catch (error) {
      console.error("Erro ao buscar artigos:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as notícias.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const triggerCollectAnimation = async () => {
    if (isCollecting) return;
    
    setIsCollecting(true);
    setCollectProgress(0);
    
    toast({
      title: "⚡ Energizando sistema...",
      description: "Carregando poder de coleta das notícias!",
    });

    // Animação da barra de progresso
    const interval = setInterval(() => {
      setCollectProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2;
      });
    }, 30);

    // Após 3 segundos, recarregar os artigos existentes
    setTimeout(async () => {
      clearInterval(interval);
      setCollectProgress(100);
      
      await fetchArticles();
      
      toast({
        title: "✨ Poder coletado!",
        description: "Notícias atualizadas com sucesso.",
      });
      
      // Reset após mostrar 100%
      setTimeout(() => {
        setIsCollecting(false);
        setCollectProgress(0);
      }, 1000);
    }, 3000);
  };
  
  // Filtrar artigos com base em fonte, categoria e busca
  useEffect(() => {
    let filtered = articles;
    
    if (selectedSource) {
      filtered = filtered.filter((article) => article.source === selectedSource);
    }
    
    if (selectedCategory) {
      filtered = filtered.filter((article) => article.category === selectedCategory);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((article) => 
        article.title.toLowerCase().includes(query) ||
        article.description?.toLowerCase().includes(query)
      );
    }
    
    setFilteredArticles(filtered);
    setCurrentPage(1);
  }, [selectedSource, selectedCategory, searchQuery, articles]);

  useEffect(() => {
    fetchArticles();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("articles-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "articles",
        },
        (payload) => {
          console.log("Nova notícia adicionada:", payload);
          setArticles((prev) => [payload.new as Article, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Calcular estatísticas
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayArticles = articles.filter(article => {
      const articleDate = new Date(article.scraped_at);
      articleDate.setHours(0, 0, 0, 0);
      return articleDate.getTime() === today.getTime();
    }).length;
    
    const sources = new Set(articles.map(a => a.source));
    
    return {
      total: articles.length,
      today: todayArticles,
      sources: sources.size,
    };
  }, [articles]);
  
  // Paginação
  const paginatedArticles = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredArticles.slice(startIndex, endIndex);
  }, [filteredArticles, currentPage]);
  
  const totalPages = Math.ceil(filteredArticles.length / ITEMS_PER_PAGE);
  
  const sources = Array.from(new Set(articles.map((a) => a.source)));
  const categories = Array.from(new Set(articles.map((a) => a.category).filter(Boolean))) as string[];
  
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: articles.length };
    articles.forEach(article => {
      if (article.category) {
        counts[article.category] = (counts[article.category] || 0) + 1;
      }
    });
    return counts;
  }, [articles]);

  return (
    <div className="min-h-screen bg-background">
      <CollectingBar progress={collectProgress} isCollecting={isCollecting} />
      
      {/* Hero Section */}
      <header className="relative overflow-hidden bg-gradient-to-r from-primary via-primary/90 to-accent text-primary-foreground py-20 px-4">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)]" />
        <div className="container mx-auto max-w-7xl relative">
          <div className="flex items-center justify-between flex-wrap gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm">
                <Sparkles className="h-10 w-10" />
              </div>
              <div>
                <h1 className="text-5xl font-bold mb-3 tracking-tight">
                  Arqueologia Bíblica
                </h1>
                <p className="text-primary-foreground/90 text-lg font-medium">
                  Descobertas cristãs, achados arqueológicos sérios e pesquisas históricas
                </p>
                <p className="text-primary-foreground/75 text-sm mt-1">
                  ⚡ Atualização automática às 10:00 e 22:00
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                size="lg"
                onClick={fetchArticles}
                disabled={loading}
                className="gap-2 shadow-lg"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
              <Button
                variant="default"
                size="lg"
                onClick={triggerCollectAnimation}
                disabled={loading || isCollecting}
                className="gap-2 shadow-lg relative overflow-hidden group"
              >
                <Newspaper className={`h-4 w-4 ${isCollecting ? "animate-bounce" : ""}`} />
                Coletar Agora
                {isCollecting && (
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto max-w-7xl px-4 py-8">
        {/* Stats Bar */}
        <StatsBar 
          totalArticles={stats.total}
          todayArticles={stats.today}
          sources={stats.sources}
        />
        
        <Separator className="my-8" />
        
        {/* Search Bar */}
        <div className="mb-6">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Buscar por descobertas, cidades, pesquisadores..."
          />
        </div>
        
        {/* Category Filter */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <span className="h-1 w-8 bg-primary rounded-full" />
            CATEGORIAS ESPECIALIZADAS
          </h3>
          <CategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            counts={categoryCounts}
          />
        </div>
        
        {/* Source Filters */}
        <div className="mb-8 p-5 bg-card rounded-xl border border-border shadow-sm">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">FONTES</h3>
          <NewsFilters
            selectedSource={selectedSource}
            onSourceChange={setSelectedSource}
            sources={sources}
          />
        </div>

        {/* Articles Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-video w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="text-center py-20 px-4">
            <div className="inline-flex p-4 rounded-full bg-muted mb-4">
              <Newspaper className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-bold mb-2">
              Nenhuma notícia encontrada
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              {searchQuery || selectedCategory || selectedSource 
                ? "Tente ajustar seus filtros ou busca"
                : "O sistema coleta notícias automaticamente 2x ao dia"
              }
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-muted-foreground">
              Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredArticles.length)} de {filteredArticles.length} notícias
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedArticles.map((article) => (
                <ArticleCard
                  key={article.id}
                  title={article.title}
                  description={article.description || undefined}
                  url={article.url}
                  source={article.source}
                  publishedAt={article.published_at || undefined}
                  imageUrl={article.image_url || undefined}
                  category={article.category || undefined}
                />
              ))}
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-b from-background to-muted/20 border-t border-border mt-20 py-12">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <h4 className="font-bold text-lg mb-3 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Arqueologia Bíblica
              </h4>
              <p className="text-sm text-muted-foreground">
                Portal especializado em descobertas arqueológicas cristãs, manuscritos antigos e pesquisas históricas sérias.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">COBERTURA</h4>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>✓ Descobertas Arqueológicas</li>
                <li>✓ Manuscritos e Documentos</li>
                <li>✓ Cidades e Personagens Bíblicos</li>
                <li>✓ Pesquisadores Renomados</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">ATUALIZAÇÃO</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Sistema automático de coleta
              </p>
              <div className="flex flex-col gap-1 text-sm">
                <span className="text-primary font-medium">⏰ 10:00 (Manhã)</span>
                <span className="text-primary font-medium">⏰ 22:00 (Noite)</span>
              </div>
            </div>
          </div>
          <Separator className="mb-6" />
          <div className="text-center text-sm text-muted-foreground">
            <p>© 2025 Portal de Arqueologia Bíblica • Todas as notícias são coletadas de fontes públicas</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
