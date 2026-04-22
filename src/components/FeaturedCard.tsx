import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { decodeHTML, sanitizeSummary, toProxyImage } from "@/lib/utils";

interface FeaturedCardProps {
  title: string;
  description?: string;
  titlePt?: string;
  descriptionPt?: string;
  fullDescriptionPt?: string;
  translationMode?: "auto" | "pt" | "original";
  url: string;
  source: string;
  publishedAt?: string;
  imageUrl?: string;
  category?: string;
}

const isInvalidTranslation = (s?: string) => {
  const t = (s || "").toLowerCase();
  return (
    t.includes("invalid source language") ||
    t.includes("example: langpair=") ||
    t.includes("max allowed query") ||
    t.includes("500 chars") ||
    t.includes("some may have no content")
  );
};

export const FeaturedCard = ({
  title,
  description,
  titlePt,
  descriptionPt,
  fullDescriptionPt,
  translationMode = "auto",
  url,
  source,
  publishedAt,
  imageUrl,
  category,
}: FeaturedCardProps) => {
  const pickByMode = (pt?: string, original?: string) => {
    if (translationMode === "pt") return pt ?? original ?? "";
    if (translationMode === "original") return original ?? pt ?? "";
    return pt && !isInvalidTranslation(pt) ? pt : (original ?? "");
  };

  const displayTitle = decodeHTML(
    pickByMode(
      titlePt && !isInvalidTranslation(titlePt) ? titlePt : undefined,
      title
    )
  );

  const rawDescription = pickByMode(
    descriptionPt && !isInvalidTranslation(descriptionPt) ? descriptionPt : undefined,
    description
  );
  const displayDescription = sanitizeSummary(rawDescription) || rawDescription || undefined;

  const formattedDate = publishedAt
    ? format(new Date(publishedAt), "dd 'de' MMMM, yyyy", { locale: ptBR })
    : null;

  const proxiedImage = imageUrl
    ? toProxyImage(imageUrl, { width: 1200, height: 600, fit: "cover", output: "webp", dpr: 2 })
    : undefined;

  return (
    <Card className="group sanctuary-card overflow-hidden rounded-[1.75rem] border border-border/30 transition-all duration-500 hover:-translate-y-1 hover:shadow-[var(--shadow-elevated)]">
      <a href={url} target="_blank" rel="noopener noreferrer" className="block">
        <div className="grid gap-0 md:grid-cols-2">
          <div className="relative aspect-video overflow-hidden md:aspect-auto">
            {imageUrl ? (
              <>
                <img
                  src={proxiedImage || imageUrl}
                  alt={title}
                  loading="eager"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder.svg";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/70 via-primary/15 to-transparent" />
              </>
            ) : (
              <img src="/placeholder.svg" alt="Imagem indisponivel" className="h-full w-full object-cover" />
            )}
            {category && (
              <div className="absolute left-4 top-4">
                <Badge className="border-0 bg-accent px-3 py-1 text-sm text-accent-foreground shadow-lg">
                  Destaque
                </Badge>
              </div>
            )}
          </div>

          <div className="flex flex-col justify-center space-y-4 p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-2">
              {category && (
                <Badge variant="outline" className="rounded-full border-secondary/20 bg-amber-50 text-xs font-semibold text-secondary">
                  {category}
                </Badge>
              )}
              <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/5 text-xs font-semibold">
                {source}
              </Badge>
            </div>

            <h2 className="text-2xl font-extrabold leading-tight text-foreground transition-colors group-hover:text-secondary md:text-3xl">
              {displayTitle}
            </h2>

            {displayDescription && (
              <p className="line-clamp-4 leading-relaxed text-muted-foreground">
                {displayDescription}
              </p>
            )}

            <div className="flex items-center justify-between rounded-2xl bg-muted/45 px-3 py-3">
              {formattedDate && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{formattedDate}</span>
                </div>
              )}
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-secondary transition-all group-hover:gap-2">
                Ler materia completa
                <ExternalLink className="h-4 w-4" />
              </span>
            </div>
          </div>
        </div>
      </a>
    </Card>
  );
};
