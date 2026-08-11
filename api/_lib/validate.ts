/** Validação da entrada do dashboard, antes de qualquer escrita no banco. */

import type { ProductInput } from './products.js';

export class ValidationError extends Error {}

const ERAS = new Set(['80s', '90s', '2000s', '2010s+', 'Sem data']);
const CATEGORIES = new Set([
  'Brasileiros',
  'Europeus',
  'Seleções',
  'Sulamericanas',
  'De Jogo',
  'Outros',
]);

const text = (value: unknown, field: string, { max = 200, required = false } = {}) => {
  const v = String(value ?? '').trim();
  if (required && !v) throw new ValidationError(`${field} é obrigatório.`);
  if (v.length > max) throw new ValidationError(`${field} passa de ${max} caracteres.`);
  return v;
};

export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Só aceita imagem de origem conhecida: o próprio site, o Blob da Vercel ou
 * o CDN da loja. Fecha a porta para `javascript:` e para hotlink arbitrário.
 */
function assertImageUrl(url: string): string {
  if (url.startsWith('/products/') || url.startsWith('/uploads/')) return url;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ValidationError(`Imagem com URL inválida: ${url}`);
  }

  if (parsed.protocol !== 'https:') {
    throw new ValidationError('A imagem precisa ser https.');
  }

  const allowed = /(^|\.)(vercel-storage\.com|mitiendanube\.com|soccerpika\.com)$/;
  if (!allowed.test(parsed.hostname)) {
    throw new ValidationError(`Domínio de imagem não permitido: ${parsed.hostname}`);
  }
  return parsed.toString();
}

export function parseProductInput(raw: unknown): ProductInput {
  const body = (raw ?? {}) as Record<string, unknown>;

  const name = text(body.name, 'Nome', { required: true, max: 160 });
  const slug = slugify(text(body.slug, 'Slug') || name);
  if (!slug) throw new ValidationError('Não foi possível gerar o slug.');

  const price = Number(body.price);
  if (!Number.isFinite(price) || price < 0 || price > 1_000_000) {
    throw new ValidationError('Preço inválido.');
  }

  const stockQty = Number(body.stockQty ?? 0);
  if (!Number.isInteger(stockQty) || stockQty < 0 || stockQty > 10_000) {
    throw new ValidationError('Estoque inválido.');
  }

  const era = text(body.era, 'Época') || 'Sem data';
  if (!ERAS.has(era)) throw new ValidationError(`Época inválida: ${era}`);

  const category = text(body.category, 'Categoria') || 'Outros';
  if (!CATEGORIES.has(category)) {
    throw new ValidationError(`Categoria inválida: ${category}`);
  }

  const sizes = Array.isArray(body.sizes)
    ? [...new Set(body.sizes.map((s) => String(s).trim().toUpperCase()).filter(Boolean))]
    : [];
  if (sizes.length > 12) throw new ValidationError('Tamanhos demais.');

  const images = Array.isArray(body.images)
    ? body.images.map((i) => assertImageUrl(String(i).trim())).filter(Boolean)
    : [];
  if (images.length > 12) throw new ValidationError('Máximo de 12 imagens por produto.');

  return {
    slug,
    name,
    club: text(body.club, 'Clube', { max: 80 }),
    season: text(body.season, 'Temporada', { max: 20 }),
    era,
    category,
    brand: text(body.brand, 'Marca', { max: 60 }),
    description: text(body.description, 'Descrição', { max: 2000 }),
    price,
    stockQty,
    sizes,
    images,
    isMatchWorn: Boolean(body.isMatchWorn),
    isAutographed: Boolean(body.isAutographed),
    isPublished: body.isPublished === undefined ? true : Boolean(body.isPublished),
    sourceUrl: body.sourceUrl ? text(body.sourceUrl, 'URL de origem', { max: 300 }) : null,
  };
}
