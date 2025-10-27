import { TrendingUp, Newspaper, Clock, Award } from "lucide-react";
import { Card } from "@/components/ui/card";

interface StatsBarProps {
  totalArticles: number;
  todayArticles: number;
  sources: number;
  lastUpdate?: string;
}

export const StatsBar = ({ totalArticles, todayArticles, sources, lastUpdate }: StatsBarProps) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card className="p-3 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Newspaper className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground leading-none">{totalArticles}</p>
            <p className="text-xs text-muted-foreground">Total de Notícias</p>
          </div>
        </div>
      </Card>

      <Card className="p-3 bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-accent/10">
            <TrendingUp className="h-4 w-4 text-accent" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground leading-none">{todayArticles}</p>
            <p className="text-xs text-muted-foreground">Hoje</p>
          </div>
        </div>
      </Card>

      <Card className="p-3 bg-gradient-to-br from-secondary/20 to-secondary/10 border-secondary/20">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-secondary/20">
            <Award className="h-4 w-4 text-secondary-foreground" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground leading-none">{sources}</p>
            <p className="text-xs text-muted-foreground">Fontes</p>
          </div>
        </div>
      </Card>

      <Card className="p-3 bg-gradient-to-br from-muted/50 to-muted/20 border-border">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-muted">
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground leading-none">5x ao dia</p>
            <p className="text-xs text-muted-foreground">Atualização automática</p>
          </div>
        </div>
      </Card>
    </div>
  );
};
