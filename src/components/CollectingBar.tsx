import { Progress } from "@/components/ui/progress";
import { Zap } from "lucide-react";

interface CollectingBarProps {
  progress: number;
  isCollecting: boolean;
}

export const CollectingBar = ({ progress, isCollecting }: CollectingBarProps) => {
  if (!isCollecting && progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-primary via-accent to-primary animate-pulse">
      <div className="container mx-auto max-w-7xl px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 min-w-fit">
            <Zap className="h-5 w-5 text-primary-foreground animate-bounce" />
            <span className="text-sm font-bold text-primary-foreground">
              COLETANDO PODER
            </span>
          </div>
          <div className="flex-1 relative">
            <Progress 
              value={progress} 
              className="h-3 bg-primary-foreground/20"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-primary-foreground drop-shadow-lg">
                {Math.round(progress)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
