import { onRequest } from 'firebase-functions/v2/https';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { db } from './auth.js';
import { type OrderDoc } from './domain.js';
import crypto from 'crypto';

export function getMercadoPagoClient(): MercadoPagoConfig {
  const token = process.env.MP_ACCESS_TOKEN || 'TEST-0000000000000000-000000-00000000000000000000000000000000-000000000';
  return new MercadoPagoConfig({
    accessToken: token,
    options: { timeout: 10000 },
  });
}

/** Valida assinatura de webhook HMAC-SHA256 do Mercado Pago quando o segredo estiver configurado. */
function verifyWebhookSignature(
  xSignature: string | undefined,
  xRequestId: string | undefined,
  dataId: string | undefined,
  secret: string | undefined,
): boolean {
  if (!secret) return true; // Se o webhook secret não foi definido, fallback com verificação na API
  if (!xSignature || !dataId) return false;

  const parts = xSignature.split(',').reduce<Record<string, string>>((acc, part) => {
    const [k, v] = part.trim().split('=');
    if (k && v) acc[k] = v;
    return acc;
  }, {});

  const ts = parts.ts;
  const hash = parts.v1;
  if (!ts || !hash) return false;

  const manifest = `id:${dataId};request-id:${xRequestId ?? ''};ts:${ts};`;
  const computed = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  return computed === hash;
}

export const mercadopagoWebhook = onRequest(
  { cors: true, invoker: 'public' },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    try {
      const secret = process.env.MP_WEBHOOK_SECRET;
      const xSignature = req.headers['x-signature'] as string | undefined;
      const xRequestId = req.headers['x-request-id'] as string | undefined;

      const body = req.body ?? {};
      const dataId = body.data?.id || (req.query['data.id'] as string);
      const action = body.action || body.type;

      if (!dataId) {
        res.status(200).json({ ok: true, ignored: 'No data.id' });
        return;
      }

      if (secret && !verifyWebhookSignature(xSignature, xRequestId, dataId, secret)) {
        console.warn('Assinatura do webhook Mercado Pago inválida.');
        res.status(401).send('Invalid signature');
        return;
      }

      if (action !== 'payment.created' && action !== 'payment.updated' && action !== 'payment') {
        res.status(200).json({ ok: true, ignored: action });
        return;
      }

      // Consulta status real do pagamento na API do Mercado Pago
      const client = getMercadoPagoClient();
      const paymentApi = new Payment(client);
      const payment = await paymentApi.get({ id: dataId });

      if (!payment || !payment.id) {
        res.status(200).json({ ok: true, notFound: dataId });
        return;
      }

      const orderId = payment.external_reference;
      if (!orderId) {
        res.status(200).json({ ok: true, noExternalReference: dataId });
        return;
      }

      const orderRef = db.collection('orders').doc(orderId);
      const orderSnap = await orderRef.get();

      if (!orderSnap.exists) {
        console.warn(`Pedido ${orderId} não encontrado no Firestore.`);
        res.status(200).json({ ok: true, orderNotFound: orderId });
        return;
      }

      const order = orderSnap.data() as OrderDoc;
      const mpStatus = payment.status;

      let newOrderStatus: OrderDoc['status'] = order.status;
      let newPaymentStatus: OrderDoc['payment']['status'] = order.payment.status;

      if (mpStatus === 'approved') {
        newPaymentStatus = 'paid';
        if (order.status === 'pending_payment') {
          newOrderStatus = 'paid';
        }
      } else if (mpStatus === 'rejected' || mpStatus === 'cancelled') {
        newPaymentStatus = 'failed';
        if (order.status === 'pending_payment') {
          newOrderStatus = 'cancelled';
          // Se o pagamento falhou, liberar produto de volta
          for (const item of order.items) {
            await db.collection('products').doc(item.productId).update({
              status: 'available',
              updatedAt: new Date().toISOString(),
            }).catch(() => {});
          }
        }
      } else if (mpStatus === 'refunded') {
        newPaymentStatus = 'refunded';
      }

      await orderRef.update({
        'payment.status': newPaymentStatus,
        'payment.mercadoPagoPaymentId': String(payment.id),
        'payment.paidAt': mpStatus === 'approved' ? (payment.date_approved || new Date().toISOString()) : undefined,
        status: newOrderStatus,
        updatedAt: new Date().toISOString(),
      });

      console.log(`Pedido ${orderId} atualizado para status=${newOrderStatus}, payment=${newPaymentStatus}`);
      res.status(200).json({ ok: true, orderId, status: newOrderStatus });
    } catch (error) {
      console.error('Erro no processamento do webhook:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  },
);
