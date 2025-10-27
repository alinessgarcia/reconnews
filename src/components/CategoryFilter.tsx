import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
  counts?: Record<string, number>;
}

export const CategoryFilter = ({ 
  categories, 
  selectedCategory, 
  onCategoryChange,
  counts = {}
}: CategoryFilterProps) => {
  return (
    <div className="w-full">
      {/* Mobile: quebra automática em múltiplas linhas */}
      <div className="flex flex-wrap gap-2 pb-2">
        <Button
          variant={selectedCategory === null ? "default" : "outline"}
          size="sm"
          onClick={() => onCategoryChange(null)}
          className="text-xs px-2"
        >
          Todas
          {counts['all'] && (
            <Badge variant="secondary" className="ml-1 bg-background text-[10px] px-1 py-0.5">
              {counts['all']}
            </Badge>
          )}
        </Button>
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            size="sm"
            onClick={() => onCategoryChange(category)}
            className="text-xs px-2"
            title={category}
          >
            {category}
            {counts[category] && (
              <Badge variant="secondary" className="ml-1 bg-background text-[10px] px-1 py-0.5">
                {counts[category]}
              </Badge>
            )}
          </Button>
        ))}
      </div>
    </div>
  );
};
