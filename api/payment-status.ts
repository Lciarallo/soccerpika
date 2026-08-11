/**
 * GET /api/payment-status?id=123 — consulta o estado de uma cobrança.
 *
 * A tela do Pix chama isto em intervalos até o pagamento ser aprovado ou
 * expirar. Devolve só o necessário para a UI, nunca o objeto cru do gateway.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPayment, MercadoPagoError } from './_lib/mercadopago.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const id = String(req.query.id ?? '');
  if (!/^\d+$/.test(id)) {
    return res.status(400).json({ error: 'Id de pagamento inválido.' });
  }

  try {
    const payment = await getPayment(id);
    return res.status(200).json({
      id: payment.id,
      status: payment.status,
      statusDetail: payment.status_detail,
      amount: payment.transaction_amount,
    });
  } catch (error) {
    if (error instanceof MercadoPagoError) {
      const status = error.status === 404 ? 404 : 502;
      return res.status(status).json({ error: error.message });
    }
    console.error('payment-status', error);
    return res.status(500).json({ error: 'Não foi possível consultar o pagamento.' });
  }
}
