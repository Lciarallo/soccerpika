/**
 * GET  /api/products — catálogo público (admin vê também os despublicados).
 * POST /api/products — cria produto (admin).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { currentUser, requireAdmin, sendAuthError } from './_lib/auth.js';
import { listProducts, upsertProduct } from './_lib/products.js';
import { parseProductInput, ValidationError } from './_lib/validate.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      const user = await currentUser(req);
      const isAdmin = user?.role === 'admin';
      const products = await listProducts({ includeUnpublished: isAdmin });

      // A resposta do admin traz produtos despublicados: cacheá-la na CDN
      // serviria esse conteúdo a qualquer visitante. Só o catálogo anônimo é
      // cacheável, e ainda assim com Vary: Cookie para não misturar as duas.
      res.setHeader('Vary', 'Cookie');
      res.setHeader(
        'Cache-Control',
        user
          ? 'private, no-store'
          : 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
      );

      return res.status(200).json({ products });
    }

    if (req.method === 'POST') {
      await requireAdmin(req);
      const input = parseProductInput(req.body);
      const product = await upsertProduct(input);
      return res.status(201).json({ product });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Método não permitido.' });
  } catch (error) {
    if (sendAuthError(res, error)) return;
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    console.error('products', error);
    return res.status(500).json({ error: 'Não foi possível carregar os produtos.' });
  }
}
