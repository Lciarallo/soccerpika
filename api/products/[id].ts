/**
 * GET    /api/products/:id — detalhe
 * PUT    /api/products/:id — atualiza (admin)
 * DELETE /api/products/:id — remove (admin)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin, sendAuthError } from '../_lib/auth';
import { deleteProduct, getProduct, updateProduct } from '../_lib/products';
import { parseProductInput, ValidationError } from '../_lib/validate';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = String(req.query.id ?? '');
  if (!UUID.test(id)) {
    return res.status(400).json({ error: 'Id inválido.' });
  }

  try {
    if (req.method === 'GET') {
      const product = await getProduct(id);
      if (!product) return res.status(404).json({ error: 'Produto não encontrado.' });
      return res.status(200).json({ product });
    }

    if (req.method === 'PUT') {
      await requireAdmin(req);
      const product = await updateProduct(id, parseProductInput(req.body));
      if (!product) return res.status(404).json({ error: 'Produto não encontrado.' });
      return res.status(200).json({ product });
    }

    if (req.method === 'DELETE') {
      await requireAdmin(req);
      const removed = await deleteProduct(id);
      if (!removed) return res.status(404).json({ error: 'Produto não encontrado.' });
      return res.status(204).end();
    }

    res.setHeader('Allow', 'GET, PUT, DELETE');
    return res.status(405).json({ error: 'Método não permitido.' });
  } catch (error) {
    if (sendAuthError(res, error)) return;
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    console.error('product', error);
    return res.status(500).json({ error: 'Não foi possível processar o produto.' });
  }
}
