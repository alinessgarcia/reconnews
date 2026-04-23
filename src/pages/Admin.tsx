import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Newspaper, LogOut, ArrowLeft } from "lucide-react";
import { CollectingBar } from "@/components/CollectingBar";
import { isAdminSession } from "@/lib/auth";

const Admin = () => {
  const [isCollecting, setIsCollecting] = useState(false);
  const [collectProgress, setCollectProgress] = useState(0);
  const [isCleaning, setIsCleaning] = useState(false);
  const [isDbCleanupRunning, setIsDbCleanupRunning] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const sessionCheck = async () => {
      if (!supabase) {
        toast({
          title: "Configuração ausente",
          description: "Supabase não está configurado no ambiente.",
          variant: "destructive",
        });
        navigate("/");
        setCheckingAccess(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate("/auth");
        setCheckingAccess(false);
        return;
      }

      if (!isAdminSession(data.session)) {
        await supabase.auth.signOut();
        toast({
          title: "Acesso negado",
          description: "Sua conta não possui permissão de administrador.",
          variant: "destructive",
        });
        navigate("/");
        setCheckingAccess(false);
        return;
      }

      setCheckingAccess(false);
    };

    sessionCheck();

    if (!supabase) return;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  if (checkingAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Validando acesso administrativo...</p>
      </div>
    );
  }

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

  const handleCleanupCategories = async () => {
    if (isCleaning) return;
    setIsCleaning(true);
    try {
      const { data, error } = await supabase.functions.invoke<{
        success: boolean;
        deleted?: number;
        error?: string;
      }>("cleanup-non-br", {
        body: { mode: "remove_hidden_categories" },
      });

      if (error || !data?.success) {
        toast({
          title: "Erro na limpeza",
          description:
            data?.error ??
            "Nao foi possivel remover artigos dessas categorias. Verifique as permissoes de admin.",
          variant: "destructive",
        });
        setIsCleaning(false);
        return;
      }

      toast({
        title: "Limpeza concluida",
        description: `${data.deleted ?? 0} artigos removidos das categorias ocultas.`,
      });
    } catch (err) {
      toast({
        title: "Erro na limpeza",
        description: "Ocorreu um erro inesperado ao limpar as categorias.",
        variant: "destructive",
      });
    } finally {
      setIsCleaning(false);
    }
  };

  const handleRunDbCleanupRpc = async () => {
    if (isDbCleanupRunning) return;
    setIsDbCleanupRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke<{
        success: boolean;
        deleted?: number;
        message?: string;
        error?: string;
      }>("cleanup-non-br", {
        body: { mode: "cleanup_old_articles" },
      });

      if (error || !data?.success) {
        toast({
          title: "Erro ao executar limpeza programatica",
          description:
            data?.error ??
            "A funcao cleanup_old_articles falhou. Verifique as permissoes de admin.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Limpeza programatica concluida",
          description:
            data.message ??
            `${data.deleted ?? 0} artigos antigos removidos.`,
        });
      }
    } catch (err) {
      toast({
        title: "Erro ao executar limpeza programatica",
        description: "Ocorreu um erro inesperado ao chamar a funcao de limpeza.",
        variant: "destructive",
      });
    } finally {
      setIsDbCleanupRunning(false);
    }
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
                <span className="font-medium">2x ao dia (07:00 e 17:00 BRT)</span>
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

          <Card>
            <CardHeader>
              <CardTitle>Limpeza de Categorias</CardTitle>
              <CardDescription>Remover artigos das categorias indesejadas</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleCleanupCategories} disabled={isCleaning} variant="destructive" className="gap-2">
                {isCleaning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Newspaper className="h-4 w-4" />
                )}
                Remover “Portal Evangélico” e “Notícias Evangélicas”
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">
                Dica: se houver restrições de política (RLS), execute a limpeza via workflow ou com a role de serviço.
              </p>
              <div className="mt-4">
                <Button onClick={handleRunDbCleanupRpc} disabled={isDbCleanupRunning} className="gap-2" variant="secondary">
                  {isDbCleanupRunning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Newspaper className="h-4 w-4" />
                  )}
                  Executar cleanup_old_articles (RPC)
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Admin;
