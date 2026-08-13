import type { CartItem } from '../types/jersey';

export type PaymentMethod = 'pix' | 'boleto' | 'card';

export interface PayerInput {
  firstName: string;
  lastName: string;
  email: string;
  cpf: string;
  phone?: string;
  address?: {
    zipCode: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
  };
}

export interface PaymentResult {
  id: string | number;
  orderId: string;
  status: string;
  statusDetail?: string;
  method: PaymentMethod;
  amount: number;
  expiresAt: string | null;
  pix: {
    qrCode: string;
    qrCodeBase64: string | null;
    copyPaste?: string;
  } | null;
  boleto: { url: string | null; barcode: string | null } | null;
}

export class CheckoutError extends Error {}

export interface CreatePaymentInput {
  method: PaymentMethod;
  items: CartItem[];
  payer: PayerInput;
  token?: string;
  installments?: number;
  paymentMethodId?: string;
  issuerId?: string;
  shippingMethod?: string;
  shippingCep?: string;
}

export async function createPayment(input: CreatePaymentInput): Promise<PaymentResult> {
  const methodMap: Record<PaymentMethod, 'pix' | 'credit_card' | 'boleto'> = {
    pix: 'pix',
    card: 'credit_card',
    boleto: 'boleto',
  };

  const payload = {
    items: input.items.map((i) => ({
      productId: i.jersey.id,
      size: i.size,
      quantity: i.quantity,
    })),
    customer: {
      name: `${input.payer.firstName} ${input.payer.lastName}`.trim(),
      email: input.payer.email,
      cpf: input.payer.cpf,
      phone: input.payer.phone || '11999999999',
    },
    address: {
      cep: input.payer.address?.zipCode || input.shippingCep || '',
      street: input.payer.address?.street || 'Rua Principal',
      number: input.payer.address?.number || '100',
      complement: input.payer.address?.complement || '',
      district: input.payer.address?.neighborhood || 'Centro',
      city: input.payer.address?.city || 'Porto Alegre',
      state: input.payer.address?.state || 'RS',
    },
    shippingMethod: input.shippingMethod === 'sedex' ? 'sedex' : 'pac',
    paymentMethod: methodMap[input.method] || 'pix',
    cardToken: input.token,
    installments: input.installments || 1,
    paymentMethodId: input.paymentMethodId,
    issuerId: input.issuerId,
  };

  try {
    const [{ functions }, { httpsCallable }] = await Promise.all([
      import('./firebase'),
      import('firebase/functions'),
    ]);

    const placeOrderFn = httpsCallable<
      typeof payload,
      {
        orderId: string;
        status: string;
        totalInCents: number;
        payment: {
          method: string;
          status: string;
          pixQrCode?: string;
          pixQrCodeBase64?: string;
          pixCopyPaste?: string;
          ticketUrl?: string;
        };
      }
    >(functions, 'placeOrder');

    const response = await placeOrderFn(payload);
    const data = response.data;

    return {
      id: data.orderId,
      orderId: data.orderId,
      status: data.status,
      statusDetail: data.payment.status,
      method: input.method,
      amount: data.totalInCents / 100,
      expiresAt: null,
      pix:
        input.method === 'pix'
          ? {
              qrCode: data.payment.pixCopyPaste || data.payment.pixQrCode || '',
              qrCodeBase64: data.payment.pixQrCodeBase64 || null,
              copyPaste: data.payment.pixCopyPaste || data.payment.pixQrCode || '',
            }
          : null,
      boleto:
        input.method === 'boleto'
          ? {
              url: data.payment.ticketUrl || null,
              barcode: null,
            }
          : null,
    };
  } catch (err: unknown) {
    const errorMsg =
      (err as { message?: string })?.message ||
      'Não foi possível processar o pedido. Tente novamente.';
    throw new CheckoutError(errorMsg);
  }
}

export interface ShippingOption {
  method: string;
  priceCents: number;
  deliveryDays: number;
}

export async function fetchShipping(cep: string, items: CartItem[]): Promise<ShippingOption[]> {
  try {
    const subtotalInCents = items.reduce(
      (sum, i) => sum + Math.round(i.jersey.price * 100) * i.quantity,
      0,
    );

    const [{ functions }, { httpsCallable }] = await Promise.all([
      import('./firebase'),
      import('firebase/functions'),
    ]);

    const calculateShippingFn = httpsCallable<
      { cep: string; subtotalInCents: number },
      { options: Array<{ id: string; name: string; priceInCents: number; deliveryDays: number }> }
    >(functions, 'calculateShipping');

    const res = await calculateShippingFn({ cep, subtotalInCents });
    return res.data.options.map((opt) => ({
      method: opt.id,
      priceCents: opt.priceInCents,
      deliveryDays: opt.deliveryDays,
    }));
  } catch {
    // Fallback gracioso para cálculo local se a função estiver em cold start
    const cleanCep = cep.replace(/\D/g, '');
    const isLocalRS = cleanCep.startsWith('9');
    return [
      { method: 'pac', priceCents: isLocalRS ? 1890 : 2890, deliveryDays: isLocalRS ? 3 : 7 },
      { method: 'sedex', priceCents: isLocalRS ? 2990 : 4990, deliveryDays: isLocalRS ? 1 : 3 },
    ];
  }
}

export async function fetchPaymentStatus(id: string | number) {
  try {
    const [{ functions }, { httpsCallable }] = await Promise.all([
      import('./firebase'),
      import('firebase/functions'),
    ]);

    const getOrderStatusFn = httpsCallable<
      { orderId: string },
      { id: string; status: string; paymentStatus?: string }
    >(functions, 'getOrderStatus');

    const res = await getOrderStatusFn({ orderId: String(id) });
    return {
      id: res.data.id,
      status: res.data.status,
      statusDetail: res.data.paymentStatus || res.data.status,
    };
  } catch {
    return { id, status: 'pending', statusDetail: 'pending' };
  }
}

export const isApproved = (status: string) => status === 'approved' || status === 'paid';

export const STATUS_LABEL: Record<string, string> = {
  approved: 'Pagamento aprovado',
  paid: 'Pagamento aprovado',
  pending: 'Aguardando pagamento',
  pending_payment: 'Aguardando pagamento',
  in_process: 'Pagamento em análise',
  rejected: 'Pagamento recusado',
  cancelled: 'Pagamento cancelado',
};
