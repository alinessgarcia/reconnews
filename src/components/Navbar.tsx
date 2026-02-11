import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Sun, Moon, Menu, X, Newspaper, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDarkMode } from "@/hooks/use-dark-mode";
import { cn } from "@/lib/utils";

const navLinks = [
    { to: "/", label: "Notícias", icon: Newspaper },
    { to: "/exercicios", label: "Exercícios", icon: Dumbbell },
];

export const Navbar = () => {
    const { isDark, toggle } = useDarkMode();
    const [mobileOpen, setMobileOpen] = useState(false);
    const location = useLocation();

    return (
        <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto max-w-7xl px-4">
                <div className="flex h-14 items-center justify-between">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2.5 group" onClick={() => setMobileOpen(false)}>
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
                        {navLinks.map(({ to, label, icon: Icon }) => (
                            <Link key={to} to={to}>
                                <Button
                                    variant={location.pathname === to ? "default" : "ghost"}
                                    size="sm"
                                    className="gap-1.5"
                                >
                                    <Icon className="h-4 w-4" />
                                    {label}
                                </Button>
                            </Link>
                        ))}
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
                        mobileOpen ? "max-h-48 pb-4" : "max-h-0"
                    )}
                >
                    <div className="flex flex-col gap-1 pt-2">
                        {navLinks.map(({ to, label, icon: Icon }) => (
                            <Link key={to} to={to} onClick={() => setMobileOpen(false)}>
                                <Button
                                    variant={location.pathname === to ? "secondary" : "ghost"}
                                    className="w-full justify-start gap-2"
                                >
                                    <Icon className="h-4 w-4" />
                                    {label}
                                </Button>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </nav>
    );
};
