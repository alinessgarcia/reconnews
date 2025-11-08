import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { decodeHTML, sanitizeSummary, toProxyImage } from "@/lib/utils";

interface ArticleCardProps {
  title: string;
  description?: string;
  titlePt?: string;
  descriptionPt?: string;
  fullDescription?: string;
  fullDescriptionPt?: string;
  translationProvider?: string;
  url: string;
  source: string;
  publishedAt?: string;
  imageUrl?: string;
  category?: string;
}

export const ArticleCard = ({
  title,
  description,
  titlePt,
  descriptionPt,
  fullDescription,
  fullDescriptionPt,
  translationProvider,
  url,
  source,
  publishedAt,
  imageUrl,
  category,
}: ArticleCardProps) => {
  const formattedDate = publishedAt
    ? format(new Date(publishedAt), "dd 'de' MMMM, yyyy", { locale: ptBR })
    : null;

  const displayTitle = decodeHTML(titlePt || title);
  const rawDescription = descriptionPt || description || "";
  const sanitized = sanitizeSummary(rawDescription);
  // Fallback: se a sanitização remover tudo, use o texto bruto para não ficar sem resumo
  const displayDescription = sanitized && sanitized.length > 0 ? sanitized : (rawDescription || undefined);

  // Conteúdo completo do popup (preferir versão traduzida e estendida)
  const rawFull = fullDescriptionPt || fullDescription || rawDescription;
  const sanitizedFull = sanitizeSummary(rawFull);
  const displayFull = sanitizedFull && sanitizedFull.length > 0 ? sanitizedFull : (rawFull || undefined);
  
  // Usa proxy público para evitar bloqueios de hotlink sem usar Storage
  const proxiedImage = imageUrl ? toProxyImage(imageUrl, { width: 800, height: 450, fit: 'cover', output: 'webp', dpr: 2 }) : undefined;

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
    };
    return colors[category] || "bg-primary";
  };

  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-[var(--shadow-elevated)] shadow-[var(--shadow-card)] border-border hover:border-primary/30 bg-gradient-to-b from-card to-card/95">
      <div className="block h-full">
        <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-muted via-muted to-muted/70">
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
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </>
          ) : (
            <img src="/placeholder.svg" alt="Imagem indisponível" className="h-full w-full object-cover" />
          )}
          {category && !new Set(['Portal Evangélico', 'Notícias Evangélicas']).has(category) && (
            <div className="absolute top-3 left-3">
              <Badge className={`${getCategoryColor(category)} text-white border-0 shadow-lg`}>
                {category}
              </Badge>
            </div>
          )}
        </div>
        <div className="p-5 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs font-medium border-primary/30 text-primary">
              {source}
            </Badge>
            {(titlePt || descriptionPt || fullDescriptionPt) && (
              <Badge className="bg-green-600 text-white text-[10px] border-0" title={translationProvider ? `Traduzido automaticamente via ${translationProvider}` : "Traduzido automaticamente"}>
                Traduzido
              </Badge>
            )}
          </div>
          
          <h3 className="font-bold text-lg leading-tight text-foreground group-hover:text-primary transition-colors line-clamp-2 min-h-[3.5rem]">
            {displayTitle}
          </h3>
          
          <Dialog>
            {displayDescription ? (
              <DialogTrigger asChild>
                <p
                  className="text-sm text-muted-foreground leading-relaxed line-clamp-3 cursor-pointer"
                  title="Abrir resumo"
                >
                  {displayDescription}
                </p>
              </DialogTrigger>
            ) : (
              <div className="text-sm text-muted-foreground">
                <span className="italic">Sem resumo via RSS. Clique em "Resumo" para detalhes ou "Ler mais" para abrir o original.</span>
              </div>
            )}
            <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{displayTitle}</DialogTitle>
                {source && (
                  <DialogDescription>
                    Fonte: {source}{formattedDate ? ` • ${formattedDate}` : ''}
                  </DialogDescription>
                )}
              </DialogHeader>
              {imageUrl && (
                <img
                  src={proxiedImage || imageUrl}
                  alt={title}
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
            </DialogContent>
          </Dialog>
          
          <div className="flex items-center justify-between pt-3 border-t border-border">
            {formattedDate && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                <Calendar className="h-3.5 w-3.5" />
                <span>{formattedDate}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-primary inline-flex items-center gap-1.5 hover:gap-2 transition-all"
              >
                <span>Ler mais</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs">
                    Resumo
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{displayTitle}</DialogTitle>
                    {source && (
                      <DialogDescription>
                        Fonte: {source}{formattedDate ? ` • ${formattedDate}` : ''}
                      </DialogDescription>
                    )}
                  </DialogHeader>
                  {imageUrl && (
                    <img
                      src={proxiedImage || imageUrl}
                      alt={title}
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
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
