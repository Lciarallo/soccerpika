/** GET /api/admin/orders — todos os pedidos da loja, para o painel administrativo. */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin, sendAuthError } from '../_lib/auth.js';
import { listAllOrders } from '../_lib/orders.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  try {
    await requireAdmin(req);
    const orders = await listAllOrders();
    return res.status(200).json({ orders });
  } catch (error) {
    if (sendAuthError(res, error)) return;
    console.error('admin/orders', error);
    return res.status(500).json({ error: 'Não foi possível carregar os pedidos.' });
  }
}
