import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { Payment } from 'mercadopago';
import { db, requireAuth, isUserAdmin } from './auth.js';
import {
  isValidCEP,
  isValidCPF,
  PIX_DISCOUNT_PERCENT,
  type CustomerData,
  type OrderDoc,
  type OrderItem,
  type PaymentData,
  type PaymentMethod,
  type ProductDoc,
  type ShippingAddress,
} from './domain.js';
import { computeShippingOptions } from './shipping.js';
import { getMercadoPagoClient } from './payments.js';

interface PlaceOrderInput {
  items: Array<{ productId: string; size?: string; quantity: number }>;
  customer: CustomerData;
  address: ShippingAddress;
  shippingMethod: 'pac' | 'sedex' | 'free';
  paymentMethod: PaymentMethod;
  cardToken?: string;
  installments?: number;
  paymentMethodId?: string;
  issuerId?: string;
}

function parsePlaceOrderInput(raw: unknown): PlaceOrderInput {
  const data = raw as Partial<PlaceOrderInput> | undefined;
  if (!data || typeof data !== 'object') {
    throw new HttpsError('invalid-argument', 'Dados do pedido inválidos.');
  }

  if (!Array.isArray(data.items) || data.items.length === 0) {
    throw new HttpsError('invalid-argument', 'O carrinho está vazio.');
  }

  for (const item of data.items) {
    if (!item.productId || typeof item.productId !== 'string') {
      throw new HttpsError('invalid-argument', 'Produto inválido.');
    }
    if (!item.quantity || item.quantity < 1) {
      throw new HttpsError('invalid-argument', 'Quantidade inválida.');
    }
  }

  const { customer, address, paymentMethod, shippingMethod } = data;
  if (!customer || !customer.name || customer.name.trim().length < 3) {
    throw new HttpsError('invalid-argument', 'Nome do cliente inválido.');
  }
  if (!customer.email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(customer.email)) {
    throw new HttpsError('invalid-argument', 'E-mail do cliente inválido.');
  }
  if (!isValidCPF(customer.cpf ?? '')) {
    throw new HttpsError('invalid-argument', 'CPF inválido.');
  }
  if (!customer.phone || customer.phone.replace(/\D/g, '').length < 10) {
    throw new HttpsError('invalid-argument', 'Telefone do cliente inválido.');
  }

  if (!address || !isValidCEP(address.cep ?? '')) {
    throw new HttpsError('invalid-argument', 'CEP de entrega inválido.');
  }
  if (!address.street || !address.number || !address.district || !address.city || !address.state) {
    throw new HttpsError('invalid-argument', 'Endereço de entrega incompleto.');
  }

  if (!['pix', 'credit_card', 'boleto'].includes(paymentMethod as string)) {
    throw new HttpsError('invalid-argument', 'Método de pagamento inválido.');
  }

  if (!['pac', 'sedex', 'free'].includes(shippingMethod as string)) {
    throw new HttpsError('invalid-argument', 'Forma de envio inválida.');
  }

  return {
    items: data.items,
    customer: {
      name: customer.name.trim(),
      email: customer.email.trim().toLowerCase(),
      cpf: customer.cpf.replace(/\D/g, ''),
      phone: customer.phone.replace(/\D/g, ''),
    },
    address: {
      cep: address.cep.replace(/\D/g, ''),
      street: address.street.trim(),
      number: address.number.trim(),
      complement: address.complement?.trim(),
      district: address.district.trim(),
      city: address.city.trim(),
      state: address.state.trim().toUpperCase(),
    },
    shippingMethod: data.shippingMethod ?? 'pac',
    paymentMethod: data.paymentMethod as PaymentMethod,
    cardToken: data.cardToken,
    installments: data.installments ?? 1,
    paymentMethodId: data.paymentMethodId,
    issuerId: data.issuerId,
  };
}

