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
    const t = (s || '').toLowerCase();
    return (
        t.includes('invalid source language') ||
        t.includes('example: langpair=') ||
        t.includes('max allowed query') ||
        t.includes('500 chars') ||
        t.includes('some may have no content')
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
        return (pt && !isInvalidTranslation(pt)) ? pt : (original ?? "");
    };

    const displayTitle = decodeHTML(
        pickByMode(
            (titlePt && !isInvalidTranslation(titlePt)) ? titlePt : undefined,
            title
        )
    );

    const rawDescription = pickByMode(
        (descriptionPt && !isInvalidTranslation(descriptionPt)) ? descriptionPt : undefined,
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
        <Card className="group overflow-hidden transition-all duration-500 hover:shadow-[var(--shadow-elevated)] shadow-[var(--shadow-card)] border-border hover:border-primary/30 bg-gradient-to-b from-card to-card/95">
            <a href={url} target="_blank" rel="noopener noreferrer" className="block">
                <div className="grid md:grid-cols-2 gap-0">
                    {/* Image */}
                    <div className="relative aspect-video md:aspect-auto overflow-hidden bg-gradient-to-br from-muted via-muted to-muted/70">
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
                                <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
                            </>
                        ) : (
                            <img src="/placeholder.svg" alt="Imagem indisponível" className="h-full w-full object-cover" />
                        )}
                        {category && (
                            <div className="absolute top-4 left-4">
                                <Badge className="bg-primary text-white border-0 shadow-lg text-sm px-3 py-1">
                                    ⭐ Destaque
                                </Badge>
                            </div>
                        )}
                    </div>

                    {/* Content */}
                    <div className="p-6 md:p-8 flex flex-col justify-center space-y-4">
                        <div className="flex items-center gap-2 flex-wrap">
                            {category && (
                                <Badge variant="outline" className="text-xs font-medium border-primary/30 text-primary">
                                    {category}
                                </Badge>
                            )}
                            <Badge variant="outline" className="text-xs font-medium">
                                {source}
                            </Badge>
                        </div>

                        <h2 className="text-2xl md:text-3xl font-bold leading-tight text-foreground group-hover:text-primary transition-colors">
                            {displayTitle}
                        </h2>

                        {displayDescription && (
                            <p className="text-muted-foreground leading-relaxed line-clamp-4">
                                {displayDescription}
                            </p>
                        )}

                        <div className="flex items-center justify-between pt-4 border-t border-border">
                            {formattedDate && (
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                    <Calendar className="h-4 w-4" />
                                    <span>{formattedDate}</span>
                                </div>
                            )}
                            <span className="text-sm font-medium text-primary inline-flex items-center gap-1.5 group-hover:gap-2 transition-all">
                                Ler matéria completa
                                <ExternalLink className="h-4 w-4" />
                            </span>
                        </div>
                    </div>
                </div>
            </a>
        </Card>
    );
};
