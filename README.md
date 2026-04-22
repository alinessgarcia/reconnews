# ReconNews

Um agregador automático de notícias de arqueologia com backend Supabase e frontend React/Vite.

## Tecnologias
- Vite + React + TypeScript
- Tailwind CSS + shadcn-ui
- Supabase (DB + Edge Functions)
- GitHub Actions (agendado para acionar a função de scraping)

## Desenvolvimento local
```sh
npm i
npm run dev
```
Aplicação roda em http://localhost:8080

## Integração com Supabase
- Configure SUPABASE_URL e SUPABASE_ANON_KEY no frontend (se necessário)
- Função Edge `scrape-news` com `verify_jwt = true` (chamada via Actions ou backend)
- Para testes manuais: use token Service Role apenas em ambientes seguros
- Defina `VITE_ADMIN_EMAILS` (lista separada por vírgula) para liberar acesso ao painel `/admin`
- Defina `VITE_ALLOW_ADMIN_SIGNUP=false` em produção para bloquear criação pública de contas
- Defina `RECON_ADMIN_EMAILS` nos secrets da Edge Function para permitir execução manual do scraper por admins

## Automação (GitHub Actions)
O workflow `.github/workflows/scraper.yml` dispara a função `scrape-news` em horários pré-definidos e permite execução manual.

## Deploy
Você pode usar Vercel, Netlify, ou qualquer host estático para o frontend.
- Ajuste as metatags em `index.html` conforme seu domínio
- Configure variáveis/segredos no provedor de deploy conforme necessário

## Segurança
- Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` no frontend
- Use RLS e verificação de JWT nas APIs
- Faça rotação imediata de chaves antigas se já existiram tokens hardcoded em migrations históricas

## Licença
MIT
