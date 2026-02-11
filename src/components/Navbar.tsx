import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Sun, Moon, Menu, X, Newspaper, Dumbbell, BookOpen, ShieldCheck, HeartPulse, TreePine, Salad, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDarkMode } from "@/hooks/use-dark-mode";
import { cn } from "@/lib/utils";

export const CONTENT_CATEGORIES = [
    { id: "arqueologia", label: "Arqueologia Bíblica", icon: BookOpen, emoji: "📜" },
    { id: "liberdade", label: "Liberdade e Perseguição Religiosa", icon: ShieldCheck, emoji: "🕊️" },
    { id: "saude", label: "Saúde, Bem‑Estar e Alimentos", icon: HeartPulse, emoji: "🍎" },
    { id: "exercicios", label: "Dicas de Exercícios 40+", icon: Dumbbell, emoji: "💪" },
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
        <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto max-w-7xl px-4">
                <div className="flex h-14 items-center justify-between">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2.5 group" onClick={() => { setMobileOpen(false); setDesktopDropdown(false); }}>
                        <img
                            src="/android-chrome-512x512.png"
                            alt="ReconNews"
                            className="h-8 w-8 rounded-lg shadow-sm transition-transform group-hover:scale-110"
                        />
                        <span className="text-lg font-bold tracking-tight text-foreground">
                            Recon<span className="text-primary">News</span>
                        </span>
                    </Link>

                    {/* Desktop nav */}
                    <div className="hidden md:flex items-center gap-1">
                        <Button
                            variant={isHome && !currentCat ? "default" : "ghost"}
                            size="sm"
                            className="gap-1.5"
                            onClick={goHome}
                        >
                            <Newspaper className="h-4 w-4" />
                            Notícias
                        </Button>

                        {/* Categories dropdown */}
                        <div className="relative">
                            <Button
                                variant={currentCat || isExercicios ? "default" : "ghost"}
                                size="sm"
                                className="gap-1.5"
                                onClick={() => setDesktopDropdown(!desktopDropdown)}
                            >
                                <BookOpen className="h-4 w-4" />
                                Categorias
                                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", desktopDropdown && "rotate-180")} />
                            </Button>
                            {desktopDropdown && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setDesktopDropdown(false)} />
                                    <div className="absolute right-0 top-full mt-2 w-72 rounded-lg border border-border bg-background shadow-xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                        {CONTENT_CATEGORIES.map((cat) => {
                                            const isActive = cat.id === "exercicios" ? isExercicios : currentCat === cat.id;
                                            return (
                                                <button
                                                    key={cat.id}
                                                    onClick={() => goToCategory(cat.id)}
                                                    className={cn(
                                                        "w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors hover:bg-accent/50",
                                                        isActive && "bg-primary/10 text-primary font-medium"
                                                    )}
                                                >
                                                    <span className="text-base">{cat.emoji}</span>
                                                    <span>{cat.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Right side: dark mode + mobile menu */}
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggle}
                            aria-label={isDark ? "Modo claro" : "Modo escuro"}
                            className="rounded-full"
                        >
                            {isDark ? (
                                <Sun className="h-[1.15rem] w-[1.15rem] text-yellow-400 transition-transform hover:rotate-45" />
                            ) : (
                                <Moon className="h-[1.15rem] w-[1.15rem] transition-transform hover:-rotate-12" />
                            )}
                        </Button>

                        {/* Mobile hamburger */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden rounded-full"
                            onClick={() => setMobileOpen(!mobileOpen)}
                            aria-label="Menu"
                        >
                            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </Button>
                    </div>
                </div>

                {/* Mobile menu */}
                <div
                    className={cn(
                        "md:hidden overflow-hidden transition-all duration-300 ease-in-out",
                        mobileOpen ? "max-h-[500px] pb-4" : "max-h-0"
                    )}
                >
                    <div className="flex flex-col gap-1 pt-2">
                        {/* Notícias (all) */}
                        <button
                            onClick={goHome}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-left transition-colors",
                                isHome && !currentCat ? "bg-primary text-primary-foreground font-medium" : "hover:bg-accent/50"
                            )}
                        >
                            <Newspaper className="h-4 w-4" />
                            📰 Todas as Notícias
                        </button>

                        <div className="px-3 pt-3 pb-1">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Categorias</span>
                        </div>

                        {CONTENT_CATEGORIES.map((cat) => {
                            const isActive = cat.id === "exercicios" ? isExercicios : currentCat === cat.id;
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => goToCategory(cat.id)}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-left transition-colors",
                                        isActive ? "bg-primary text-primary-foreground font-medium" : "hover:bg-accent/50"
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
