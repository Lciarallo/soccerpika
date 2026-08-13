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
      zipCode: input.payer.address?.zipCode || input.shippingCep || '',
      street: input.payer.address?.street || 'Rua Principal',
      number: input.payer.address?.number || '100',
      complement: input.payer.address?.complement || '',
      neighborhood: input.payer.address?.neighborhood || 'Centro',
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
    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Não foi possível processar o pagamento.');
    }

    return {
      id: data.id || data.orderId,
      orderId: data.orderId || String(data.id),
      status: data.status,
      statusDetail: data.statusDetail || data.status,
      method: input.method,
      amount: data.amount,
      expiresAt: data.expiresAt || null,
      pix: data.pix || null,
      boleto: data.boleto || null,
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

export async function fetchPaymentStatus(id: string | number) {
  try {
    const res = await fetch(`/api/payment-status?id=${encodeURIComponent(String(id))}`, {
      credentials: 'same-origin',
    });
    if (res.ok) {
      const data = await res.json();
      return {
        id: data.id,
        status: data.status,
        statusDetail: data.statusDetail || data.status,
      };
    }
  } catch {
    // fallback
  }
  return { id, status: 'pending', statusDetail: 'pending' };
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
