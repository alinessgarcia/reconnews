import { Card } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { decodeHTML, sanitizeSummary, toProxyImage } from "@/lib/utils";

// Detecta respostas de erro da API de tradução
const isInvalidTranslation = (s?: string) => {
  const t = (s || '').toLowerCase();
  return (
    t.includes('invalid source language') ||
    t.includes('example: langpair=') ||
    t.includes('max allowed query') ||
    t.includes('500 chars') ||
    t.includes('some may have no content')
  );
};

interface ArticleCardProps {
  title: string;
  description?: string;
  titlePt?: string;
  descriptionPt?: string;
  fullDescriptionPt?: string;
  translationProvider?: string;
  translationMode?: "auto" | "pt" | "original";
  url: string;
  source: string;
  publishedAt?: string;
  imageUrl?: string;
  category?: string;
}

// Sub-componente para o toggle de idioma (elimina duplicação)
const LanguageToggle = ({
  effectiveMode,
  hasTranslation,
  onModeChange,
}: {
  effectiveMode: "auto" | "pt" | "original";
  hasTranslation: boolean;
  onModeChange: (mode: "auto" | "pt" | "original") => void;
}) => (
  <div className="flex items-center gap-2">
    <span className="text-xs text-muted-foreground">Idioma:</span>
    <div className="flex rounded-md border border-border overflow-hidden">
      <button
        className={`px-2 py-1 text-xs ${effectiveMode === 'auto' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
        onClick={() => onModeChange('auto')}
      >Auto</button>
      <button
        className={`px-2 py-1 text-xs ${effectiveMode === 'pt' ? 'bg-primary text-primary-foreground' : 'bg-muted'} ${!hasTranslation ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={() => hasTranslation && onModeChange('pt')}
        disabled={!hasTranslation}
        title={hasTranslation ? 'Mostrar tradução' : 'Tradução indisponível'}
      >PT-BR</button>
      <button
        className={`px-2 py-1 text-xs ${effectiveMode === 'original' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
        onClick={() => onModeChange('original')}
      >Original</button>
    </div>
  </div>
);

// Sub-componente para o dialog de resumo (elimina duplicação)
const SummaryDialog = ({
  trigger,
  displayTitle,
  source,
  formattedDate,
  effectiveMode,
  hasTranslation,
  onModeChange,
  proxiedImage,
  imageUrl,
  altText,
  displayFull,
  url,
}: {
  trigger: React.ReactNode;
  displayTitle: string;
  source: string;
  formattedDate: string | null;
  effectiveMode: "auto" | "pt" | "original";
  hasTranslation: boolean;
  onModeChange: (mode: "auto" | "pt" | "original") => void;
  proxiedImage?: string;
  imageUrl?: string;
  altText: string;
  displayFull?: string;
  url: string;
}) => (
  <Dialog>
    {trigger}
    <DialogContent className="max-h-[85vh] overflow-y-auto rounded-3xl border-border/40 bg-card/95 p-0 sm:max-w-xl">
      <div className="space-y-4 p-6">
      <DialogHeader>
        <DialogTitle>{displayTitle}</DialogTitle>
        {source && (
          <DialogDescription>
            Fonte: {source}{formattedDate ? ` • ${formattedDate}` : ''}
          </DialogDescription>
        )}
      </DialogHeader>
      <div className="flex items-center justify-end gap-2 mb-2">
        <LanguageToggle
          effectiveMode={effectiveMode}
          hasTranslation={hasTranslation}
          onModeChange={onModeChange}
        />
      </div>
      {imageUrl && (
        <img
          src={proxiedImage || imageUrl}
          alt={altText}
          className="w-full h-auto rounded-md"
        />
      )}
      {displayFull ? (
        <p className="text-sm text-foreground leading-relaxed">
          {displayFull}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Este artigo não fornece resumo adequado via RSS. Use "Abrir original" para ler na fonte.
        </p>
      )}
      <DialogFooter className="gap-2">
        <a href={url} target="_blank" rel="noopener noreferrer">
          <Button size="sm">Abrir original</Button>
        </a>
      </DialogFooter>
      </div>
    </DialogContent>
  </Dialog>
);

export const ArticleCard = ({
  title,
  description,
  titlePt,
  descriptionPt,
  fullDescriptionPt,
  translationProvider,
  translationMode = "auto",
  url,
  source,
  publishedAt,
  imageUrl,
  category,
}: ArticleCardProps) => {
  const [localMode, setLocalMode] = useState<"auto" | "pt" | "original" | null>(null);
  const effectiveMode = localMode ?? translationMode;
  const [clientTitlePt, setClientTitlePt] = useState<string | undefined>(undefined);
  const [clientDescPt, setClientDescPt] = useState<string | undefined>(undefined);
  const hasTranslation = Boolean(titlePt || descriptionPt || fullDescriptionPt || clientTitlePt || clientDescPt);
  const formattedDate = publishedAt
    ? format(new Date(publishedAt), "dd 'de' MMMM, yyyy", { locale: ptBR })
    : null;

  const pickByMode = (pt?: string, original?: string) => {
    if (effectiveMode === "pt") return pt ?? original ?? "";
    if (effectiveMode === "original") return original ?? pt ?? "";
    return (pt && !isInvalidTranslation(pt)) ? pt : (original ?? "");
  };

  const displayTitle = decodeHTML(pickByMode(((titlePt && !isInvalidTranslation(titlePt)) ? titlePt : clientTitlePt), title));
  const rawDescription = pickByMode(((descriptionPt && !isInvalidTranslation(descriptionPt)) ? descriptionPt : clientDescPt), description);
  const sanitized = sanitizeSummary(rawDescription);
  const displayDescription = sanitized && sanitized.length > 0 ? sanitized : (rawDescription || undefined);

  const rawFull = pickByMode((fullDescriptionPt && !isInvalidTranslation(fullDescriptionPt)) ? fullDescriptionPt : undefined, undefined) || rawDescription;
  const sanitizedFull = sanitizeSummary(rawFull);
  const displayFull = sanitizedFull && sanitizedFull.length > 0 ? sanitizedFull : (rawFull || undefined);
  
  const proxiedImage = imageUrl ? toProxyImage(imageUrl, { width: 800, height: 450, fit: 'cover', output: 'webp', dpr: 2 }) : undefined;

  useEffect(() => {
    const need = effectiveMode === 'pt' && !(titlePt || descriptionPt) && (title || description);
    if (!need) return;
    const translate = async (text: string) => {
      try {
        const res = await fetch('https://libretranslate.com/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: text, source: 'auto', target: 'pt', format: 'text' })
        });
        if (!res.ok) return text;
        const data = await res.json();
        const t = data?.translatedText || text;
        if (isInvalidTranslation(t)) return text;
        return t;
      } catch {
        return text;
      }
    };
    (async () => {
      if (title) setClientTitlePt(await translate(title));
      if (description) setClientDescPt(await translate(description));
    })();
  }, [effectiveMode, title, description, titlePt, descriptionPt]);

  const HIDDEN_CATEGORIES = new Set(['Portal Evangélico', 'Notícias Evangélicas']);

  const getCategoryColor = (category?: string) => {
    if (!category) return "bg-muted";
    const colors: Record<string, string> = {
      "Descobertas Arqueológicas": "bg-accent",
      "Manuscritos Antigos": "bg-primary",
      "Cidades Bíblicas": "bg-orange-500",
      "Personagens Bíblicos": "bg-purple-500",
      "Achados Científicos": "bg-blue-500",
      "Pesquisadores e Estudos": "bg-green-500",
      "Livros Históricos": "bg-amber-500",
      "Arqueologia Cristã": "bg-rose-500",
      "Perseguição Religiosa": "bg-red-600",
      "Liberdade Religiosa": "bg-indigo-600",
      "Saúde e Bem-Estar": "bg-emerald-600",
      "Alimentos Saudáveis": "bg-lime-600",
      "Exercícios 40+": "bg-sky-600",
      "Natureza e Meio Ambiente": "bg-teal-600",
      "Plantas Medicinais": "bg-green-700",
      "Mundo Cristão": "bg-cyan-600",
    };
    return colors[category] || "bg-primary";
  };

  // Props compartilhadas para os dialogs de resumo
  const dialogProps = {
    displayTitle,
    source,
    formattedDate,
    effectiveMode,
    hasTranslation,
    onModeChange: setLocalMode as (mode: "auto" | "pt" | "original") => void,
    proxiedImage,
    imageUrl,
    altText: title,
    displayFull,
    url,
  };

  return (
    <Card className="group sanctuary-card overflow-hidden rounded-[1.5rem] border border-border/30 transition-all duration-500 hover:-translate-y-1 hover:shadow-[var(--shadow-card-hover)]">
      <div className="block h-full">
        <div className="relative aspect-video overflow-hidden rounded-t-[1.5rem] bg-gradient-to-br from-muted via-muted/80 to-muted/60">
          {imageUrl ? (
            <>
              <img
                src={proxiedImage || imageUrl}
                alt={title}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    parent.innerHTML = `<img src="/placeholder.svg" alt="Imagem indisponível" class="h-full w-full object-cover" />`;
                  }
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/75 via-primary/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            </>
          ) : (
            <img src="/placeholder.svg" alt="Imagem indisponível" className="h-full w-full object-cover" />
          )}
          {category && !HIDDEN_CATEGORIES.has(category) && (
            <div className="absolute top-3 left-3">
              <Badge className={`${getCategoryColor(category)} border-0 text-white shadow-lg`}>
                {category}
              </Badge>
            </div>
          )}
        </div>
        <div className="space-y-3 p-5">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="rounded-full border-secondary/20 bg-amber-50 text-xs font-semibold text-secondary">
              {source}
            </Badge>
            {(titlePt || descriptionPt || fullDescriptionPt) && (
              <Badge className="rounded-full border-0 bg-primary text-[10px] text-primary-foreground" title={translationProvider ? `Traduzido automaticamente via ${translationProvider}` : "Traduzido automaticamente"}>
                Traduzido
              </Badge>
            )}
          </div>
          
          <h3 className="line-clamp-2 min-h-[3.5rem] font-headline text-lg font-bold leading-tight text-foreground transition-colors group-hover:text-secondary">
            {displayTitle}
          </h3>
          
          <SummaryDialog
            trigger={
              displayDescription ? (
                <DialogTrigger asChild>
                  <p
                    className="line-clamp-3 cursor-pointer text-sm leading-relaxed text-muted-foreground"
                    title="Abrir resumo"
                  >
                    {displayDescription}
                  </p>
                </DialogTrigger>
              ) : (
                <div className="text-sm text-muted-foreground">
                  <span className="italic">Sem resumo via RSS. Clique em "Resumo" para detalhes ou "Ler mais" para abrir o original.</span>
                </div>
              )
            }
            {...dialogProps}
          />
          
          <div className="mt-2 flex items-center justify-between rounded-xl bg-muted/45 px-2 py-2">
            {formattedDate && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>{formattedDate}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary transition-all hover:gap-2"
              >
                <span>Ler mais</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <SummaryDialog
                trigger={
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="rounded-full border-secondary/25 bg-card text-xs hover:bg-amber-50">
                      Resumo
                    </Button>
                  </DialogTrigger>
                }
                {...dialogProps}
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
