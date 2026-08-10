/**
 * POST /api/webhooks/mercadopago — recebe as notificações do gateway.
 *
 * A notificação carrega só o id; o estado é sempre relido da API para que um
 * POST forjado não consiga marcar um pedido como pago. Quando há segredo
 * configurado, a assinatura `x-signature` é conferida antes disso.
 *
 * Responde 200 rápido: o Mercado Pago reenvia o que não for confirmado.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPayment } from './../_lib/mercadopago';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const secret = process.env.MP_WEBHOOK_SECRET;
  if (secret && !isSignatureValid(req, secret)) {
    return res.status(401).json({ error: 'Assinatura inválida.' });
  }

  const body = (req.body ?? {}) as { type?: string; data?: { id?: string } };
  const paymentId = body.data?.id;

  if (body.type !== 'payment' || !paymentId) {
    // Outros tópicos não interessam — confirmar evita reenvio infinito.
    return res.status(200).json({ received: true });
  }

  try {
    const payment = await getPayment(paymentId);
    console.info('pagamento atualizado', {
      id: payment.id,
      status: payment.status,
      detail: payment.status_detail,
      amount: payment.transaction_amount,
    });

    // Ponto de extensão: com um banco conectado, é aqui que o pedido muda de
    // estado, o estoque baixa e o e-mail de confirmação sai.
  } catch (error) {
    console.error('webhook mercadopago', error);
  }

  return res.status(200).json({ received: true });
}

/** Confere o header `x-signature` conforme o esquema ts/v1 do Mercado Pago. */
function isSignatureValid(req: VercelRequest, secret: string): boolean {
  const header = String(req.headers['x-signature'] ?? '');
  const requestId = String(req.headers['x-request-id'] ?? '');
  const dataId = String((req.query.id as string) ?? (req.query['data.id'] as string) ?? '');

  const parts = Object.fromEntries(
    header.split(',').map((p) => {
      const [k, v] = p.split('=');
      return [k?.trim(), v?.trim()];
    }),
  ) as { ts?: string; v1?: string };

  if (!parts.ts || !parts.v1) return false;

  const manifest = `id:${dataId};request-id:${requestId};ts:${parts.ts};`;
  const expected = createHmac('sha256', secret).update(manifest).digest('hex');

  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(parts.v1, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}
