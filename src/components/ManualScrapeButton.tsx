import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const ManualScrapeButton = () => {
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();

  const runScraper = async () => {
    setIsRunning(true);
    
    try {
      console.log("Iniciando scraping manual...");
      
      const { data, error } = await supabase.functions.invoke("scrape-news", {
        body: { manual: true },
      });

      if (error) throw error;

      console.log("Resultado do scraping:", data);
      
      toast({
        title: "Scraping concluído!",
        description: `${data.newArticles} novos artigos coletados de ${data.totalArticles} processados.`,
      });
    } catch (error) {
      console.error("Erro ao executar scraping:", error);
      toast({
        title: "Erro no scraping",
        description: "Não foi possível executar o scraping. Verifique o console.",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Button
      onClick={runScraper}
      disabled={isRunning}
      variant="outline"
      size="lg"
      className="gap-2"
    >
      {isRunning ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Coletando...
        </>
      ) : (
        <>
          <Play className="h-4 w-4" />
          Executar Scraping Agora
        </>
      )}
    </Button>
  );
};
