import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Calendar, Newspaper } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { decodeHTML, sanitizeSummary } from "@/lib/utils";

interface ArticleCardProps {
  title: string;
  description?: string;
  titlePt?: string;
  descriptionPt?: string;
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
  const displayDescription = (descriptionPt || description)
    ? sanitizeSummary(descriptionPt || description || "")
    : undefined;

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
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block h-full"
      >
        <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-muted via-muted to-muted/70">
          {imageUrl ? (
            <>
              <img
                src={imageUrl}
                alt={title}
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
          {category && (
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
            {(titlePt || descriptionPt) && (
              <Badge className="bg-green-600 text-white text-[10px] border-0" title={translationProvider ? `Traduzido automaticamente via ${translationProvider}` : "Traduzido automaticamente"}>
                Traduzido
              </Badge>
            )}
          </div>
          
          <h3 className="font-bold text-lg leading-tight text-foreground group-hover:text-primary transition-colors line-clamp-2 min-h-[3.5rem]">
            {displayTitle}
          </h3>
          
          {displayDescription && (
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
              {displayDescription}
            </p>
          )}
          
          <div className="flex items-center justify-between pt-3 border-t border-border">
            {formattedDate && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                <Calendar className="h-3.5 w-3.5" />
                <span>{formattedDate}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-xs font-medium text-primary group-hover:gap-2 transition-all">
              <span>Ler mais</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </div>
          </div>
        </div>
      </a>
    </Card>
  );
};
