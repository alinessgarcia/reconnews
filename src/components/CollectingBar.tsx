import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Zap, CheckCircle, Sparkles } from "lucide-react";

interface CollectingBarProps {
  progress: number;
  isCollecting: boolean;
}

export const CollectingBar = ({ progress, isCollecting }: CollectingBarProps) => {
  const [celebrate, setCelebrate] = useState(false);
  const [confetti, setConfetti] = useState<Array<{ left: number; delay: number; duration: number; size: number; color: string }>>([]);

  useEffect(() => {
    if (isCollecting && progress >= 100) {
      setCelebrate(true);
      // Gerar confete leve
      const colors = ["#34d399", "#22c55e", "#f59e0b", "#3b82f6", "#ef4444", "#a855f7"]; // emerald, green, amber, blue, red, violet
      const pieces = Array.from({ length: 30 }).map(() => ({
        left: Math.random() * 95 + 5,
        delay: Math.random() * 200,
        duration: 800 + Math.random() * 1200,
        size: 6 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
      }));
      setConfetti(pieces);

      const t = setTimeout(() => {
        setCelebrate(false);
        setConfetti([]);
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [isCollecting, progress]);

  if (!isCollecting && progress === 0) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 transition-all ${
        celebrate
          ? "bg-gradient-to-r from-green-600 via-emerald-500 to-green-600 shadow-lg"
          : "bg-gradient-to-r from-primary via-accent to-primary animate-pulse"
      }`}
    >
      {/* Keyframes do confete */}
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-10px) rotate(0deg); opacity: 0.9; }
          100% { transform: translateY(60px) rotate(360deg); opacity: 0; }
        }
      `}</style>
      <div className="container mx-auto max-w-7xl px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 min-w-fit">
            {celebrate ? (
              <CheckCircle className="h-5 w-5 text-primary-foreground animate-bounce" />
            ) : (
              <Zap className="h-5 w-5 text-primary-foreground animate-bounce" />
            )}
            <span className="text-sm font-bold text-primary-foreground">
              Obrigado por Coletar
            </span>
          </div>
          <div className={`flex-1 relative transition-transform ${celebrate ? "scale-[1.05]" : ""}`}>
            <Progress value={progress} className="h-3 bg-primary-foreground/20" />
            {/* Percent label */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-xs font-bold text-primary-foreground drop-shadow-lg">
                {Math.round(progress)}%
              </span>
            </div>
            {/* Success effect overlay */}
            {celebrate && (
              <>
                <div className="absolute inset-0 rounded-md ring-2 ring-white/50 opacity-80 animate-pulse pointer-events-none" />
                <div className="absolute -top-1 -right-1 text-yellow-300 pointer-events-none">
                  <Sparkles className="h-4 w-4 animate-bounce" />
                </div>
                {/* Confete leve */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  {confetti.map((p, i) => (
                    <span
                      key={i}
                      style={{
                        position: "absolute",
                        left: `${p.left}%`,
                        top: 0,
                        width: p.size,
                        height: p.size,
                        backgroundColor: p.color,
                        borderRadius: "2px",
                        animation: `confetti-fall ${p.duration}ms ease-out ${p.delay}ms forwards`,
                        boxShadow: "0 0 4px rgba(0,0,0,0.2)",
                      }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
