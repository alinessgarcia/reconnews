-- Add academic facets to articles
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS evidence_type text,
  ADD COLUMN IF NOT EXISTS theme text;

-- Indexes for faster filtering
CREATE INDEX IF NOT EXISTS idx_articles_region ON public.articles (region);
CREATE INDEX IF NOT EXISTS idx_articles_evidence_type ON public.articles (evidence_type);
CREATE INDEX IF NOT EXISTS idx_articles_theme ON public.articles (theme);

-- Optional: comments for documentation
COMMENT ON COLUMN public.articles.region IS 'Academic facet: Region/Civilization (e.g., Israel, Egito, Babilônia)';
COMMENT ON COLUMN public.articles.evidence_type IS 'Academic facet: Evidence Type (e.g., Sítio, Museu, Achados, Cópias)';
COMMENT ON COLUMN public.articles.theme IS 'Academic facet: Themes (e.g., Perspectiva Cristã)';