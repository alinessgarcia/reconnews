import { useState } from "react";
import emailjs from "@emailjs/browser";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined;
const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID as string | undefined;
const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string | undefined;

export const ContactSection = () => {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const missingConfig = !publicKey || !serviceId || !templateId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (missingConfig) {
      toast({
        title: "Configuração necessária",
        description: "Defina VITE_EMAILJS_PUBLIC_KEY, VITE_EMAILJS_SERVICE_ID e VITE_EMAILJS_TEMPLATE_ID no .env",
        variant: "destructive",
      });
      return;
    }

    if (!name || !email || !message) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const timeString = new Date().toLocaleString("pt-BR", {
        hour12: false,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      await emailjs.send(
        serviceId!,
        templateId!,
        {
          // Variáveis padrão usadas no componente
          from_name: name,
          reply_to: email,
          message,
          site: window.location.hostname,
          // Compatibilidade com templates que usam {{name}}, {{email}}, {{time}} e {{title}}
          name,
          email,
          time: timeString,
          title: "ReconNews",
        },
        { publicKey: publicKey! }
      );
      toast({ title: "Mensagem enviada", description: "Obrigado! Entraremos em contato em breve." });
      setName("");
      setEmail("");
      setMessage("");
    } catch (err: any) {
      console.error("EmailJS error", err);
      toast({ title: "Falha ao enviar", description: "Tente novamente mais tarde.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mt-16">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Contato</CardTitle>
          <CardDescription>
            Envie uma mensagem com dúvidas, sugestões ou correções.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {missingConfig && (
            <div className="mb-4 text-sm text-muted-foreground">
              Observação: EmailJS ainda não está configurado. Adicione suas chaves no arquivo .env e publique um template para ativar o envio.
            </div>
          )}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" placeholder="voce@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="message">Mensagem</Label>
              <Textarea id="message" rows={5} placeholder="Escreva sua mensagem" value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={loading} className="gap-2">
                {loading ? "Enviando..." : "Enviar"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
};

export default ContactSection;