-- Add translation and extended summary columns to articles table
-- These fields enable storing PT-BR translations and richer popup summaries
-- Safe to run multiple times thanks to IF NOT EXISTS

BEGIN;

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS title_pt text;

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS description_pt text;

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS translation_provider text;

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS extended_summary_pt text;

COMMENT ON COLUMN public.articles.title_pt IS 'Título traduzido para PT-BR quando disponível';
COMMENT ON COLUMN public.articles.description_pt IS 'Resumo traduzido para PT-BR quando disponível';
COMMENT ON COLUMN public.articles.translation_provider IS 'Provedor de tradução utilizado (e.g., deepl, openai)';
COMMENT ON COLUMN public.articles.extended_summary_pt IS 'Resumo estendido (extraído da página) traduzido para PT-BR';

-- Optional supporting index to speed up text search on translated fields (can be extended later)
-- CREATE INDEX IF NOT EXISTS articles_description_pt_idx ON public.articles USING gin (to_tsvector('portuguese', coalesce(description_pt, '')));

COMMIT;