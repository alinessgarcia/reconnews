import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase, supabaseConfigError } from "@/integrations/supabase/client";
import { ArticleCard } from "@/components/ArticleCard";
import { FeaturedCard } from "@/components/FeaturedCard";
import { SearchBar } from "@/components/SearchBar";
import { Pagination } from "@/components/Pagination";
import { Link, useSearchParams } from "react-router-dom";
import { Newspaper, Filter, ChevronDown, ChevronUp, Dumbbell, Clock, Share2, Bookmark, BookmarkCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { REGIONS_CIVILIZATIONS, EVIDENCE_TYPES, THEMES } from "@/lib/utils";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { useIsMobile } from "@/hooks/use-mobile";
import { CONTENT_CATEGORIES } from "@/components/Navbar";

// Keywords for each content category — used to filter articles by title/description
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  fe: ["fé", "cristão", "cristã", "jesus", "deus", "bíbli", "bibli", "igreja", "evangél", "evangel", "pastor", "culto", "oração", "devocional", "espírit", "gospel", "teolog", "louvor", "pregação", "testemunho", "salvação", "batismo", "católic", "protestant", "doutrina", "crente", "missão", "missionár"],
  liberdade: ["liberda", "perseguiç", "perseguic", "religiosa", "religioso", "persecut", "freedom", "religious", "tribunal", "lei", "direito", "constituiç", "liberdade de culto", "intolerância", "discriminaç", "preso por fé"],
  saude: ["saúde", "saude", "bem-estar", "bem estar", "aliment", "nutriç", "nutric", "vitamina", "mineral", "health", "wellness", "food", "diet", "nutrition", "saudável", "saudavel", "benefício", "beneficio", "cura", "prevenç", "prevenc", "imunidade", "colesterol", "diabetes", "pressão", "pressao"],
  natureza: ["natureza", "planta", "medicin", "erva", "fitoterápic", "fitoterapic", "natural", "chá de", "cha de", "folha", "raiz", "herbal", "herb", "botanical", "remédio natural", "remedio natural", "floresta", "biodiversidade", "orgânic", "organic"],
  dieta: ["dieta", "proteí", "protei", "proteic", "salada", "receita", "carne", "frango", "peixe", "ovo", "legume", "verdura", "low carb", "keto", "protein", "recipe", "meal", "calorias", "emagre", "musculaç", "whey", "suplemento", "treino"],
};

function matchesCategory(article: { title: string; description?: string; title_pt?: string; description_pt?: string; category?: string }, catId: string): boolean {
  const keywords = CATEGORY_KEYWORDS[catId];
  if (!keywords) return true; // unknown category = show all
  const text = `${article.title} ${article.description || ''} ${article.title_pt || ''} ${article.description_pt || ''} ${article.category || ''}`.toLowerCase();
  return keywords.some(kw => text.includes(kw));
}


const HIDDEN_CATEGORIES = new Set(['Portal Evangélico', 'Notícias Evangélicas']);

interface Article {
  id: string;
  title: string;
  description?: string;
  title_pt?: string;
  description_pt?: string;
  extended_summary_pt?: string;
  translation_provider?: string;
  url: string;
  source: string;
  published_at?: string;
  image_url?: string;
  category?: string;
  region?: string | null;
  evidence_type?: string | null;
  theme?: string | null;
  scraped_at: string;
}

