import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Calendar, Newspaper } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ArticleCardProps {
  title: string;
  description?: string;
  url: string;
  source: string;
  publishedAt?: string;
  imageUrl?: string;
  category?: string;
}

export const ArticleCard = ({
  title,
  description,
  url,
  source,
  publishedAt,
  imageUrl,
  category,
}: ArticleCardProps) => {
  const formattedDate = publishedAt
    ? format(new Date(publishedAt), "dd 'de' MMMM, yyyy", { locale: ptBR })
    : null;

  const getSourceColor = (source: string) => {
    const colors: Record<string, string> = {
      "BBC": "bg-red-500",
      "Galileu": "bg-purple-500",
      "CNN": "bg-blue-500",
      "National Geographic": "bg-yellow-500",
    };
    return colors[source] || "bg-primary";
  };

  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-[var(--shadow-card-hover)] shadow-[var(--shadow-card)] border-border">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <div className="relative aspect-video overflow-hidden bg-muted">
          {imageUrl ? (
            <>
              <img
                src={imageUrl}
                alt={title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </>
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
              <Newspaper className="h-16 w-16 text-muted-foreground/40" />
            </div>
          )}
        </div>
        <div className="p-5 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`${getSourceColor(source)} text-white border-0`}>
              {source}
            </Badge>
            {category && (
              <Badge variant="secondary" className="text-xs">
                {category}
              </Badge>
            )}
          </div>
          
          <h3 className="font-semibold text-lg leading-tight text-foreground group-hover:text-primary transition-colors line-clamp-2">
            {title}
          </h3>
          
          {description && (
            <p className="text-sm text-muted-foreground line-clamp-3">
              {description}
            </p>
          )}
          
          <div className="flex items-center justify-between pt-2 border-t border-border">
            {formattedDate && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>{formattedDate}</span>
              </div>
            )}
            <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </div>
      </a>
    </Card>
  );
};
