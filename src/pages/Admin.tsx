import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Newspaper, LogOut, ArrowLeft } from "lucide-react";
import { CollectingBar } from "@/components/CollectingBar";

const Admin = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isCollecting, setIsCollecting] = useState(false);
  const [collectProgress, setCollectProgress] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Verificar autenticação
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const triggerCollect = async () => {
    if (isCollecting) return;
    
    setIsCollecting(true);
    setCollectProgress(0);

    try {
      const interval = setInterval(() => {
        setCollectProgress(prev => {
          if (prev >= 95) return 95;
          return prev + 2;
        });
      }, 50);

      const { data, error } = await supabase.functions.invoke('scrape-news', {
        body: { manual: true }
      });

      clearInterval(interval);
      
      if (error) {
        console.error('Erro ao coletar notícias:', error);
        toast({
          title: "Erro na coleta",
          description: "Não foi possível coletar as notícias. Tente novamente.",
          variant: "destructive",
        });
        setIsCollecting(false);
        setCollectProgress(0);
        return;
      }

      setCollectProgress(100);
      
      toast({
        title: "Coleta concluída!",
        description: `${data?.newArticles || 0} novos artigos foram coletados de ${data?.uniqueArticles || 0} únicos processados.`,
      });
      
      setTimeout(() => {
        setIsCollecting(false);
        setCollectProgress(0);
      }, 1000);
    } catch (err) {
      console.error('Erro na coleta:', err);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao coletar notícias.",
        variant: "destructive",
      });
      setIsCollecting(false);
      setCollectProgress(0);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <CollectingBar progress={collectProgress} isCollecting={isCollecting} />
      
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Painel Administrativo</h1>
            <p className="text-muted-foreground">
              Logado como: {user?.email}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Coleta Manual de Notícias</CardTitle>
              <CardDescription>
                Force uma atualização manual do sistema de coleta de notícias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={triggerCollect}
                disabled={isCollecting}
                size="lg"
                className="w-full"
              >
                {isCollecting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Coletando...
                  </>
                ) : (
                  <>
                    <Newspaper className="mr-2 h-5 w-5" />
                    Coletar Notícias Agora
                  </>
                )}
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
                <span className="font-medium">10:00 e 22:00</span>
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
