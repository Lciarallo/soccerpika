import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { db, requireAdmin } from './auth.js';
import { type ProductDoc } from './domain.js';

interface CreateProductInput {
  name: string;
  priceInCents: number;
  originalPriceInCents?: number;
  description: string;
  details?: string[];
  images: string[];
  sizes: string[];
  colors?: string[];
  year?: string;
  club?: string;
  badge?: string;
  category?: string;
  status?: 'available' | 'sold' | 'draft';
  featured?: boolean;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export const adminCreateProduct = onCall({ cors: true }, async (request: CallableRequest) => {
  requireAdmin(request);

  const input = request.data as CreateProductInput;
  if (!input || !input.name || input.priceInCents <= 0) {
    throw new HttpsError('invalid-argument', 'Nome e preço do produto são obrigatórios.');
  }

  const id = `${slugify(input.name)}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const productDoc: ProductDoc = {
    id,
    slug: slugify(input.name),
    name: input.name.trim(),
    priceInCents: Math.round(input.priceInCents),
    originalPriceInCents: input.originalPriceInCents ? Math.round(input.originalPriceInCents) : undefined,
    description: input.description?.trim() || '',
    details: Array.isArray(input.details) ? input.details : [],
    images: Array.isArray(input.images) && input.images.length > 0 ? input.images : ['/logo.png'],
    sizes: Array.isArray(input.sizes) && input.sizes.length > 0 ? input.sizes : ['M'],
    colors: Array.isArray(input.colors) ? input.colors : [],
    year: input.year?.trim(),
    club: input.club?.trim(),
    badge: input.badge?.trim(),
    category: input.category?.trim() || 'clubes',
    status: input.status || 'available',
    featured: input.featured ?? false,
    createdAt: now,
    updatedAt: now,
  };

  await db.collection('products').doc(id).set(productDoc);
  return { ok: true, product: productDoc };
});

export const adminUpdateProduct = onCall({ cors: true }, async (request: CallableRequest) => {
  requireAdmin(request);

  const { id, ...updates } = request.data ?? {};
  if (!id || typeof id !== 'string') {
    throw new HttpsError('invalid-argument', 'ID do produto é obrigatório.');
  }

  const productRef = db.collection('products').doc(id);
  const snap = await productRef.get();
  if (!snap.exists) {
    throw new HttpsError('not-found', 'Produto não encontrado.');
  }

  const payload: Record<string, unknown> = {
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  if (typeof updates.name === 'string') {
    payload.slug = slugify(updates.name);
  }

  if (typeof updates.priceInCents === 'number') {
    payload.priceInCents = Math.round(updates.priceInCents);
  }

  await productRef.update(payload);
  return { ok: true, id, updated: payload };
});

export const adminDeleteProduct = onCall({ cors: true }, async (request: CallableRequest) => {
  requireAdmin(request);

  const { id } = request.data ?? {};
  if (!id || typeof id !== 'string') {
    throw new HttpsError('invalid-argument', 'ID do produto é obrigatório.');
  }

  await db.collection('products').doc(id).delete();
  return { ok: true, id };
});
