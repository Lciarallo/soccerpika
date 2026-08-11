/**
 * GET    /api/account/wishlist        — peças favoritadas
 * POST   /api/account/wishlist        — favorita { productId }
 * DELETE /api/account/wishlist?id=... — desfavorita
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUser, sendAuthError } from '../_lib/auth';
import { sql } from '../_lib/db';
import { toProduct, type ProductRow } from '../_lib/products';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await requireUser(req);

    if (req.method === 'GET') {
      const rows = await sql<ProductRow[]>`
        SELECT p.*,
               COALESCE(ARRAY(
                 SELECT i.url FROM product_images i
                 WHERE i.product_id = p.id ORDER BY i.position, i.id
               ), '{}') AS images
        FROM wishlist w
        JOIN products p ON p.id = w.product_id
        WHERE w.user_id = ${user.id}
        ORDER BY w.created_at DESC
      `;
      return res.status(200).json({ products: rows.map(toProduct) });
    }

    if (req.method === 'POST') {
      const productId = String((req.body as { productId?: unknown })?.productId ?? '');
      if (!UUID.test(productId)) {
        return res.status(400).json({ error: 'Produto inválido.' });
      }
      // Favoritar duas vezes não é erro.
      await sql`
        INSERT INTO wishlist (user_id, product_id)
        VALUES (${user.id}, ${productId})
        ON CONFLICT DO NOTHING
      `;
      return res.status(201).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const productId = String(req.query.id ?? '');
      if (!UUID.test(productId)) {
        return res.status(400).json({ error: 'Produto inválido.' });
      }
      await sql`
        DELETE FROM wishlist
        WHERE user_id = ${user.id} AND product_id = ${productId}
      `;
      return res.status(204).end();
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ error: 'Método não permitido.' });
  } catch (error) {
    if (sendAuthError(res, error)) return;
    console.error('wishlist', error);
    return res.status(500).json({ error: 'Não foi possível acessar a lista.' });
  }
}
