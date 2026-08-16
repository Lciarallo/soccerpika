/**
 * POST /api/payments — cria um pedido e gera o link de cobrança Pix na InfinitePay.
 *
 * A loja cobra só por Pix, via checkout hospedado (o cliente é redirecionado
 * para o domínio da InfinitePay). O pedido nasce com status `pending`; só a
 * confirmação — webhook ou retorno do cliente, ambos conferidos direto na API
 * da InfinitePay — muda isso. Ver `_lib/infinitepay.ts` e `_lib/orders.ts`.
 */

import { randomUUID } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AuthError, currentUser } from './_lib/auth.js';
import { createInfinitePayLink, InfinitePayError } from './_lib/infinitepay.js';
import { buildOrder, OrderError, requireEmail, requireName } from './_lib/order.js';
import { createOrder } from './_lib/orders.js';
import { clientIp, enforceRateLimit } from './_lib/rateLimit.js';

const CHARGE_TTL_MINUTES = 30;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  try {
    await enforceRateLimit(`payments:ip:${clientIp(req)}`, { max: 30, windowSeconds: 600 });

    const body = (req.body ?? {}) as Record<string, unknown>;
    const shippingMethod = String(body.shippingMethod ?? '');
    const shippingCep = String(body.shippingCep ?? '');

    const { lines, total, shippingCents, shippingMethodStr } = await buildOrder(
      body.items,
      shippingCep,
      shippingMethod,
    );

    const customer = (body.customer ?? {}) as Record<string, unknown>;
    const email = requireEmail(customer.email);
    const name = requireName(customer.name, 'Nome');
    const phone = typeof customer.phone === 'string' ? customer.phone.trim() : undefined;

    const user = await currentUser(req);

    const orderId = await createOrder({
      userId: user?.id ?? null,
      email,
      total,
      paymentId: null,
      paymentMethod: 'pix',
      status: 'pending',
      lines,
      shippingCents,
      shippingMethod: shippingMethodStr,
      shippingCep,
    });

    const base = publicBaseUrl(req);
    const amountCents = Math.round(total * 100);

    let checkoutUrl: string;
    try {
      checkoutUrl = await createInfinitePayLink({
        orderId,
        amountCents,
        customer: { name, email, phone },
        redirectUrl: `${base}/pagamento/retorno?orderId=${orderId}`,
        webhookUrl: `${base}/api/webhooks/infinitepay`,
      });
    } catch (cause) {
      // Cupom já reservado e estoque intacto (só cai na baixa quando pago) —
      // seguro deixar o pedido como está para o cliente tentar de novo.
      console.error('infinitepay: falha ao criar link de pagamento', cause);
      throw cause;
    }

    const expiresAt = new Date(Date.now() + CHARGE_TTL_MINUTES * 60_000).toISOString();

    return res.status(201).json({
      orderId,
      status: 'pending',
      amount: total,
      checkoutUrl,
      expiresAt,
      requestId: randomUUID(),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.status).json({ error: error.message });
    }
    if (error instanceof OrderError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof InfinitePayError) {
      console.error('infinitepay', error.status, error.detail);
      const status = error.status >= 400 && error.status < 500 ? 400 : 502;
      return res
        .status(status)
        .json({ error: 'Não foi possível gerar a cobrança Pix. Tente novamente em instantes.' });
    }
    console.error('payments', error);
    return res.status(500).json({ error: 'Não foi possível processar o pagamento.' });
  }
}

/** URL pública deste deploy, base do webhook e do retorno do cliente. */
function publicBaseUrl(req: VercelRequest): string {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? req.headers.host;
  return `https://${host}`;
}
