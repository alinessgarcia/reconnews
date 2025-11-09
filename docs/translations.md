# Traduções PT-BR no ReconNews

Este guia explica como ativar e operar traduções automáticas para PT-BR no ReconNews usando o DeepL, incluindo o reprocessamento de artigos existentes.

## 1) Secrets necessários

Defina os seguintes secrets no repositório (Settings → Secrets and variables → Actions):

- `SUPABASE_URL`: URL do seu projeto Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: Chave Service Role do Supabase
- `SUPABASE_ACCESS_TOKEN`: Token de acesso do Supabase (CLI) para deploy das Edge Functions
- `SUPABASE_PROJECT_REF`: Project Ref do Supabase (ex.: abcdefghijklmnop)
- `RECON_TRANSLATION_PROVIDER`: Provedor de tradução. Use `deepl`
- `RECON_DEEPL_API_KEY`: Chave de API do DeepL (pode ser free ou pro)
- Opcional: `RECON_ALLOWED_SOURCES` e `RECON_BLOCKED_HOSTS` para política editorial

Observação: os nomes de secrets não podem começar com `SUPABASE_` nas Edge Functions, por isso o workflow de deploy também define aliases `PROJECT_URL` e `SERVICE_ROLE_KEY` dentro do ambiente da função.

## 2) Deploy das Edge Functions

O workflow `Deploy Edge Functions (scrape-news + retranslate-articles)` faz o deploy de:

- `scrape-news`: coleta notícias e agora traduz SEMPRE título e descrição quando há provedor configurado
- `retranslate-articles`: reprocessa artigos já no banco e preenche campos de tradução faltantes

Como acionar:
- Push para os paths `supabase/functions/**` em `main` ou no branch `feat/archaeology-focus`
- Ou manualmente via Actions → Deploy Edge Functions → Run workflow

## 3) Execução dos jobs

Há dois workflows de execução:

- `News Scraper`: chama periodicamente a função `scrape-news` e insere novos artigos
- `Retranslate Articles (fill PT-BR fields)`: chama `retranslate-articles` diariamente e também pode ser acionado manualmente

Para forçar agora:
1. Actions → Deploy Edge Functions → Run workflow
2. Actions → Retranslate Articles (fill PT-BR fields) → Run workflow
3. Actions → News Scraper → Run workflow

## 4) Validação

Verifique na tabela `articles` do Supabase se os campos a seguir estão preenchidos para artigos novos e antigos:

- `title_pt`
- `description_pt`
- `extended_summary_pt` (quando possível)
- `translation_provider` (exibe `deepl` quando houve tradução)

No frontend, o toggle PT-BR fica habilitado quando qualquer campo `_pt` está presente. Se indisponível, permanece desabilitado com tooltip explicativo.

## 5) Considerações de custo e comportamento

- `scrape-news` agora tenta traduzir título e descrição para todas as línguas, não só inglês. Isso garante experiência consistente em PT-BR, com custo proporcional às chamadas no DeepL.
- `retranslate-articles` limita por padrão a 100 itens por execução (`?limit=100`) e tenta preencher apenas os campos faltantes.
- O resumo estendido (`extended_summary_pt`) é gerado a partir do conteúdo extraído da página e traduzido; pode não estar disponível em todos os sites (robots.txt, páginas muito longas, etc.).

## 6) Problemas comuns

- PT-BR não aparece no frontend: confirme que os workflows foram executados após configurar os secrets e que os campos `_pt` estão preenchidos no banco.
- Chave DeepL no `.env` do frontend: não é utilizada pelas Edge Functions. Configure sempre nos secrets do repositório para uso no backend.

## 7) Próximos passos

- Ajustar limites e janelas de reprocessamento do `retranslate-articles` conforme volume de dados
- Adicionar suporte a outros provedores (Google, OpenAI) se necessário
- Otimizar heurística para decidir quando gerar `extended_summary_pt`