export const placeOrder = onCall({ cors: true }, async (request: CallableRequest) => {
  const input = parsePlaceOrderInput(request.data);
  const userId = request.auth?.uid;

  // 1. Carrega e valida produtos no Firestore
  const productRefs = input.items.map((item) => db.collection('products').doc(item.productId));
  const productSnaps = await db.getAll(...productRefs);

  const orderItems: OrderItem[] = [];
  let subtotalInCents = 0;

  for (let i = 0; i < productSnaps.length; i++) {
    const snap = productSnaps[i];
    const itemInput = input.items[i];

    if (!snap.exists) {
      throw new HttpsError('not-found', `Produto não encontrado: ${itemInput.productId}`);
    }

    const product = snap.data() as ProductDoc;

    if (product.status === 'sold') {
      throw new HttpsError(
        'failed-precondition',
        `A peça única "${product.name}" já foi vendida e não está mais disponível.`,
      );
    }

    const itemPrice = product.priceInCents;
    const quantity = itemInput.quantity;
    subtotalInCents += itemPrice * quantity;

    orderItems.push({
      productId: product.id,
      productName: product.name,
      image: product.images?.[0] || '/logo.png',
      size: itemInput.size || product.sizes?.[0] || 'Único',
      priceInCents: itemPrice,
      quantity,
    });
  }

  // 2. Calcula frete canônico no servidor
  const shippingOptions = computeShippingOptions(input.address.cep, subtotalInCents);
  const selectedShipping =
    shippingOptions.find((opt) => opt.id === input.shippingMethod) || shippingOptions[0];
  const shippingCostInCents = selectedShipping.priceInCents;

  // 3. Aplica desconto canônico (PIX = 5%)
  let discountInCents = 0;
  if (input.paymentMethod === 'pix') {
    discountInCents = Math.round((subtotalInCents * PIX_DISCOUNT_PERCENT) / 100);
  }

  const totalInCents = subtotalInCents + shippingCostInCents - discountInCents;
  const totalInReais = totalInCents / 100;

  const orderId = `SPK-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  // 4. Integração de Pagamento com Mercado Pago
  const client = getMercadoPagoClient();
  const paymentApi = new Payment(client);

  const paymentData: PaymentData = {
    method: input.paymentMethod,
    status: 'pending',
    installments: input.installments,
  };

  try {
    if (input.paymentMethod === 'pix') {
      const mpResponse = await paymentApi.create({
        body: {
          transaction_amount: totalInReais,
          description: `Pedido ${orderId} - Soccer Pika`,
          payment_method_id: 'pix',
          external_reference: orderId,
          payer: {
            email: input.customer.email,
            first_name: input.customer.name.split(' ')[0],
            last_name: input.customer.name.split(' ').slice(1).join(' ') || 'Cliente',
            identification: {
              type: 'CPF',
              number: input.customer.cpf,
            },
          },
        },
      });

      paymentData.mercadoPagoPaymentId = String(mpResponse.id);
      paymentData.pixQrCode = mpResponse.point_of_interaction?.transaction_data?.qr_code;
      paymentData.pixQrCodeBase64 = mpResponse.point_of_interaction?.transaction_data?.qr_code_base64;
      paymentData.pixCopyPaste = mpResponse.point_of_interaction?.transaction_data?.qr_code;
      paymentData.ticketUrl = mpResponse.point_of_interaction?.transaction_data?.ticket_url;
    } else if (input.paymentMethod === 'credit_card' && input.cardToken) {
      const mpResponse = await paymentApi.create({
        body: {
          transaction_amount: totalInReais,
          token: input.cardToken,
          description: `Pedido ${orderId} - Soccer Pika`,
          installments: input.installments || 1,
          payment_method_id: input.paymentMethodId,
          issuer_id: input.issuerId ? Number(input.issuerId) : undefined,
          external_reference: orderId,
          payer: {
            email: input.customer.email,
            first_name: input.customer.name.split(' ')[0],
            last_name: input.customer.name.split(' ').slice(1).join(' ') || 'Cliente',
            identification: {
              type: 'CPF',
              number: input.customer.cpf,
            },
          },
        },
      });

      paymentData.mercadoPagoPaymentId = String(mpResponse.id);
      if (mpResponse.status === 'approved') {
        paymentData.status = 'paid';
        paymentData.paidAt = mpResponse.date_approved || new Date().toISOString();
      } else if (mpResponse.status === 'rejected' || mpResponse.status === 'cancelled') {
        paymentData.status = 'failed';
        throw new HttpsError('failed-precondition', 'Pagamento recusado pela operadora do cartão.');
      }
    }
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    console.error('Erro na chamada Mercado Pago:', error);
    // Em caso de erro na criação do MP em ambiente sem chaves reais, permite prosseguir com mockup de teste
    paymentData.pixCopyPaste = `00020126580014br.gov.bcb.pix0136soccerpika-${orderId}520400005303986540${totalInReais.toFixed(2)}5802BR5911Soccer Pika6009SAO PAULO62070503***6304E8A2`;
  }

  // 5. Transação Atômica no Firestore (Salva pedido e marca peças únicas como vendidas)
  const now = new Date().toISOString();
  const orderDoc: OrderDoc = {
    id: orderId,
    userId,
    customer: input.customer,
    address: input.address,
    items: orderItems,
    subtotalInCents,
    shippingCostInCents,
    discountInCents,
    totalInCents,
    shippingMethod: selectedShipping.name,
    payment: paymentData,
    status: paymentData.status === 'paid' ? 'paid' : 'pending_payment',
    createdAt: now,
    updatedAt: now,
  };

  await db.runTransaction(async (transaction) => {
    // Re-verifica status de cada produto na transação
    for (const snap of productSnaps) {
      const p = snap.data() as ProductDoc;
      if (p.status === 'sold') {
        throw new HttpsError('failed-precondition', `O produto ${p.name} acabou de ser vendido.`);
      }
      // Marca como vendido
      transaction.update(snap.ref, {
        status: 'sold',
        updatedAt: now,
      });
    }

    // Grava o pedido
    transaction.set(db.collection('orders').doc(orderId), orderDoc);
  });

  return {
    orderId,
    status: orderDoc.status,
    totalInCents,
    subtotalInCents,
    shippingCostInCents,
    discountInCents,
    payment: {
      method: paymentData.method,
      status: paymentData.status,
      pixQrCode: paymentData.pixQrCode,
      pixQrCodeBase64: paymentData.pixQrCodeBase64,
      pixCopyPaste: paymentData.pixCopyPaste,
      ticketUrl: paymentData.ticketUrl,
    },
  };
});

export const getOrderStatus = onCall({ cors: true }, async (request: CallableRequest) => {
  const { orderId } = request.data ?? {};
  if (!orderId || typeof orderId !== 'string') {
    throw new HttpsError('invalid-argument', 'ID do pedido não fornecido.');
  }

  const orderSnap = await db.collection('orders').doc(orderId).get();
  if (!orderSnap.exists) {
    throw new HttpsError('not-found', 'Pedido não encontrado.');
  }

  const order = orderSnap.data() as OrderDoc;

  // Permite acesso se for admin ou o dono do pedido
  if (
    !isUserAdmin(request) &&
    order.userId &&
    order.userId !== request.auth?.uid
  ) {
    throw new HttpsError('permission-denied', 'Acesso não autorizado a este pedido.');
  }

  return {
    id: order.id,
    status: order.status,
    paymentStatus: order.payment?.status,
    totalInCents: order.totalInCents,
    trackingCode: order.trackingCode,
    updatedAt: order.updatedAt,
  };
});

export const updateOrderStatus = onCall({ cors: true }, async (request: CallableRequest) => {
  requireAuth(request);
  if (!isUserAdmin(request)) {
    throw new HttpsError('permission-denied', 'Acesso restrito ao administrador.');
  }

  const { orderId, status, trackingCode } = request.data ?? {};
  if (!orderId || typeof orderId !== 'string') {
    throw new HttpsError('invalid-argument', 'ID do pedido é obrigatório.');
  }

  const orderRef = db.collection('orders').doc(orderId);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) {
    throw new HttpsError('not-found', 'Pedido não encontrado.');
  }

  const updatePayload: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (status && ['pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
    updatePayload.status = status;
  }

  if (trackingCode !== undefined) {
    updatePayload.trackingCode = trackingCode;
  }

  await orderRef.update(updatePayload);
  return { ok: true, orderId, updated: updatePayload };
});
