import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArticleCard } from "@/components/ArticleCard";
import { NewsFilters } from "@/components/NewsFilters";
import { ManualScrapeButton } from "@/components/ManualScrapeButton";
import { Newspaper, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

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
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .order("scraped_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      setArticles(data || []);
      setFilteredArticles(data || []);
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

  useEffect(() => {
    if (selectedSource) {
      setFilteredArticles(
        articles.filter((article) => article.source === selectedSource)
      );
    } else {
      setFilteredArticles(articles);
    }
  }, [selectedSource, articles]);

  const sources = Array.from(new Set(articles.map((a) => a.source)));

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-16 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Newspaper className="h-10 w-10" />
              <div>
                <h1 className="text-4xl font-bold mb-2">
                  Portal de Notícias de Arqueologia
                </h1>
                <p className="text-primary-foreground/90 text-lg">
                  Notícias atualizadas automaticamente 2x ao dia
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                size="lg"
                onClick={fetchArticles}
                disabled={loading}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
              <ManualScrapeButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto max-w-7xl px-4 py-8">
        {/* Filters */}
        <div className="mb-8 p-4 bg-card rounded-lg border border-border shadow-sm">
          <NewsFilters
            selectedSource={selectedSource}
            onSourceChange={setSelectedSource}
            sources={sources}
          />
        </div>

        {/* Articles Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-video w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="text-center py-16">
            <Newspaper className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">
              Nenhuma notícia encontrada
            </h3>
            <p className="text-muted-foreground">
              O scraping será executado automaticamente às 07:00 e 19:00
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.map((article) => (
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
        )}
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border mt-16 py-8">
        <div className="container mx-auto max-w-7xl px-4 text-center text-muted-foreground">
          <p>Coleta automática de notícias • Atualizado 2x ao dia</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
