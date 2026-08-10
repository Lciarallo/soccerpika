/**
 * Cliente mínimo da API do Mercado Pago.
 *
 * Usamos `fetch` direto contra a API REST em vez do SDK: são três endpoints,
 * o contrato é estável e assim o token de acesso nunca sai deste módulo.
 */

const API = 'https://api.mercadopago.com';

export class MercadoPagoError extends Error {
  status: number;
  detail: unknown;

  constructor(message: string, status: number, detail?: unknown) {
    super(message);
    this.name = 'MercadoPagoError';
    this.status = status;
    this.detail = detail;
  }
}

function accessToken(): string {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) {
    throw new MercadoPagoError('MP_ACCESS_TOKEN não configurado no ambiente', 500);
  }
  return token;
}

async function request<T>(
  path: string,
  init: RequestInit & { idempotencyKey?: string } = {},
): Promise<T> {
  const { idempotencyKey, ...rest } = init;

  const res = await fetch(`${API}${path}`, {
    ...rest,
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      'Content-Type': 'application/json',
      ...(idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {}),
      ...rest.headers,
    },
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      (body as { message?: string } | null)?.message ?? `Mercado Pago respondeu ${res.status}`;
    throw new MercadoPagoError(message, res.status, body);
  }

  return body as T;
}

export interface MPPayment {
  id: number;
  status:
    | 'pending'
    | 'approved'
    | 'authorized'
    | 'in_process'
    | 'in_mediation'
    | 'rejected'
    | 'cancelled'
    | 'refunded'
    | 'charged_back';
  status_detail: string;
  payment_method_id: string;
  transaction_amount: number;
  date_of_expiration?: string;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
      ticket_url?: string;
    };
  };
  transaction_details?: {
    external_resource_url?: string;
  };
  barcode?: { content?: string };
}

export const createPayment = (body: unknown, idempotencyKey: string) =>
  request<MPPayment>('/v1/payments', {
    method: 'POST',
    body: JSON.stringify(body),
    idempotencyKey,
  });

export const getPayment = (id: string | number) => request<MPPayment>(`/v1/payments/${id}`);
