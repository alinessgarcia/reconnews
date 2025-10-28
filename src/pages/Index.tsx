import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArticleCard } from "@/components/ArticleCard";
// Substituído por controles compactos de Select no painel de filtros
// StatsBar removido conforme solicitação: dados visíveis não relevantes ao público
import { SearchBar } from "@/components/SearchBar";
import { Pagination } from "@/components/Pagination";
import { CollectingBar } from "@/components/CollectingBar";
import { Newspaper, RefreshCw, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { REGIONS_CIVILIZATIONS, EVIDENCE_TYPES, THEMES, facetCounts, classifyArticle } from "@/lib/utils";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { useIsMobile } from "@/hooks/use-mobile";
import ContactSection from "@/components/ContactSection";

interface Article {
  id: string;
  title: string;
  description?: string;
  title_pt?: string;
  description_pt?: string;
  translation_provider?: string;
  url: string;
  source: string;
  published_at?: string;
  image_url?: string;
  category?: string;
  // Novos campos persistidos
  region?: string | null;
  evidence_type?: string | null;
  theme?: string | null;
  scraped_at: string;
}

const Index = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  // Novos filtros acadêmicos
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isCollecting, setIsCollecting] = useState(false);
  const [collectProgress, setCollectProgress] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  
  const ITEMS_PER_PAGE = 12;

  const fetchArticles = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("articles")
        .select("*")
        .order("scraped_at", { ascending: false })
        .limit(200);

      // Filtros server-side para facetas acadêmicas
      if (selectedRegion) {
        query = query.eq("region", selectedRegion);
      }
      if (selectedEvidence) {
        query = query.eq("evidence_type", selectedEvidence);
      }
      if (selectedTheme) {
        query = query.eq("theme", selectedTheme);
      }

      const { data, error } = await query;

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

  // Recarrega artigos quando filtros acadêmicos mudarem para aplicar server-side
  useEffect(() => {
    fetchArticles();
    // Resetar paginação ao alterar filtros
    setCurrentPage(1);
  }, [selectedRegion, selectedEvidence, selectedTheme]);

  const triggerCollectAnimation = async () => {
    if (isCollecting) return;
    
    setIsCollecting(true);
    setCollectProgress(0);

    try {
      // Animação da barra de progresso
      const interval = setInterval(() => {
        setCollectProgress(prev => {
          if (prev >= 95) {
            return 95; // Para em 95% até a função terminar
          }
          return prev + 2;
        });
      }, 50);

      // Invocar a função de scraping
      const { data, error } = await supabase.functions.invoke('scrape-news', {
        body: { manual: true }
      });

      clearInterval(interval);
      
      if (error) {
        console.error('Erro ao coletar notícias:', error);
        toast({
          title: "Erro na coleta",
          description: "Não foi possível coletar as notícias. Tente novamente.",
          variant: "destructive",
        });
        setIsCollecting(false);
        setCollectProgress(0);
        return;
      }

      setCollectProgress(100);

      // Aguardar um pouco e recarregar os artigos
      await new Promise(resolve => setTimeout(resolve, 500));
      await fetchArticles();

      const processed = data?.uniqueArticles ?? 0;
      const inserted = data?.newArticles ?? 0;
      const msgBase = processed > 0
        ? `${processed} artigos foram verificados e atualizados.`
        : `As fontes foram verificadas. Obrigado por cooperar!`;
      const msgNew = inserted > 0 ? ` (${inserted} novos)` : "";
      toast({
        title: "Obrigado por cooperar!",
        description: `${msgBase}${msgNew}`,
      });
      
      // Reset após mostrar 100%
      setTimeout(() => {
        setIsCollecting(false);
        setCollectProgress(0);
      }, 1000);
    } catch (err) {
      console.error('Erro na coleta:', err);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao coletar notícias.",
        variant: "destructive",
      });
      setIsCollecting(false);
      setCollectProgress(0);
    }
  };

  // Contagens para filtros acadêmicos
  const academicCounts = useMemo(() => facetCounts(articles), [articles]);

  // Listas derivadas para filtros simples
  const sources = useMemo(() => Array.from(new Set(articles.map(a => a.source))), [articles]);
  const categories = useMemo(() => Array.from(new Set(articles.map(a => a.category).filter(Boolean))) as string[], [articles]);
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of articles) {
      const cat = a.category || undefined;
      if (cat) counts[cat] = (counts[cat] || 0) + 1;
    }
    counts['all'] = articles.length;
    return counts;
  }, [articles]);

  // Filtragem client-side adicional (busca, fonte, categoria)
  useEffect(() => {
    let result = [...articles];

    // Busca por texto
    const q = (searchQuery || '').trim().toLowerCase();
    if (q) {
      result = result.filter(a => (
        `${a.title} ${a.description || ''} ${a.title_pt || ''} ${a.description_pt || ''}`
          .toLowerCase()
          .includes(q)
      ));
    }

    // Filtro por fonte e categoria
    if (selectedSource) {
      result = result.filter(a => a.source === selectedSource);
    }
    if (selectedCategory) {
      result = result.filter(a => a.category === selectedCategory);
    }

    // Filtros acadêmicos (usar valor persistido ou classificar on-the-fly)
    if (selectedRegion) {
      result = result.filter(a => (a.region ?? classifyArticle(a.title, a.description).region) === selectedRegion);
    }
    if (selectedEvidence) {
      result = result.filter(a => (a.evidence_type ?? classifyArticle(a.title, a.description).evidenceType) === selectedEvidence);
    }
    if (selectedTheme) {
      result = result.filter(a => (a.theme ?? classifyArticle(a.title, a.description).theme) === selectedTheme);
    }

    setFilteredArticles(result);
    setCurrentPage(1);
  }, [articles, searchQuery, selectedSource, selectedCategory, selectedRegion, selectedEvidence, selectedTheme]);

  // Paginação
  const totalPages = Math.max(1, Math.ceil(filteredArticles.length / ITEMS_PER_PAGE));
  const paginatedArticles = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredArticles.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredArticles, currentPage]);

  return (
    <div className="min-h-screen bg-background">
      <CollectingBar progress={collectProgress} isCollecting={isCollecting} />
      
      {/* Hero Section */}
      <header className="relative overflow-hidden bg-gradient-to-r from-primary via-primary/90 to-accent text-primary-foreground py-20 px-4">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)]" />
        <div className="container mx-auto max-w-7xl relative">
          <div className="flex items-center justify-between flex-wrap gap-6">
            <div className="flex items-center gap-4">
              <img src="/android-chrome-512x512.png" alt="ReconNews Logo" className="h-16 w-16 rounded-xl shadow-lg" />
              <div>
                <h1 className="text-5xl font-bold tracking-tight">
                  ReconNews
                </h1>
                <p className="text-primary-foreground/90 text-lg font-medium">
                  Descobertas cristãs, achados arqueológicos sérios e pesquisas históricas
                </p>
                {/* Removido texto sobre horários/frequência de atualização conforme solicitação */}
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

          {/* Área de estatísticas removida */}
        </div>
      </header>

      {/* Filters and Search (Compacto, com Drawer no mobile e Collapsible no desktop) */}
      <main className="container mx-auto max-w-7xl px-4">
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Explorar Notícias</h2>
            {isMobile ? (
              <Drawer>
                <DrawerTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Filter className="h-4 w-4" />
                    Filtros
                  </Button>
                </DrawerTrigger>
                <DrawerContent className="p-4">
                  <DrawerHeader>
                    <DrawerTitle>Filtros</DrawerTitle>
                  </DrawerHeader>
                  <div className="space-y-4">
                    <SearchBar value={searchQuery} onChange={setSearchQuery} />
                    <div className="grid grid-cols-1 gap-3">
                      {/* Fonte */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Fonte</label>
                        <Select value={selectedSource ?? "__all__"} onValueChange={(v) => setSelectedSource(v === "__all__" ? null : v)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Selecione a fonte" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__all__">Todas</SelectItem>
                            {sources.map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Categoria */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Categoria</label>
                        <Select value={selectedCategory ?? "__all__"} onValueChange={(v) => setSelectedCategory(v === "__all__" ? null : v)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Selecione a categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__all__">Todas</SelectItem>
                            {categories.map((c) => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Taxonomia Acadêmica */}
                      <div className="grid grid-cols-1 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Região/Civilizações</label>
                          <Select value={selectedRegion ?? "__all__"} onValueChange={(v) => setSelectedRegion(v === "__all__" ? null : v)}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Todas" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__all__">Todas</SelectItem>
                              {REGIONS_CIVILIZATIONS.map((r) => (
                                <SelectItem key={r} value={r}>{r}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Tipo de Evidência</label>
                          <Select value={selectedEvidence ?? "__all__"} onValueChange={(v) => setSelectedEvidence(v === "__all__" ? null : v)}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Todas" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__all__">Todas</SelectItem>
                              {EVIDENCE_TYPES.map((e) => (
                                <SelectItem key={e} value={e}>{e}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Tema</label>
                          <Select value={selectedTheme ?? "__all__"} onValueChange={(v) => setSelectedTheme(v === "__all__" ? null : v)}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Todos" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__all__">Todos</SelectItem>
                              {THEMES.map((t) => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                  <DrawerFooter className="mt-4">
                    <div className="flex items-center justify-between">
                      <Button variant="outline" size="sm" onClick={() => {
                        setSelectedSource(null);
                        setSelectedCategory(null);
                        setSelectedRegion(null);
                        setSelectedEvidence(null);
                        setSelectedTheme(null);
                        setSearchQuery("");
                      }}>Limpar filtros</Button>
                      <DrawerClose asChild>
                        <Button size="sm" className="gap-1">
                          Aplicar
                        </Button>
                      </DrawerClose>
                    </div>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>
            ) : (
              <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="default" className="gap-1" onClick={() => setFiltersOpen(!filtersOpen)}>
                    <Filter className="h-4 w-4" />
                    Filtros
                    {filtersOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <CollapsibleContent className="mt-4 grid grid-cols-3 gap-4">
                  <div className="col-span-3">
                    <SearchBar value={searchQuery} onChange={setSearchQuery} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground">Fonte</label>
                    <Select value={selectedSource ?? "__all__"} onValueChange={(v) => setSelectedSource(v === "__all__" ? null : v)}>
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Todas</SelectItem>
                        {sources.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground">Categoria</label>
                    <Select value={selectedCategory ?? "__all__"} onValueChange={(v) => setSelectedCategory(v === "__all__" ? null : v)}>
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Todas</SelectItem>
                        {categories.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground">Região/Civilizações</label>
                    <Select value={selectedRegion ?? "__all__"} onValueChange={(v) => setSelectedRegion(v === "__all__" ? null : v)}>
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Todas</SelectItem>
                        {REGIONS_CIVILIZATIONS.map((r) => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground">Tipo de Evidência</label>
                    <Select value={selectedEvidence ?? "__all__"} onValueChange={(v) => setSelectedEvidence(v === "__all__" ? null : v)}>
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Todas</SelectItem>
                        {EVIDENCE_TYPES.map((e) => (
                          <SelectItem key={e} value={e}>{e}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground">Tema</label>
                    <Select value={selectedTheme ?? "__all__"} onValueChange={(v) => setSelectedTheme(v === "__all__" ? null : v)}>
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Todos</SelectItem>
                        {THEMES.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3 flex items-center justify-start gap-2">
                    <Button variant="outline" size="default" onClick={() => {
                      setSelectedSource(null);
                      setSelectedCategory(null);
                      setSelectedRegion(null);
                      setSelectedEvidence(null);
                      setSelectedTheme(null);
                      setSearchQuery("");
                    }}>Limpar filtros</Button>
                    <Button size="default" onClick={() => setFiltersOpen(false)}>Aplicar</Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>

          {/* Results header */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              {filteredArticles.length} resultados
            </p>
          </div>

          <Separator className="my-4" />

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
                {searchQuery || selectedCategory || selectedSource || selectedRegion || selectedEvidence || selectedTheme
                  ? "Tente ajustar seus filtros ou busca"
                  : "As notícias são coletadas automaticamente a partir de fontes públicas"
                }
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedArticles.map((article) => (
                  <ArticleCard
                    key={article.id}
                    title={article.title}
                    description={article.description || undefined}
                    titlePt={article.title_pt || undefined}
                    descriptionPt={article.description_pt || undefined}
                    translationProvider={article.translation_provider || undefined}
                    url={article.url}
                    source={article.source}
                    publishedAt={article.published_at || undefined}
                    imageUrl={article.image_url || undefined}
                    category={article.category || undefined}
                  />
                ))}
              </div>
              <div className="mt-6">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
              {/* Área de Contato */}
              <ContactSection />
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-b from-background to-muted/20 border-t border-border mt-20 py-12">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <img src="/favicon-32x32.png" alt="ReconNews Logo" className="h-8 w-8 rounded-md" />
                <h4 className="font-bold text-lg">ReconNews</h4>
              </div>
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
              <p className="text-sm text-muted-foreground">
                Sistema automático de coleta (sem divulgação de horários)
              </p>
            </div>
          </div>
          <Separator className="mb-6" />
          <div className="text-center text-sm text-muted-foreground">
            <p>© 2025 ReconNews • Todas as notícias são coletadas de fontes públicas</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