// Sub-componente para o toggle de tradução
const TranslationToggle = ({
  translationMode,
  hasAnyTranslation,
  onModeChange,
}: {
  translationMode: "auto" | "pt" | "original";
  hasAnyTranslation: boolean;
  onModeChange: (mode: "auto" | "pt" | "original") => void;
}) => (
  <div className="flex items-center gap-1">
    <span className="text-xs text-muted-foreground">Idioma:</span>
    <div className="flex rounded-md border border-border overflow-hidden">
      <button
        className={`px-2 py-1 text-xs ${translationMode === 'auto' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
        onClick={() => onModeChange('auto')}
      >Auto</button>
      <button
        className={`px-2 py-1 text-xs ${translationMode === 'pt' ? 'bg-primary text-primary-foreground' : 'bg-muted'} ${!hasAnyTranslation ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={() => hasAnyTranslation && onModeChange('pt')}
        disabled={!hasAnyTranslation}
        title={hasAnyTranslation ? 'Mostrar tradução' : 'Tradução indisponível'}
      >PT-BR</button>
      <button
        className={`px-2 py-1 text-xs ${translationMode === 'original' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
        onClick={() => onModeChange('original')}
      >Original</button>
    </div>
  </div>
);

// Sub-componente para selects de filtro
const FilterSelect = ({
  label,
  value,
  onChange,
  options,
  allLabel = "Todas",
  size = "sm",
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  options: string[];
  allLabel?: string;
  size?: "sm" | "md";
}) => (
  <div className="space-y-1">
    <label className={`${size === 'sm' ? 'text-xs' : 'text-sm'} font-medium text-muted-foreground`}>{label}</label>
    <Select value={value ?? "__all__"} onValueChange={(v) => onChange(v === "__all__" ? null : v)}>
      <SelectTrigger className={`${size === 'sm' ? 'h-8 text-xs' : 'h-10 text-sm'}`}>
        <SelectValue placeholder={allLabel} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all__">{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>{o}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategoria = searchParams.get("categoria");
  const activeCatMeta = CONTENT_CATEGORIES.find(c => c.id === activeCategoria);

  const [articles, setArticles] = useState<Article[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [timeWindowDays, setTimeWindowDays] = useState(1);
  const [translationMode, setTranslationMode] = useState<"auto" | "pt" | "original">("pt");
  const [bookmarks, setBookmarks] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("reconnews-bookmarks");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const configError = supabaseConfigError;

  const ITEMS_PER_PAGE = 18;

  // Bookmark functions
  const toggleBookmark = useCallback((articleId: string) => {
    setBookmarks(prev => {
      const next = new Set(prev);
      if (next.has(articleId)) {
        next.delete(articleId);
        toast({ title: "Removido dos favoritos" });
      } else {
        next.add(articleId);
        toast({ title: "Salvo nos favoritos ⭐" });
      }
      localStorage.setItem("reconnews-bookmarks", JSON.stringify([...next]));
      return next;
    });
  }, [toast]);

  const shareArticle = useCallback(async (title: string, url: string) => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copiado! 📋" });
    }
  }, [toast]);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    if (!supabase) {
      setArticles([]);
      setLoading(false);
      return;
    }
    try {
      const runFetch = async (days: number) => {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        let query = supabase
          .from("articles")
          .select("*")
          .gte("scraped_at", cutoff)
          .order("scraped_at", { ascending: false })
          .order("published_at", { ascending: false })
          .limit(500);

        if (selectedRegion) query = query.eq("region", selectedRegion);
        if (selectedEvidence) query = query.eq("evidence_type", selectedEvidence);
        if (selectedTheme) query = query.eq("theme", selectedTheme);

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      };

      const d1 = await runFetch(1);
      if (d1.length < 30) {
        const d7 = await runFetch(7);
        if (d7.length > d1.length) {
          setTimeWindowDays(7);
          setArticles(d7);
        } else {
          setTimeWindowDays(1);
          setArticles(d1);
        }
      } else {
        setTimeWindowDays(1);
        setArticles(d1);
      }
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
  }, [selectedRegion, selectedEvidence, selectedTheme, toast]);

  useEffect(() => {
    fetchArticles();
    setCurrentPage(1);
  }, [fetchArticles]);

  useEffect(() => {
    if (!configError) return;
    toast({
      title: "Configuração do site incompleta",
      description: configError,
      variant: "destructive",
    });
  }, [configError, toast]);

  const sources = useMemo(() => Array.from(new Set(articles.map(a => a.source))), [articles]);
  const categories = useMemo(() => {
    return Array.from(new Set(articles.map(a => a.category).filter((c): c is string => !!c && !HIDDEN_CATEGORIES.has(c))));
  }, [articles]);

  // Deduplicação: normaliza o título para agrupar versões pt/en da mesma notícia
  const deduplicatedArticles = useMemo(() => {
    const normalize = (s: string) =>
      s.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9 ]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    const seen = new Map<string, Article>();
    for (const a of articles) {
      const key = normalize(a.title_pt || a.title);
      // Mantém apenas o primeiro artigo com título equivalente
      if (!seen.has(key)) {
        seen.set(key, a);
      }
    }
    return Array.from(seen.values());
  }, [articles]);

  // Filtragem client-side
  useEffect(() => {
    let result = [...deduplicatedArticles];

    // Apply content category filter from navbar
    if (activeCategoria && CATEGORY_KEYWORDS[activeCategoria]) {
      result = result.filter(a => matchesCategory(a, activeCategoria));
    }

    const q = (searchQuery || '').trim().toLowerCase();
    if (q) {
      result = result.filter(a => (
        `${a.title} ${a.description || ''} ${a.title_pt || ''} ${a.description_pt || ''}`
          .toLowerCase()
          .includes(q)
      ));
    }

    if (selectedSource) result = result.filter(a => a.source === selectedSource);
    if (selectedCategory) result = result.filter(a => a.category === selectedCategory);

    setFilteredArticles(result);
    setCurrentPage(1);
  }, [deduplicatedArticles, searchQuery, selectedSource, selectedCategory, activeCategoria]);

  const totalPages = Math.max(1, Math.ceil(filteredArticles.length / ITEMS_PER_PAGE));

  // Featured article is the first one; remaining go to the grid
  const featuredArticle = useMemo(() =>
    currentPage === 1 && filteredArticles.length > 0 ? filteredArticles[0] : null,
    [filteredArticles, currentPage]);

  const paginatedArticles = useMemo(() => {
    const offset = currentPage === 1 ? 1 : 0; // skip featured on page 1
    const start = (currentPage - 1) * ITEMS_PER_PAGE + offset;
    return filteredArticles.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredArticles, currentPage]);

  const hasAnyTranslation = useMemo(() => {
    return filteredArticles.some(
      (a) => !!(a.title_pt || a.description_pt || a.extended_summary_pt)
    );
  }, [filteredArticles]);

  const latestScrapedAt = useMemo(() => {
    if (articles.length === 0) return null;
    return articles[0].scraped_at;
  }, [articles]);

  const clearFilters = () => {
    setSelectedSource(null);
    setSelectedCategory(null);
    setSelectedRegion(null);
    setSelectedEvidence(null);
    setSelectedTheme(null);
    setSearchQuery("");
    if (activeCategoria) {
      setSearchParams({});
    }
  };

  const MobileFilters = () => (
    <div className="flex items-center gap-2">
      <div className="hidden sm:flex">
        <TranslationToggle
          translationMode={translationMode}
          hasAnyTranslation={hasAnyTranslation}
          onModeChange={setTranslationMode}
        />
      </div>
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
            <TranslationToggle
              translationMode={translationMode}
              hasAnyTranslation={hasAnyTranslation}
              onModeChange={setTranslationMode}
            />
            <div className="grid grid-cols-1 gap-3">
              <FilterSelect label="Fonte" value={selectedSource} onChange={setSelectedSource} options={sources} />
              <FilterSelect label="Categoria" value={selectedCategory} onChange={setSelectedCategory} options={categories} />
              <FilterSelect label="Região/Civilizações" value={selectedRegion} onChange={setSelectedRegion} options={REGIONS_CIVILIZATIONS} />
              <FilterSelect label="Tipo de Evidência" value={selectedEvidence} onChange={setSelectedEvidence} options={EVIDENCE_TYPES} />
              <FilterSelect label="Tema" value={selectedTheme} onChange={setSelectedTheme} options={THEMES} allLabel="Todos" />
            </div>
          </div>
          <DrawerFooter className="mt-4">
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={clearFilters}>Limpar filtros</Button>
              <DrawerClose asChild>
                <Button size="sm">Aplicar</Button>
              </DrawerClose>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );

  const DesktopFilters = () => (
    <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
      <div className="flex items-center gap-2">
        <TranslationToggle
          translationMode={translationMode}
          hasAnyTranslation={hasAnyTranslation}
          onModeChange={setTranslationMode}
        />
        <Button variant="outline" size="default" className="gap-1" onClick={() => setFiltersOpen(!filtersOpen)}>
          <Filter className="h-4 w-4" />
          Filtros
          {filtersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>
      <CollapsibleContent className="mt-4 grid grid-cols-3 gap-4">
        <div className="col-span-3">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
        </div>
        <FilterSelect label="Fonte" value={selectedSource} onChange={setSelectedSource} options={sources} size="md" />
        <FilterSelect label="Categoria" value={selectedCategory} onChange={setSelectedCategory} options={categories} size="md" />
        <FilterSelect label="Região/Civilizações" value={selectedRegion} onChange={setSelectedRegion} options={REGIONS_CIVILIZATIONS} size="md" />
        <FilterSelect label="Tipo de Evidência" value={selectedEvidence} onChange={setSelectedEvidence} options={EVIDENCE_TYPES} size="md" />
        <FilterSelect label="Tema" value={selectedTheme} onChange={setSelectedTheme} options={THEMES} allLabel="Todos" size="md" />
        <div className="col-span-3 flex items-center justify-start gap-2">
          <Button variant="outline" size="default" onClick={clearFilters}>Limpar filtros</Button>
          <Button size="default" onClick={() => setFiltersOpen(false)}>Aplicar</Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );

  return (
    <div className="min-h-screen bg-background">

      {/* Dynamic Hero Section */}
      <header className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-accent text-primary-foreground py-16 md:py-20 px-4">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)]" />
        <div className="container mx-auto max-w-7xl relative">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <img src="/android-chrome-512x512.png" alt="ReconNews Logo" className="h-14 w-14 md:h-16 md:w-16 rounded-xl shadow-lg" />
              <div>
                <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
                  {activeCatMeta ? activeCatMeta.label : "ReconNews Brasil"}
                </h1>
                <p className="text-primary-foreground/80 text-sm md:text-lg font-medium mt-1">
                  {activeCatMeta
                    ? `${activeCatMeta.emoji} Filtrando notícias por categoria`
                    : "Cristianismo, arqueologia, liberdade religiosa, saúde e natureza"}
                </p>
              </div>
            </div>


          </div>

          {/* Search in hero */}
          <div className="mt-6 max-w-xl">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Buscar notícias..."
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto max-w-7xl px-4">
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {activeCatMeta ? activeCatMeta.label : "Explorar Notícias"}
            </h2>
            {isMobile ? <MobileFilters /> : <DesktopFilters />}
          </div>

          {/* Active category badge */}
          {activeCatMeta && (
            <div className="flex items-center gap-2 mt-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-sm font-medium text-primary">
                {activeCatMeta.emoji} {activeCatMeta.label}
                <button
                  onClick={() => setSearchParams({})}
                  className="ml-1 rounded-full p-0.5 hover:bg-primary/20 transition-colors"
                  title="Remover filtro"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            </div>
          )}

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              {filteredArticles.length} resultados (últimos {timeWindowDays} {timeWindowDays === 1 ? "dia" : "dias"})
            </p>
          </div>

          <Separator className="my-4" />

          {/* Articles */}
          {loading ? (
            <div className="space-y-6">
              <Skeleton className="h-64 w-full rounded-lg" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-video w-full rounded-lg" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ))}
              </div>
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
                {configError
                  ? "O site está online, mas sem conexão com o banco de notícias. Ajuste as variáveis de ambiente no deploy."
                  : searchQuery || selectedCategory || selectedSource || selectedRegion || selectedEvidence || selectedTheme
                    ? "Tente ajustar seus filtros ou busca"
                    : "As notícias são coletadas automaticamente a partir de fontes públicas"}
              </p>
            </div>
          ) : (
            <>
              {/* Featured Article */}
              {featuredArticle && (
                <div className="mb-8">
                  <FeaturedCard
                    title={featuredArticle.title}
                    description={featuredArticle.description || undefined}
                    titlePt={featuredArticle.title_pt || undefined}
                    descriptionPt={featuredArticle.description_pt || undefined}
                    fullDescriptionPt={featuredArticle.extended_summary_pt || undefined}
                    translationMode={translationMode}
                    url={featuredArticle.url}
                    source={featuredArticle.source}
                    publishedAt={featuredArticle.published_at || undefined}
                    imageUrl={featuredArticle.image_url || undefined}
                    category={featuredArticle.category || undefined}
                  />
                </div>
              )}

              {/* Article Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedArticles.map((article) => (
                  <div key={article.id} className="relative group/actions">
                    <ArticleCard
                      title={article.title}
                      description={article.description || undefined}
                      titlePt={article.title_pt || undefined}
                      descriptionPt={article.description_pt || undefined}
                      fullDescriptionPt={article.extended_summary_pt || undefined}
                      translationProvider={article.translation_provider || undefined}
                      translationMode={translationMode}
                      url={article.url}
                      source={article.source}
                      publishedAt={article.published_at || undefined}
                      imageUrl={article.image_url || undefined}
                      category={article.category || undefined}
                    />
                    {/* Share & Bookmark overlay */}
                    <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover/actions:opacity-100 transition-opacity duration-200 z-10">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 rounded-full shadow-md bg-background/80 backdrop-blur-sm hover:bg-background"
                        onClick={(e) => { e.stopPropagation(); shareArticle(article.title, article.url); }}
                        title="Compartilhar"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 rounded-full shadow-md bg-background/80 backdrop-blur-sm hover:bg-background"
                        onClick={(e) => { e.stopPropagation(); toggleBookmark(article.id); }}
                        title={bookmarks.has(article.id) ? "Remover favorito" : "Salvar"}
                      >
                        {bookmarks.has(article.id) ? (
                          <BookmarkCheck className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <Bookmark className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            </>
          )}
        </div>
      </main>

      {/* Redesigned Footer */}
      <footer className="bg-gradient-to-b from-background to-muted/30 border-t border-border mt-20 py-12">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <img src="/favicon-32x32.png" alt="ReconNews Logo" className="h-8 w-8 rounded-md" />
                <h4 className="font-bold text-lg">ReconNews</h4>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Agregador automático de notícias sobre fé cristã, liberdade religiosa, saúde, bem‑estar e natureza.
              </p>
            </div>

            {/* Navegação */}
            <div>
              <h4 className="font-semibold text-sm mb-3">NAVEGAÇÃO</h4>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>
                  <Link to="/" className="hover:text-primary transition-colors">📰 Todas as Notícias</Link>
                </li>
                {CONTENT_CATEGORIES.map(cat => (
                  <li key={cat.id}>
                    {cat.id === "exercicios" ? (
                      <Link to="/exercicios" className="hover:text-primary transition-colors">
                        {cat.emoji} {cat.label}
                      </Link>
                    ) : (
                      <Link to={`/?categoria=${cat.id}`} className="hover:text-primary transition-colors">
                        {cat.emoji} {cat.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Cobertura — links funcionais */}
            <div>
              <h4 className="font-semibold text-sm mb-3">COBERTURA</h4>
              <ul className="text-sm text-muted-foreground space-y-2">
                {CONTENT_CATEGORIES.map(cat => (
                  <li key={cat.id}>
                    {cat.id === "exercicios" ? (
                      <Link to="/exercicios" className="hover:text-primary transition-colors">
                        ✓ {cat.label}
                      </Link>
                    ) : (
                      <Link to={`/?categoria=${cat.id}`} className="hover:text-primary transition-colors">
                        ✓ {cat.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <Separator className="mb-6" />

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} ReconNews • Todas as notícias são coletadas de fontes públicas</p>
            {latestScrapedAt && (
              <p className="flex items-center gap-1.5 text-xs">
                <Clock className="h-3.5 w-3.5" />
                Última coleta: {new Date(latestScrapedAt).toLocaleString("pt-BR")}
              </p>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
