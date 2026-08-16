/**
 * POST /api/payment-sync — confirma o pagamento a partir do retorno do cliente.
 *
 * A InfinitePay redireciona o navegador de volta para `/pagamento/retorno`
 * depois do Pix pago. Esta rota é chamada por essa tela para confirmar na
 * hora, sem esperar o webhook — que é assíncrono e pode demorar. As duas vias
 * convergem para a mesma `markOrderPaid`, então rodar as duas não duplica
 * baixa de estoque.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkInfinitePayPayment, collectCoordinates } from './_lib/infinitepay.js';
import { getOrderStatus, markOrderPaid } from './_lib/orders.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const orderId = String((req.body ?? {}).orderId ?? req.query.orderId ?? '');
  if (!orderId) {
    return res.status(400).json({ error: 'Pedido não informado.' });
  }

  const coordsList = collectCoordinates(req.body, req.query).filter(
    (c) => c.orderId === orderId,
  );

  try {
    // Sem transaction_nsu/slug de verdade não dá para consultar a InfinitePay
    // — mas o pedido pode já ter sido confirmado pelo webhook enquanto o
    // cliente ainda estava por lá. Nesse caso só relemos o nosso banco.
    if (coordsList.length === 0) {
      const order = await getOrderStatus(orderId);
      if (!order) return res.status(404).json({ error: 'Pedido não encontrado.' });
      return res.status(200).json({ ok: true, status: order.status, paid: order.status === 'paid' });
    }

    for (const coords of coordsList) {
      let proof;
      try {
        proof = await checkInfinitePayPayment(coords);
      } catch {
        continue;
      }
      if (!proof.paid || proof.amountCents === null) continue;

      const result = await markOrderPaid(orderId, coords.transactionNsu, proof.amountCents);
      if (result === 'paid' || result === 'already-paid') {
        return res.status(200).json({ ok: true, status: 'paid', paid: true });
      }
      if (result === 'oversold') {
        return res.status(200).json({ ok: true, status: 'oversold', paid: true });
      }
    }

    return res.status(200).json({ ok: true, status: 'pending', paid: false });
  } catch (error) {
    console.error('payment-sync', error);
    return res.status(500).json({ error: 'Não foi possível confirmar o pagamento.' });
  }
}
