export type ProductStatus = 'available' | 'sold' | 'draft';

export interface ProductDoc {
  id: string;
  slug: string;
  name: string;
  priceInCents: number;
  originalPriceInCents?: number;
  description: string;
  details?: string[];
  images: string[];
  sizes: string[];
  colors?: string[];
  year?: string;
  club?: string;
  badge?: string;
  category?: string;
  status: ProductStatus;
  featured?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type PaymentMethod = 'pix' | 'credit_card' | 'boleto';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled';

export interface OrderItem {
  productId: string;
  productName: string;
  image: string;
  size: string;
  priceInCents: number;
  quantity: number;
}

export interface CustomerData {
  name: string;
  email: string;
  cpf: string;
  phone: string;
}

export interface ShippingAddress {
  cep: string;
  street: string;
  number: string;
  complement?: string;
  district: string;
  city: string;
  state: string;
}

export interface PaymentData {
  method: PaymentMethod;
  status: PaymentStatus;
  mercadoPagoPaymentId?: string;
  pixQrCode?: string;
  pixQrCodeBase64?: string;
  pixCopyPaste?: string;
  ticketUrl?: string;
  installments?: number;
  cardLast4?: string;
  cardBrand?: string;
  paidAt?: string;
}

export interface OrderDoc {
  id: string;
  userId?: string;
  customer: CustomerData;
  address: ShippingAddress;
  items: OrderItem[];
  subtotalInCents: number;
  shippingCostInCents: number;
  discountInCents: number;
  totalInCents: number;
  shippingMethod: string;
  trackingCode?: string;
  payment: PaymentData;
  status: OrderStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const PIX_DISCOUNT_PERCENT = 5; // 5% de desconto no PIX
export const FREE_SHIPPING_THRESHOLD_CENTS = 50000; // Frete grátis a partir de R$ 500

export function isValidCPF(value: string): boolean {
  const cpf = value.replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  for (const [length, position] of [
    [9, 10],
    [10, 11],
  ]) {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += Number(cpf[i]) * (position - i);
    if (((sum * 10) % 11) % 10 !== Number(cpf[length])) return false;
  }
  return true;
}

export function isValidCEP(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return digits.length === 8 && !/^0{8}$/.test(digits);
}

export function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}
