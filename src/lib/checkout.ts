import type { CartItem } from '../types/jersey';

export type PaymentMethod = 'pix' | 'boleto' | 'card';

export interface PayerInput {
  firstName: string;
  lastName: string;
  email: string;
  cpf: string;
  address?: {
    zipCode: string;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
  };
}

export interface PaymentResult {
  id: number;
  status: string;
  statusDetail: string;
  method: PaymentMethod;
  amount: number;
  expiresAt: string | null;
  pix: { qrCode: string; qrCodeBase64: string | null } | null;
  boleto: { url: string | null; barcode: string | null } | null;
}

export class CheckoutError extends Error {}

/** O servidor recalcula o preço — daqui só saem ids, tamanhos e quantidades. */
const toLines = (items: CartItem[]) =>
  items.map((i) => ({ id: i.jersey.id, size: i.size, quantity: i.quantity }));

async function post<T>(url: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new CheckoutError('Sem conexão com o servidor. Tente de novo.');
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new CheckoutError(
      (data as { error?: string } | null)?.error ?? 'Não foi possível processar o pagamento.',
    );
  }
  return data as T;
}

export interface CreatePaymentInput {
  method: PaymentMethod;
  items: CartItem[];
  payer: PayerInput;
  /** Só para cartão: vem do SDK do Mercado Pago, no navegador. */
  token?: string;
  installments?: number;
  paymentMethodId?: string;
  issuerId?: string;
}

export const createPayment = (input: CreatePaymentInput) =>
  post<PaymentResult>('/api/payments', {
    method: input.method,
    items: toLines(input.items),
    payer: input.payer,
    token: input.token,
    installments: input.installments,
    paymentMethodId: input.paymentMethodId,
    issuerId: input.issuerId,
  });

export async function fetchPaymentStatus(id: number) {
  const res = await fetch(`/api/payment-status?id=${id}`);
  if (!res.ok) throw new CheckoutError('Não foi possível consultar o pagamento.');
  return (await res.json()) as { id: number; status: string; statusDetail: string };
}

export const isApproved = (status: string) => status === 'approved';

export const STATUS_LABEL: Record<string, string> = {
  approved: 'Pagamento aprovado',
  pending: 'Aguardando pagamento',
  in_process: 'Pagamento em análise',
  rejected: 'Pagamento recusado',
  cancelled: 'Pagamento cancelado',
};
