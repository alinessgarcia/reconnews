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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Newspaper className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{totalArticles}</p>
            <p className="text-xs text-muted-foreground">Total de Notícias</p>
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent/10">
            <TrendingUp className="h-5 w-5 text-accent" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{todayArticles}</p>
            <p className="text-xs text-muted-foreground">Hoje</p>
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-gradient-to-br from-secondary/20 to-secondary/10 border-secondary/20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-secondary/20">
            <Award className="h-5 w-5 text-secondary-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{sources}</p>
            <p className="text-xs text-muted-foreground">Fontes</p>
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-gradient-to-br from-muted/50 to-muted/20 border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted">
            <Clock className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">10:00 & 22:00</p>
            <p className="text-xs text-muted-foreground">Atualização</p>
          </div>
        </div>
      </Card>
    </div>
  );
};
