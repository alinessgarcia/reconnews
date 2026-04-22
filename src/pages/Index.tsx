import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase, supabaseConfigError } from "@/integrations/supabase/client";
import { ArticleCard } from "@/components/ArticleCard";
import { FeaturedCard } from "@/components/FeaturedCard";
import { SearchBar } from "@/components/SearchBar";
import { Pagination } from "@/components/Pagination";
import { Link, useSearchParams } from "react-router-dom";
import {
  Newspaper,
  Filter,
  ChevronDown,
  ChevronUp,
  Clock,
  Share2,
  Bookmark,
  BookmarkCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { REGIONS_CIVILIZATIONS, EVIDENCE_TYPES, THEMES } from "@/lib/utils";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { useIsMobile } from "@/hooks/use-mobile";
import { CONTENT_CATEGORIES } from "@/components/Navbar";

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  fe: [
    "fé",
    "cristão",
    "cristã",
    "jesus",
    "deus",
    "bíblia",
    "igreja",
    "evangel",
    "pastor",
    "culto",
    "oração",
    "devocional",
    "espirit",
    "gospel",
    "teolog",
    "louvor",
    "pregação",
    "testemunho",
    "salvação",
    "batismo",
    "católic",
    "protestant",
    "doutrina",
    "crente",
    "missão",
    "missionár",
  ],
  liberdade: [
    "liberda",
    "persegui",
    "religiosa",
    "religioso",
    "persecut",
    "freedom",
    "religious",
    "tribunal",
    "lei",
    "direito",
    "constitui",
    "liberdade de culto",
    "intolerância",
    "discrimina",
    "preso por fé",
  ],
  saude: [
    "saúde",
    "saude",
    "bem-estar",
    "aliment",
    "nutri",
    "vitamina",
    "mineral",
    "health",
    "wellness",
    "food",
    "diet",
    "nutrition",
    "saudável",
    "benefício",
    "cura",
    "preven",
    "imunidade",
    "colesterol",
    "diabetes",
    "pressão",
  ],
  natureza: [
    "natureza",
    "planta",
    "medicin",
    "erva",
    "fitoterap",
    "natural",
    "chá de",
    "folha",
    "raiz",
    "herbal",
    "botanical",
    "remédio natural",
    "floresta",
    "biodiversidade",
    "organic",
  ],
  dieta: [
    "dieta",
    "protei",
    "salada",
    "receita",
    "carne",
    "frango",
    "peixe",
    "ovo",
    "legume",
    "verdura",
    "low carb",
    "keto",
    "protein",
    "recipe",
    "meal",
    "calorias",
    "emagre",
    "muscula",
    "whey",
    "suplemento",
    "treino",
  ],
};

function matchesCategory(
  article: { title: string; description?: string; title_pt?: string; description_pt?: string; category?: string },
  catId: string,
): boolean {
  const keywords = CATEGORY_KEYWORDS[catId];
  if (!keywords) return true;
  const text = `${article.title} ${article.description || ""} ${article.title_pt || ""} ${article.description_pt || ""} ${article.category || ""}`.toLowerCase();
  return keywords.some((kw) => text.includes(kw));
}

const HIDDEN_CATEGORIES = new Set(["Portal Evangélico", "Notícias Evangélicas"]);

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

