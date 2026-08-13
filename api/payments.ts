/**
 * POST /api/payments — cria uma cobrança no Mercado Pago.
 *
 * Aceita três métodos:
 *   pix    -> devolve QR code e código copia-e-cola
 *   boleto -> devolve link do PDF e linha digitável
 *   card   -> cobra com o token gerado no navegador pelo SDK do Mercado Pago
 *
 * Dados de cartão nunca passam por aqui: o navegador tokeniza direto com o
 * Mercado Pago e nos manda só o token de uso único.
 */

import { randomUUID } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AuthError, currentUser } from './_lib/auth.js';
import { createPayment, MercadoPagoError } from './_lib/mercadopago.js';
import {
  buildOrder,
  normalizeCpf,
  OrderError,
  requireEmail,
  requireName,
} from './_lib/order.js';
import { createOrder } from './_lib/orders.js';
import { decrementStock } from './_lib/products.js';
import { clientIp, enforceRateLimit } from './_lib/rateLimit.js';

const METHODS = new Set(['pix', 'boleto', 'card']);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  try {
    await enforceRateLimit(`payments:ip:${clientIp(req)}`, { max: 30, windowSeconds: 600 });

    const body = (req.body ?? {}) as Record<string, unknown>;
    const method = String(body.method ?? '');
    const shippingMethod = String(body.shippingMethod ?? '');
    const shippingCep = String(body.shippingCep ?? '');
    
    if (!METHODS.has(method)) {
      return res.status(400).json({ error: 'Método de pagamento inválido.' });
    }

    const { lines, total, title, shippingCents, shippingMethodStr } = await buildOrder(body.items, shippingCep, shippingMethod);
    const payer = (body.payer ?? {}) as Record<string, unknown>;
    const user = await currentUser(req);

    const email = requireEmail(payer.email);
    const firstName = requireName(payer.firstName, 'Nome');
    const lastName = requireName(payer.lastName, 'Sobrenome');
    const cpf = normalizeCpf(payer.cpf);

    const base = {
      transaction_amount: total,
      description: title,
      external_reference: `spk-${randomUUID()}`,
      statement_descriptor: 'SOCCERPIKA',
      metadata: {
        lines: lines.map((l) => `${l.id}|${l.size}|${l.quantity}`),
      },
      payer: {
        email,
        first_name: firstName,
        last_name: lastName,
        identification: { type: 'CPF', number: cpf },
      },
      notification_url: notificationUrl(req),
    };

    let payload: Record<string, unknown>;

    if (method === 'pix') {
      payload = { ...base, payment_method_id: 'pix' };
    } else if (method === 'boleto') {
      const address = (payer.address ?? {}) as Record<string, unknown>;
      payload = {
        ...base,
        payment_method_id: 'bolbradesco',
        payer: {
          ...base.payer,
          address: {
            zip_code: String(address.zipCode ?? '').replace(/\D/g, ''),
            street_name: String(address.street ?? ''),
            street_number: String(address.number ?? ''),
            neighborhood: String(address.neighborhood ?? ''),
            city: String(address.city ?? ''),
            federal_unit: String(address.state ?? '').toUpperCase().slice(0, 2),
          },
        },
      };
      const a = (payload.payer as { address: Record<string, string> }).address;
      if (a.zip_code.length !== 8 || !a.street_name || !a.city || a.federal_unit.length !== 2) {
        return res.status(400).json({ error: 'Endereço incompleto para emitir o boleto.' });
      }
    } else {
      const token = String(body.token ?? '');
      const installments = Number(body.installments ?? 1);
      if (!token) {
        return res.status(400).json({ error: 'Token do cartão ausente.' });
      }
      if (!Number.isInteger(installments) || installments < 1 || installments > 12) {
        return res.status(400).json({ error: 'Número de parcelas inválido.' });
      }
      payload = {
        ...base,
        token,
        installments,
        payment_method_id: body.paymentMethodId,
        issuer_id: body.issuerId,
      };
    }

    const payment = await createPayment(payload, base.external_reference);
    const data = payment.point_of_interaction?.transaction_data;

    // Registra o pedido logo na criação: Pix e boleto só são pagos depois, e
    // sem o registro o webhook não teria a que se referir.
    await createOrder({
      userId: user?.id ?? null,
      email,
      total,
      paymentId: String(payment.id),
      paymentMethod: method,
      status: payment.status,
      lines,
      shippingCents,
      shippingMethod: shippingMethodStr,
      shippingCep,
    });

    // Cartão aprovado na hora já baixa o estoque; os demais esperam o webhook.
    if (payment.status === 'approved') {
      await decrementStock(lines.map((l) => ({ productId: l.id, quantity: l.quantity })));
    }

    return res.status(201).json({
      id: payment.id,
      status: payment.status,
      statusDetail: payment.status_detail,
      method,
      amount: payment.transaction_amount,
      expiresAt: payment.date_of_expiration ?? null,
      pix: data?.qr_code
        ? { qrCode: data.qr_code, qrCodeBase64: data.qr_code_base64 ?? null }
        : null,
      boleto:
        method === 'boleto'
          ? {
              url: payment.transaction_details?.external_resource_url ?? null,
              barcode: payment.barcode?.content ?? null,
            }
          : null,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.status).json({ error: error.message });
    }
    if (error instanceof OrderError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof MercadoPagoError) {
      console.error('mercadopago', error.status, error.detail);
      // 4xx do gateway é problema do pedido; 5xx é problema nosso.
      const status = error.status >= 400 && error.status < 500 ? 400 : 502;
      return res.status(status).json({ error: error.message });
    }
    console.error('payments', error);
    return res.status(500).json({ error: 'Não foi possível criar o pagamento.' });
  }
}

/** URL pública deste deploy, para o Mercado Pago mandar as notificações. */
function notificationUrl(req: VercelRequest): string | undefined {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? req.headers.host;
  return host ? `https://${host}/api/webhooks/mercadopago` : undefined;
}
