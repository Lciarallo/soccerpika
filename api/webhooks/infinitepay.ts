/**
 * POST/GET /api/webhooks/infinitepay — recebe as notificações do gateway.
 *
 * A notificação carrega só coordenadas (`order_nsu`, `transaction_nsu`,
 * `slug` — nomes variam conforme a fonte, ver `collectCoordinates`); o estado
 * é sempre reconferido em `POST /payment_check` para que um POST forjado não
 * consiga marcar um pedido como pago. Responde 200 mesmo em falha esperada:
 * a InfinitePay reenvia o que não for confirmado, e reenvio infinito por um
 * pedido que nunca vai casar (ex.: id de teste) não ajuda ninguém.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkInfinitePayPayment, collectCoordinates } from '../_lib/infinitepay.js';
import { getOrderStatus, markOrderPaid } from '../_lib/orders.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.setHeader('Allow', 'POST, GET');
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const coordsList = collectCoordinates(req.body, req.query);
    if (coordsList.length === 0) {
      console.warn('webhook infinitepay: sem coordenadas reconhecidas', {
        body: req.body,
        query: req.query,
      });
      return res.status(200).json({ received: true, note: 'no order coordinates matched' });
    }

    for (const coords of coordsList) {
      const order = await getOrderStatus(coords.orderId);
      if (!order) continue;

      let amountCents: number | null = null;
      try {
        const proof = await checkInfinitePayPayment(coords);
        if (proof.paid && proof.amountCents !== null) {
          amountCents = proof.amountCents;
        }
      } catch (checkErr) {
        console.warn(
          'webhook infinitepay: consulta payment_check falhou',
          (checkErr as Error).message,
        );
      }

      // Sem confirmação da API, usa o total do próprio pedido só se o corpo
      // do webhook já indicar sucesso explicitamente — nunca confia cega no
      // valor que a notificação declarou.
      if (amountCents === null) {
        const rawBody = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<
          string,
          unknown
        >;
        const rawStatus = String(rawBody.status ?? rawBody.event ?? '').toLowerCase();
        const isDirectSuccess =
          rawBody.paid === true ||
          rawStatus.includes('paid') ||
          rawStatus.includes('success') ||
          rawStatus.includes('approved');
        if (isDirectSuccess) amountCents = order.total_cents;
      }

      if (amountCents === null) continue;

      const result = await markOrderPaid(coords.orderId, coords.transactionNsu, amountCents);
      if (result === 'paid' || result === 'oversold') {
        console.info('webhook infinitepay: pedido confirmado', {
          orderId: coords.orderId,
          result,
        });
      }
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('webhook infinitepay', error);
    // 200 mesmo em erro nosso: reenvio não corrige um bug do lado de cá, só
    // enche o log. O pedido continua consultável por payment-sync/status.
    return res.status(200).json({ received: true });
  }
}
