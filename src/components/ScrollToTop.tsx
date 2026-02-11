import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const ScrollToTop = () => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const onScroll = () => setVisible(window.scrollY > 400);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    return (
        <Button
            variant="default"
            size="icon"
            onClick={scrollToTop}
            aria-label="Voltar ao topo"
            className={cn(
                "fixed bottom-6 right-6 z-50 rounded-full shadow-lg",
                "transition-all duration-300 ease-in-out",
                visible
                    ? "translate-y-0 opacity-100 scale-100"
                    : "translate-y-4 opacity-0 scale-75 pointer-events-none"
            )}
        >
            <ArrowUp className="h-5 w-5" />
        </Button>
    );
};
