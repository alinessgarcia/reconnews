import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter } from "lucide-react";

interface NewsFiltersProps {
  selectedSource: string | null;
  onSourceChange: (source: string | null) => void;
  sources: string[];
}

export const NewsFilters = ({
  selectedSource,
  onSourceChange,
  sources,
}: NewsFiltersProps) => {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Filter className="h-4 w-4" />
        <span>Fonte:</span>
      </div>
      <Button
        variant={selectedSource === null ? "default" : "outline"}
        size="sm"
        onClick={() => onSourceChange(null)}
        className="transition-all duration-200"
      >
        Todas
      </Button>
      {sources.map((source) => (
        <Button
          key={source}
          variant={selectedSource === source ? "default" : "outline"}
          size="sm"
          onClick={() => onSourceChange(source)}
          className="transition-all duration-200"
        >
          {source}
        </Button>
      ))}
    </div>
  );
};
