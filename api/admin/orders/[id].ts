/** PUT /api/admin/orders/:id — atualiza status na esteira e/ou código de rastreio. */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin, sendAuthError } from '../../_lib/auth.js';
import { OrderError } from '../../_lib/order.js';
import { updateOrderAdmin } from '../../_lib/orders.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', 'PUT');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const id = String(req.query.id ?? '');
  if (!UUID.test(id)) {
    return res.status(400).json({ error: 'Id de pedido inválido.' });
  }

  try {
    await requireAdmin(req);
    const body = (req.body ?? {}) as { status?: string; trackingCode?: string };
    const updated = await updateOrderAdmin(id, {
      status: typeof body.status === 'string' ? body.status : undefined,
      trackingCode: typeof body.trackingCode === 'string' ? body.trackingCode : undefined,
    });
    if (!updated) return res.status(404).json({ error: 'Pedido não encontrado.' });
    return res.status(200).json({ ok: true });
  } catch (error) {
    if (sendAuthError(res, error)) return;
    if (error instanceof OrderError) {
      return res.status(400).json({ error: error.message });
    }
    console.error('admin/orders/[id]', error);
    return res.status(500).json({ error: 'Não foi possível atualizar o pedido.' });
  }
}
