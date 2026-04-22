import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Sun,
  Moon,
  Menu,
  X,
  Newspaper,
  Dumbbell,
  BookOpen,
  ShieldCheck,
  HeartPulse,
  TreePine,
  Salad,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDarkMode } from "@/hooks/use-dark-mode";
import { cn } from "@/lib/utils";

export const CONTENT_CATEGORIES = [
  { id: "fe", label: "Fe e Vida Crista", icon: BookOpen, emoji: "✝️" },
  { id: "liberdade", label: "Liberdade e Perseguicao Religiosa", icon: ShieldCheck, emoji: "🕊️" },
  { id: "saude", label: "Saude, Bem-Estar e Alimentos", icon: HeartPulse, emoji: "🍎" },
  { id: "exercicios", label: "Dicas de Exercicios 40+", icon: Dumbbell, emoji: "💪" },
  { id: "natureza", label: "Natureza e Plantas Medicinais", icon: TreePine, emoji: "🌿" },
  { id: "dieta", label: "Dieta Proteica e Saladas", icon: Salad, emoji: "🥗" },
];

export const Navbar = () => {
  const { isDark, toggle } = useDarkMode();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopDropdown, setDesktopDropdown] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isHome = location.pathname === "/";
  const isExercicios = location.pathname === "/exercicios";
  const currentCat = new URLSearchParams(location.search).get("categoria");

  const goToCategory = (catId: string) => {
    if (catId === "exercicios") {
      navigate("/exercicios");
    } else {
      navigate(`/?categoria=${catId}`);
    }
    setMobileOpen(false);
    setDesktopDropdown(false);
  };

  const goHome = () => {
    navigate("/");
    setMobileOpen(false);
    setDesktopDropdown(false);
  };

  return (
    <nav className="sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-3 pb-2 pt-3 md:px-6 md:pt-6">
        <div className="sanctuary-glass relative flex h-14 items-center justify-between rounded-full border border-white/15 px-3 text-white md:h-[68px] md:px-5">
          <Link
            to="/"
            className="group flex items-center gap-2.5"
            onClick={() => {
              setMobileOpen(false);
              setDesktopDropdown(false);
            }}
          >
            <img
              src="/android-chrome-512x512.png"
              alt="ReconNews"
              className="h-8 w-8 rounded-xl ring-1 ring-white/35 transition-transform group-hover:scale-105 md:h-10 md:w-10"
            />
            <span className="font-headline text-base font-extrabold tracking-tight text-white md:text-xl">
              Recon<span className="text-amber-300">News</span>
            </span>
          </Link>

          <div className="hidden items-center gap-2 md:flex">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "rounded-full px-4 text-sm font-semibold text-slate-100 hover:bg-white/12 hover:text-white",
                isHome && !currentCat && "bg-white/16"
              )}
              onClick={goHome}
            >
              <Newspaper className="h-4 w-4" />
              Noticias
            </Button>

            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "rounded-full px-4 text-sm font-semibold text-slate-100 hover:bg-white/12 hover:text-white",
                  (currentCat || isExercicios) && "bg-white/16"
                )}
                onClick={() => setDesktopDropdown(!desktopDropdown)}
              >
                <BookOpen className="h-4 w-4" />
                Categorias
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", desktopDropdown && "rotate-180")} />
              </Button>

              {desktopDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setDesktopDropdown(false)} />
                  <div className="absolute right-0 top-full z-50 mt-3 w-80 rounded-2xl border border-white/20 bg-slate-950/90 p-2 text-white backdrop-blur-2xl shadow-[var(--shadow-elevated)]">
                    {CONTENT_CATEGORIES.map((cat) => {
                      const isActive = cat.id === "exercicios" ? isExercicios : currentCat === cat.id;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => goToCategory(cat.id)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                            isActive
                              ? "bg-amber-300/22 text-amber-200"
                              : "text-slate-100 hover:bg-white/10"
                          )}
                        >
                          <span className="text-base">{cat.emoji}</span>
                          <span className="font-medium">{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 md:gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full text-slate-100 hover:bg-white/12 hover:text-white"
              onClick={toggle}
              aria-label={isDark ? "Modo claro" : "Modo escuro"}
            >
              {isDark ? <Sun className="h-4.5 w-4.5 text-amber-300" /> : <Moon className="h-4.5 w-4.5" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full text-slate-100 hover:bg-white/12 hover:text-white md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        <div
          className={cn(
            "mt-2 overflow-hidden rounded-2xl border border-white/15 bg-slate-950/85 text-white shadow-[var(--shadow-card)] backdrop-blur-2xl transition-all duration-300 md:hidden",
            mobileOpen ? "max-h-[560px] p-3" : "max-h-0 border-transparent p-0"
          )}
        >
          <div className="space-y-1">
            <button
              onClick={goHome}
              className={cn(
                "flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold",
                isHome && !currentCat ? "bg-amber-300/22 text-amber-200" : "text-slate-100 hover:bg-white/10"
              )}
            >
              <Newspaper className="h-4 w-4" />
              Todas as Noticias
            </button>

            <div className="px-2 pb-1 pt-2 text-[11px] uppercase tracking-[0.18em] text-slate-300">
              Categorias
            </div>

            {CONTENT_CATEGORIES.map((cat) => {
              const isActive = cat.id === "exercicios" ? isExercicios : currentCat === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => goToCategory(cat.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm",
                    isActive ? "bg-amber-300/22 text-amber-200" : "text-slate-100 hover:bg-white/10"
                  )}
                >
                  <span className="text-base">{cat.emoji}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};
