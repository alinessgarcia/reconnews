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
