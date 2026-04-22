import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const SearchBar = ({
  value,
  onChange,
  placeholder = "Buscar por titulo, descricao...",
}: SearchBarProps) => {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 rounded-full border-transparent bg-muted/90 pl-11 text-sm shadow-[var(--shadow-soft)] focus-visible:ring-2 focus-visible:ring-accent"
      />
    </div>
  );
};
