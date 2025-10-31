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

## Automação (GitHub Actions)
O workflow `.github/workflows/scraper.yml` dispara a função `scrape-news` em horários pré-definidos e permite execução manual.

## Segredos para cron jobs no Supabase
As migrações de banco agendam `pg_cron` para chamar a função `scrape-news` usando a chave Service Role armazenada com segurança no Vault do Supabase. **Antes de aplicar as migrações**, insira ou atualize o segredo no banco remoto:

```sql
-- Executar no SQL Editor do Supabase ou via `supabase db remote commit`
select vault.create_secret('SUPABASE_SERVICE_ROLE_KEY', '<sua-service-role-key>');
-- Caso o segredo já exista e precise ser atualizado:
select vault.update_secret('SUPABASE_SERVICE_ROLE_KEY', '<sua-service-role-key>');
```

Você pode confirmar que o valor está disponível para as funções com:

```sql
select name from vault.decrypted_secrets where name = 'SUPABASE_SERVICE_ROLE_KEY';
```

Com o segredo presente, as migrações recriam os agendamentos sem expor tokens no código.

## Deploy
Você pode usar Vercel, Netlify, ou qualquer host estático para o frontend.
- Ajuste as metatags em `index.html` conforme seu domínio
- Configure variáveis/segredos no provedor de deploy conforme necessário

## Segurança
- Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` no frontend
- Use RLS e verificação de JWT nas APIs

## Licença
MIT
