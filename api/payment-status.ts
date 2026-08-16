/**
 * GET /api/payment-status?id=<pedido> — consulta o estado de uma cobrança.
 *
 * A tela do Pix chama isto em intervalos até o pagamento ser aprovado ou
 * expirar. O estado vem do nosso banco, não da InfinitePay: quem atualiza o
 * pedido é sempre o webhook ou o retorno do cliente (`/api/payment-sync`),
 * ambos conferidos direto na API do gateway. Aqui é só leitura.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getOrderStatus } from './_lib/orders.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const id = String(req.query.id ?? '');
  if (!UUID.test(id)) {
    return res.status(400).json({ error: 'Id de pedido inválido.' });
  }

  try {
    const order = await getOrderStatus(id);
    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado.' });
    }
    return res.status(200).json({
      id: order.id,
      status: order.status,
      statusDetail: order.status,
      amount: order.total_cents / 100,
    });
  } catch (error) {
    console.error('payment-status', error);
    return res.status(500).json({ error: 'Não foi possível consultar o pagamento.' });
  }
}
