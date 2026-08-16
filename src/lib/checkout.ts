import type { CartItem } from '../types/jersey';

export interface PayerInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

export interface PaymentResult {
  orderId: string;
  status: string;
  amount: number;
  expiresAt: string | null;
  checkoutUrl: string;
}

export class CheckoutError extends Error {}

export interface CreatePaymentInput {
  items: CartItem[];
  payer: PayerInput;
  shippingMethod?: string;
  shippingCep?: string;
}

/** Cria o pedido e devolve o link de pagamento Pix hospedado na InfinitePay. */
export async function createPayment(input: CreatePaymentInput): Promise<PaymentResult> {
  const payload = {
    items: input.items.map((i) => ({
      productId: i.jersey.id,
      size: i.size,
      quantity: i.quantity,
    })),
    customer: {
      name: `${input.payer.firstName} ${input.payer.lastName}`.trim(),
      email: input.payer.email,
      phone: input.payer.phone || undefined,
    },
    shippingMethod: input.shippingMethod === 'sedex' ? 'sedex' : 'pac',
    shippingCep: input.shippingCep,
  };

  try {
    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Não foi possível gerar a cobrança Pix.');
    }

    return {
      orderId: data.orderId,
      status: data.status,
      amount: data.amount,
      expiresAt: data.expiresAt ?? null,
      checkoutUrl: data.checkoutUrl,
    };
  } catch (err: unknown) {
    if (err instanceof CheckoutError) throw err;
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
  const cleanCep = cep.replace(/\D/g, '');
  if (cleanCep.length !== 8) {
    return [];
  }

  const itemsParam = items.map((i) => `${i.jersey.id}:${i.quantity}`).join(',');

  try {
    const res = await fetch(`/api/shipping?cep=${encodeURIComponent(cleanCep)}&items=${encodeURIComponent(itemsParam)}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch {
    // fallback gracioso
  }

  const isLocalRS = cleanCep.startsWith('9');
  return [
    { method: 'pac', priceCents: isLocalRS ? 1890 : 2890, deliveryDays: isLocalRS ? 3 : 7 },
    { method: 'sedex', priceCents: isLocalRS ? 2990 : 4990, deliveryDays: isLocalRS ? 1 : 3 },
  ];
}

export interface OrderStatus {
  id: string;
  status: string;
  statusDetail?: string;
}

export async function fetchPaymentStatus(orderId: string): Promise<OrderStatus> {
  try {
    const res = await fetch(`/api/payment-status?id=${encodeURIComponent(orderId)}`, {
      credentials: 'same-origin',
    });
    if (res.ok) {
      const data = await res.json();
      return { id: data.id, status: data.status, statusDetail: data.statusDetail || data.status };
    }
  } catch {
    // fallback
  }
  return { id: orderId, status: 'pending', statusDetail: 'pending' };
}

/** Confirma na hora, a partir do retorno do cliente na InfinitePay. */
export async function syncPayment(
  orderId: string,
  coords?: { transactionNsu?: string; slug?: string; orderNsu?: string },
): Promise<OrderStatus & { paid: boolean }> {
  try {
    const res = await fetch('/api/payment-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ orderId, ...coords }),
    });
    const data = await res.json();
    if (res.ok) {
      return { id: orderId, status: data.status, paid: Boolean(data.paid) };
    }
  } catch {
    // fallback
  }
  return { id: orderId, status: 'pending', paid: false };
}

export const isApproved = (status: string) => status === 'paid';

export const STATUS_LABEL: Record<string, string> = {
  pending: 'Aguardando pagamento',
  paid: 'Pagamento aprovado',
  shipped: 'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
  oversold: 'Em conferência',
};
