/** GET /api/account/orders — histórico de pedidos de quem está logado. */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUser, sendAuthError } from '../_lib/auth';
import { listOrdersForUser } from '../_lib/orders';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  try {
    const user = await requireUser(req);
    const orders = await listOrdersForUser(user.id);
    return res.status(200).json({ orders });
  } catch (error) {
    if (sendAuthError(res, error)) return;
    console.error('orders', error);
    return res.status(500).json({ error: 'Não foi possível carregar os pedidos.' });
  }
}