const TranslationToggle = ({
  translationMode,
  hasAnyTranslation,
  onModeChange,
}: {
  translationMode: "auto" | "pt" | "original";
  hasAnyTranslation: boolean;
  onModeChange: (mode: "auto" | "pt" | "original") => void;
}) => (
  <div className="flex items-center gap-2">
    <span className="text-xs font-medium text-muted-foreground">Idioma:</span>
    <div className="flex overflow-hidden rounded-full border border-secondary/20 bg-card">
      <button
        className={`px-2.5 py-1 text-xs ${translationMode === "auto" ? "bg-secondary text-secondary-foreground" : "bg-transparent"}`}
        onClick={() => onModeChange("auto")}
      >
        Auto
      </button>
      <button
        className={`px-2.5 py-1 text-xs ${translationMode === "pt" ? "bg-secondary text-secondary-foreground" : "bg-transparent"} ${!hasAnyTranslation ? "cursor-not-allowed opacity-50" : ""}`}
        onClick={() => hasAnyTranslation && onModeChange("pt")}
        disabled={!hasAnyTranslation}
        title={hasAnyTranslation ? "Mostrar tradução" : "Tradução indisponível"}
      >
        PT-BR
      </button>
      <button
        className={`px-2.5 py-1 text-xs ${translationMode === "original" ? "bg-secondary text-secondary-foreground" : "bg-transparent"}`}
        onClick={() => onModeChange("original")}
      >
        Original
      </button>
    </div>
  </div>
);

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
  <div className="space-y-1.5">
    <label className={`${size === "sm" ? "text-xs" : "text-sm"} font-medium text-muted-foreground`}>{label}</label>
    <Select value={value ?? "__all__"} onValueChange={(v) => onChange(v === "__all__" ? null : v)}>
      <SelectTrigger className={`${size === "sm" ? "h-9 text-xs" : "h-11 text-sm"} rounded-full border-transparent bg-muted/90`}>
        <SelectValue placeholder={allLabel} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all__">{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategoria = searchParams.get("categoria");
  const activeCatMeta = CONTENT_CATEGORIES.find((c) => c.id === activeCategoria);

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
  const [isShowingHistorical, setIsShowingHistorical] = useState(false);
  const [translationMode, setTranslationMode] = useState<"auto" | "pt" | "original">("pt");
  const [bookmarks, setBookmarks] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("reconnews-bookmarks");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const isMobile = useIsMobile();
  const { toast } = useToast();
  const configError = supabaseConfigError;

  const ITEMS_PER_PAGE = 18;

  const toggleBookmark = useCallback(
    (articleId: string) => {
      setBookmarks((prev) => {
        const next = new Set(prev);
        if (next.has(articleId)) {
          next.delete(articleId);
          toast({ title: "Removido dos favoritos" });
        } else {
          next.add(articleId);
          toast({ title: "Salvo nos favoritos" });
        }
        localStorage.setItem("reconnews-bookmarks", JSON.stringify([...next]));
        return next;
      });
    },
    [toast],
  );

  const shareArticle = useCallback(
    async (title: string, url: string) => {
      if (navigator.share) {
        try {
          await navigator.share({ title, url });
        } catch {
          // user canceled share
        }
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: "Link copiado" });
      }
    },
    [toast],
  );

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    setIsShowingHistorical(false);

    if (!supabase) {
      setArticles([]);
      setLoading(false);
      return;
    }

    try {
      const runFetch = async (days?: number) => {
        let query = supabase
          .from("articles")
          .select("*")
          .order("scraped_at", { ascending: false })
          .order("published_at", { ascending: false })
          .limit(500);

        if (typeof days === "number") {
          const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
          query = query.gte("scraped_at", cutoff);
        }

        if (selectedRegion) query = query.eq("region", selectedRegion);
        if (selectedEvidence) query = query.eq("evidence_type", selectedEvidence);
        if (selectedTheme) query = query.eq("theme", selectedTheme);

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      };

      const d1 = await runFetch(1);
      if (d1.length >= 30) {
        setTimeWindowDays(1);
        setArticles(d1);
        return;
      }

      const d7 = await runFetch(7);
      if (d7.length >= 10 || d7.length > d1.length) {
        setTimeWindowDays(7);
        setArticles(d7);
        return;
      }

      const d30 = await runFetch(30);
      if (d30.length > 0) {
        setTimeWindowDays(30);
        setArticles(d30);
        return;
      }

      const historical = await runFetch();
      if (historical.length > 0) {
        setTimeWindowDays(0);
        setIsShowingHistorical(true);
        setArticles(historical);
        return;
      }

      setTimeWindowDays(1);
      setArticles([]);
    } catch (error) {
      console.error("Erro ao buscar artigos:", error);
      toast({
        title: "Erro",
        description: "Nao foi possivel carregar as noticias.",
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
      title: "Configuracao do site incompleta",
      description: configError,
      variant: "destructive",
    });
  }, [configError, toast]);

  const sources = useMemo(() => Array.from(new Set(articles.map((a) => a.source))), [articles]);
  const categories = useMemo(() => {
    return Array.from(
      new Set(articles.map((a) => a.category).filter((c): c is string => !!c && !HIDDEN_CATEGORIES.has(c))),
    );
  }, [articles]);

  const deduplicatedArticles = useMemo(() => {
    const normalize = (s: string) =>
      s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9 ]/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const seen = new Map<string, Article>();

    for (const a of articles) {
      const key = normalize(a.title_pt || a.title);
      if (!seen.has(key)) seen.set(key, a);
    }

    return Array.from(seen.values());
  }, [articles]);

  useEffect(() => {
    let result = [...deduplicatedArticles];

    if (activeCategoria && CATEGORY_KEYWORDS[activeCategoria]) {
      result = result.filter((a) => matchesCategory(a, activeCategoria));
    }

    const q = (searchQuery || "").trim().toLowerCase();
    if (q) {
      result = result.filter((a) => `${a.title} ${a.description || ""} ${a.title_pt || ""} ${a.description_pt || ""}`.toLowerCase().includes(q));
    }

    if (selectedSource) result = result.filter((a) => a.source === selectedSource);
    if (selectedCategory) result = result.filter((a) => a.category === selectedCategory);

    setFilteredArticles(result);
    setCurrentPage(1);
  }, [deduplicatedArticles, searchQuery, selectedSource, selectedCategory, activeCategoria]);

  const totalPages = Math.max(1, Math.ceil(filteredArticles.length / ITEMS_PER_PAGE));

  const featuredArticle = useMemo(
    () => (currentPage === 1 && filteredArticles.length > 0 ? filteredArticles[0] : null),
    [filteredArticles, currentPage],
  );

  const paginatedArticles = useMemo(() => {
    const offset = currentPage === 1 ? 1 : 0;
    const start = (currentPage - 1) * ITEMS_PER_PAGE + offset;
    return filteredArticles.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredArticles, currentPage]);

  const hasAnyTranslation = useMemo(() => {
    return filteredArticles.some((a) => !!(a.title_pt || a.description_pt || a.extended_summary_pt));
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
    if (activeCategoria) setSearchParams({});
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
          <Button variant="outline" size="sm" className="gap-1 rounded-full border-secondary/20 bg-card/70">
            <Filter className="h-4 w-4" />
            Filtros
          </Button>
        </DrawerTrigger>
        <DrawerContent className="rounded-t-3xl border-border/40 p-4">
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
              <FilterSelect
                label="Regiao/Civilizacoes"
                value={selectedRegion}
                onChange={setSelectedRegion}
                options={REGIONS_CIVILIZATIONS}
              />
              <FilterSelect
                label="Tipo de Evidencia"
                value={selectedEvidence}
                onChange={setSelectedEvidence}
                options={EVIDENCE_TYPES}
              />
              <FilterSelect label="Tema" value={selectedTheme} onChange={setSelectedTheme} options={THEMES} allLabel="Todos" />
            </div>
          </div>
          <DrawerFooter className="mt-4">
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={clearFilters} className="rounded-full">
                Limpar
              </Button>
              <DrawerClose asChild>
                <Button size="sm" className="rounded-full">
                  Aplicar
                </Button>
              </DrawerClose>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );

  const DesktopFilters = () => (
    <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
      <div className="flex items-center justify-end gap-2">
        <TranslationToggle
          translationMode={translationMode}
          hasAnyTranslation={hasAnyTranslation}
          onModeChange={setTranslationMode}
        />
        <Button
          variant="outline"
          size="default"
          className="gap-1 rounded-full border-secondary/20 bg-card/70"
          onClick={() => setFiltersOpen(!filtersOpen)}
        >
          <Filter className="h-4 w-4" />
          Filtros
          {filtersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>
      <CollapsibleContent className="mt-4 rounded-2xl bg-muted/55 p-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-3">
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
          </div>
          <FilterSelect label="Fonte" value={selectedSource} onChange={setSelectedSource} options={sources} size="md" />
          <FilterSelect
            label="Categoria"
            value={selectedCategory}
            onChange={setSelectedCategory}
            options={categories}
            size="md"
          />
          <FilterSelect
            label="Regiao/Civilizacoes"
            value={selectedRegion}
            onChange={setSelectedRegion}
            options={REGIONS_CIVILIZATIONS}
            size="md"
          />
          <FilterSelect
            label="Tipo de Evidencia"
            value={selectedEvidence}
            onChange={setSelectedEvidence}
            options={EVIDENCE_TYPES}
            size="md"
          />
          <FilterSelect
            label="Tema"
            value={selectedTheme}
            onChange={setSelectedTheme}
            options={THEMES}
            allLabel="Todos"
            size="md"
          />
          <div className="col-span-3 flex items-center justify-start gap-2 pt-1">
            <Button variant="outline" size="default" onClick={clearFilters} className="rounded-full">
              Limpar filtros
            </Button>
            <Button size="default" onClick={() => setFiltersOpen(false)} className="rounded-full">
              Aplicar
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );

  return (
    <div className="min-h-screen">
      <header className="relative overflow-hidden px-4 pb-14 pt-8 md:px-6 md:pb-20 md:pt-12">
        <div className="absolute inset-0 -z-20 bg-[var(--gradient-hero)]" />
        <div className="absolute inset-0 -z-10 bg-[var(--gradient-hero-glow)]" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_100%,rgba(255,255,255,0.16),transparent_35%)]" />

        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div className="space-y-6 text-white">
            <span className="inline-flex items-center rounded-full border border-amber-200/35 bg-amber-300/20 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-amber-100">
              Curadoria e Coleta Inteligente
            </span>

            <div className="space-y-3">
              <h1 className="text-4xl font-extrabold leading-tight text-white md:text-6xl">
                {activeCatMeta ? activeCatMeta.label : "ReconNews Brasil"}
              </h1>
              <p className="max-w-2xl text-base leading-relaxed text-slate-200 md:text-lg">
                {activeCatMeta
                  ? `${activeCatMeta.emoji} Filtro ativo por categoria com coleta em tempo real.`
                  : "Noticias sobre cristianismo, liberdade religiosa, saude e natureza em um painel editorial moderno."}
              </p>
            </div>

            <div className="max-w-xl">
              <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Buscar noticias, temas e fontes..." />
            </div>

            <div className="flex flex-wrap gap-2">
              <Link to="/" className="rounded-full border border-white/35 bg-white/15 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/25">
                Ver ultimas noticias
              </Link>
              <Link to="/?categoria=fe" className="rounded-full border border-white/35 bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20">
                Fe e Vida Crista
              </Link>
              <Link to="/?categoria=saude" className="rounded-full border border-white/35 bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20">
                Saude e Bem-Estar
              </Link>
              <Link to="/exercicios" className="rounded-full border border-white/35 bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20">
                Exercicios 40+
              </Link>
            </div>
          </div>

          <div className="animate-float-slow rounded-[1.75rem] border border-white/15 bg-white/12 p-6 text-white backdrop-blur-2xl">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-200">Como aproveitar melhor</p>
            <h2 className="mt-2 text-2xl font-extrabold">
              Leia mais rapido com menos ruido
            </h2>
            <ul className="mt-4 space-y-2 text-sm leading-relaxed text-slate-100">
              <li>Use a busca para encontrar assunto, personagem ou tema.</li>
              <li>Aplique filtros para refinar por fonte, regiao e tipo de evidencia.</li>
              <li>Abra o resumo e salve favoritos para revisar depois.</li>
            </ul>
            <div className="mt-5 rounded-xl border border-white/20 bg-white/10 p-3 text-sm">
              <p className="text-slate-200">Atualizacao automatica do feed</p>
              <p className="mt-1 font-semibold text-white">
                {latestScrapedAt
                  ? `Ultima coleta: ${new Date(latestScrapedAt).toLocaleString("pt-BR")}`
                  : "Coleta em andamento..."}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-16">
        <section className="rounded-[1.5rem] border border-border/40 bg-card/80 p-4 shadow-[var(--shadow-card)] backdrop-blur-sm md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                {activeCatMeta ? activeCatMeta.label : "Explorar Noticias"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {isShowingHistorical
                  ? "Mostrando historico completo enquanto novas coletas sao processadas."
                  : latestScrapedAt
                    ? `Ultima atualizacao em ${new Date(latestScrapedAt).toLocaleString("pt-BR")}`
                    : "Atualizando feed automaticamente durante o dia."}
              </p>
            </div>
            {isMobile ? <MobileFilters /> : <DesktopFilters />}
          </div>

          {activeCatMeta && (
            <div className="mt-4 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-secondary/20 bg-amber-50 px-3 py-1 text-sm font-medium text-secondary">
                {activeCatMeta.emoji} {activeCatMeta.label}
                <button
                  onClick={() => setSearchParams({})}
                  className="ml-1 rounded-full p-0.5 transition-colors hover:bg-secondary/10"
                  title="Remover filtro"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            </div>
          )}
        </section>

        <section className="mt-8">
          {loading ? (
            <div className="space-y-6">
              <Skeleton className="h-72 w-full rounded-[1.5rem]" />
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-video w-full rounded-xl" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ))}
              </div>
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="rounded-[1.5rem] border border-border/40 bg-card/80 px-4 py-20 text-center shadow-[var(--shadow-card)]">
              <div className="mb-4 inline-flex rounded-full bg-muted p-4">
                <Newspaper className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-2xl font-bold">Nenhuma noticia encontrada</h3>
              <p className="mx-auto max-w-md text-muted-foreground">
                {configError
                  ? "O site esta online, mas sem conexao com o banco de noticias. Ajuste as variaveis de ambiente no deploy."
                  : searchQuery || selectedCategory || selectedSource || selectedRegion || selectedEvidence || selectedTheme
                    ? "Tente ajustar seus filtros ou busca."
                    : "As noticias sao coletadas automaticamente. Se continuar vazio, execute o workflow News Scraper no GitHub Actions."}
              </p>
            </div>
          ) : (
            <>
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

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {paginatedArticles.map((article) => (
                  <div key={article.id} className="group/actions relative">
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

                    <div className="absolute right-3 top-3 z-10 flex gap-1 opacity-0 transition-opacity duration-200 group-hover/actions:opacity-100">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 rounded-full border border-white/30 bg-white/80 shadow-md backdrop-blur"
                        onClick={(e) => {
                          e.stopPropagation();
                          shareArticle(article.title, article.url);
                        }}
                        title="Compartilhar"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 rounded-full border border-white/30 bg-white/80 shadow-md backdrop-blur"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleBookmark(article.id);
                        }}
                        title={bookmarks.has(article.id) ? "Remover favorito" : "Salvar"}
                      >
                        {bookmarks.has(article.id) ? (
                          <BookmarkCheck className="h-3.5 w-3.5 text-secondary" />
                        ) : (
                          <Bookmark className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </>
          )}
        </section>
      </main>

      <footer className="mt-20 border-t border-border/60 bg-gradient-to-b from-background to-muted/35 py-12">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-8 grid gap-8 md:grid-cols-3">
            <div>
              <div className="mb-3 flex items-center gap-3">
                <img src="/favicon-32x32.png" alt="ReconNews Logo" className="h-8 w-8 rounded-md" />
                <h4 className="text-lg font-bold">ReconNews</h4>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Agregador automatico de noticias sobre fe crista, liberdade religiosa, saude, bem-estar e natureza.
              </p>
            </div>

            <div>
              <h4 className="mb-3 text-sm font-semibold">NAVEGACAO</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link to="/" className="transition-colors hover:text-secondary">
                    Todas as Noticias
                  </Link>
                </li>
                {CONTENT_CATEGORIES.map((cat) => (
                  <li key={cat.id}>
                    {cat.id === "exercicios" ? (
                      <Link to="/exercicios" className="transition-colors hover:text-secondary">
                        {cat.emoji} {cat.label}
                      </Link>
                    ) : (
                      <Link to={`/?categoria=${cat.id}`} className="transition-colors hover:text-secondary">
                        {cat.emoji} {cat.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="mb-3 text-sm font-semibold">COBERTURA</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {CONTENT_CATEGORIES.map((cat) => (
                  <li key={cat.id}>
                    {cat.id === "exercicios" ? (
                      <Link to="/exercicios" className="transition-colors hover:text-secondary">
                        ✓ {cat.label}
                      </Link>
                    ) : (
                      <Link to={`/?categoria=${cat.id}`} className="transition-colors hover:text-secondary">
                        ✓ {cat.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <Separator className="mb-6" />

          <div className="flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground md:flex-row">
            <p>© {new Date().getFullYear()} ReconNews • Todas as noticias sao coletadas de fontes publicas</p>
            {latestScrapedAt && (
              <p className="flex items-center gap-1.5 text-xs">
                <Clock className="h-3.5 w-3.5" />
                Ultima coleta: {new Date(latestScrapedAt).toLocaleString("pt-BR")}
              </p>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
