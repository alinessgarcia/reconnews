import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Decodifica entidades HTML como &#8230; e &amp;
export function decodeHTML(text: string): string {
  if (!text) return "";
  // Decodifica entidades numéricas
  let result = text.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
  // Decodifica entidades nomeadas comuns
  const map: Record<string, string> = {
    '&quot;': '"',
    '&amp;': '&',
    '&apos;': "'",
    '&lt;': '<',
    '&gt;': '>'
  };
  result = result.replace(/&(quot|amp|apos|lt|gt);/g, (m) => map[m] || m);
  // Remove artefatos de colchetes como [ ... ]
  result = result.replace(/\[[^\]]*\]/g, '').trim();
  return result;
}

// Limpa resumos removendo trechos como "The post ..." e excesso de espaços
export function sanitizeSummary(text: string): string {
  const decoded = decodeHTML(text);
  return decoded
    .replace(/The post[\s\S]*$/i, '')
    .replace(/•?\s*Leia mais.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ===== Taxonomia e classificação (front-end) =====

// Listas oficiais para filtros
export const REGIONS_CIVILIZATIONS = [
  'Israel',
  'Terra Santa',
  'Egito',
  'Grécia',
  'Roma',
  'Pérsia',
  'Babilônia',
  'Assíria',
  'Síria',
  'Crescente Fértil',
];

export const EVIDENCE_TYPES = [
  'Sítio',
  'Museu',
  'Achados',
  'Cópias',
];

// Renomeando "Criacionismo" para um termo mais institucional
export const THEMES = [
  'Perspectiva Cristã',
];

// Normaliza string para busca (minúsculas, sem acentos)
export function normalizeForMatch(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Palavras-chave e sinônimos
const KEYWORDS = {
  regions: {
    'Israel': ['israel', 'jerusalem', 'jerusalém', 'galileia', 'judah', 'judá', 'samaria', 'samaria'],
    'Terra Santa': ['terra santa', 'holy land'],
    'Egito': ['egito', 'egypt', 'egipcio', 'egípcio', 'farao', 'faraó'],
    'Grécia': ['grecia', 'grécia', 'greece', 'helenistico', 'helenístico'],
    'Roma': ['roma', 'rome', 'romano', 'imperio romano', 'império romano'],
    'Pérsia': ['persia', 'pérsia', 'aquemenida', 'aquemênida'],
    'Babilônia': ['babilonia', 'babilônia', 'babylon', 'mesopotamia', 'mesopotâmia'],
    'Assíria': ['assiria', 'assíria', 'assyrian', 'ninive', 'nínive', 'nineveh'],
    'Síria': ['siria', 'síria', 'syria'],
    'Crescente Fértil': ['crescente fertil', 'fertile crescent'],
  },
  evidence: {
    'Sítio': ['sitio', 'sítio', 'escavacao', 'escavação', 'estratigrafia', 'camadas', 'tell', 'tel', 'qumran', 'jerico', 'jericó'],
    'Museu': ['museu', 'exposicao', 'exposição', 'acervo', 'curadoria'],
    'Achados': ['achado', 'achados', 'descoberta', 'descobertas', 'artefato', 'artefatos', 'inscricao', 'inscrição', 'inscricoes', 'inscrições', 'ossario', 'ossário', 'ossos', 'estela', 'bulla', 'selo'],
    'Cópias': ['copia', 'cópia', 'copias', 'cópias', 'manuscrito', 'manuscritos', 'papiro', 'papiros', 'pergaminho', 'pergaminhos', 'codex', 'códice', 'codice', 'rolos do mar morto', 'dead sea scrolls', 'qumran']
  },
  themes: {
    'Perspectiva Cristã': ['criacionismo', 'criacionista', 'criacao', 'criação', 'design inteligente', 'intelligent design']
  }
} as const;

// Classifica um artigo a partir de título/descrição
export function classifyArticle(title?: string, description?: string) {
  const text = normalizeForMatch(`${title || ''} ${description || ''}`);
  const pickMatch = (group: Record<string, string[]>) => {
    for (const key of Object.keys(group)) {
      const kws = group[key];
      if (kws.some(k => text.includes(k))) return key;
    }
    return null;
  };

  return {
    region: pickMatch(KEYWORDS.regions),
    evidenceType: pickMatch(KEYWORDS.evidence),
    theme: pickMatch(KEYWORDS.themes),
  } as { region: string | null; evidenceType: string | null; theme: string | null };
}

// Conta quantidades por categoria
export function facetCounts(articles: { title: string; description?: string }[]) {
  const counts: Record<string, Record<string, number>> = {
    regions: {},
    evidence: {},
    themes: {},
  };

  for (const a of articles) {
    const c = classifyArticle(a.title, a.description);
    if (c.region) counts.regions[c.region] = (counts.regions[c.region] || 0) + 1;
    if (c.evidenceType) counts.evidence[c.evidenceType] = (counts.evidence[c.evidenceType] || 0) + 1;
    if (c.theme) counts.themes[c.theme] = (counts.themes[c.theme] || 0) + 1;
  }

  counts.regions['all'] = articles.length;
  counts.evidence['all'] = articles.length;
  counts.themes['all'] = articles.length;
  return counts;
}
