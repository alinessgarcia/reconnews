import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Newspaper, LogOut, ArrowLeft } from "lucide-react";
import { CollectingBar } from "@/components/CollectingBar";

const Admin = () => {
  const [isCollecting, setIsCollecting] = useState(false);
  const [collectProgress, setCollectProgress] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const sessionCheck = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate("/");
      }
    };
    sessionCheck();
  }, [navigate]);

  const handleCollect = async () => {
    if (isCollecting) return;
    setIsCollecting(true);
    setCollectProgress(0);

    try {
      const interval = setInterval(() => {
        setCollectProgress((prev) => (prev >= 95 ? 95 : prev + 2));
      }, 50);

      const { data, error } = await supabase.functions.invoke("scrape-news", {
        body: { manual: true },
      });

      clearInterval(interval);

      if (error) {
        toast({
          title: "Erro",
          description: "Não foi possível executar a coleta manual.",
          variant: "destructive",
        });
        setIsCollecting(false);
        setCollectProgress(0);
        return;
      }

      setCollectProgress(100);
      await new Promise((r) => setTimeout(r, 600));
      toast({
        title: "Coleta concluída",
        description: `${data?.newArticles || 0} novos artigos coletados`,
      });
      setTimeout(() => {
        setIsCollecting(false);
        setCollectProgress(0);
      }, 1000);
    } catch (err) {
      toast({
        title: "Erro",
        description: "Falha ao coletar notícias.",
        variant: "destructive",
      });
      setIsCollecting(false);
      setCollectProgress(0);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <CollectingBar progress={collectProgress} isCollecting={isCollecting} />
      <div className="container mx-auto max-w-5xl px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" className="gap-2" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <Button variant="outline" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Coleta Manual</CardTitle>
              <CardDescription>Execute agora a coleta automática</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleCollect} disabled={isCollecting} className="gap-2">
                {isCollecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Newspaper className="h-4 w-4" />
                )}
                Coletar
              </Button>
              {isCollecting && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm text-muted-foreground text-center">
                    Buscando notícias de todas as fontes...
                  </p>
                  <div className="text-center text-2xl font-bold text-primary">
                    {collectProgress}%
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informações do Sistema</CardTitle>
              <CardDescription>
                Detalhes sobre a coleta automática
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Coleta automática:</span>
                <span className="font-medium">5x ao dia (06:00, 10:00, 14:00, 18:00, 22:00 BRT)</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Fontes ativas:</span>
                <span className="font-medium">5 feeds RSS + Google News</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Categorias:</span>
                <span className="font-medium">12 especializadas</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Admin;
