/** Cliente das rotas /api. Uma função por recurso, erros já traduzidos. */

import type { Jersey } from '../types/jersey';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      credentials: 'same-origin',
      ...init,
      headers: {
        ...(init.body && !(init.body instanceof Blob)
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError('Sem conexão com o servidor.', 0);
  }

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(
      (data as { error?: string } | null)?.error ?? 'Algo deu errado.',
      res.status,
    );
  }
  return data as T;
}

const json = (body: unknown) => JSON.stringify(body);

// ------------------------------------------------------------------ sessão ---

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  cpf?: string | null;
  phone?: string | null;
}

export const getSession = () =>
  request<{ user: SessionUser | null }>('/api/auth/session').then((r) => r.user);

export const login = (email: string, password: string) =>
  request<{ user: SessionUser }>('/api/auth/login', {
    method: 'POST',
    body: json({ email, password }),
  }).then((r) => r.user);

export const register = (name: string, email: string, password: string) =>
  request<{ user: SessionUser }>('/api/auth/register', {
    method: 'POST',
    body: json({ name, email, password }),
  }).then((r) => r.user);

export const logout = () => request<void>('/api/auth/session', { method: 'DELETE' });

// ---------------------------------------------------------------- produtos ---

export const fetchProducts = () =>
  request<{ products: Jersey[] }>('/api/products').then((r) => r.products);

export const createProduct = (input: unknown) =>
  request<{ product: Jersey }>('/api/products', { method: 'POST', body: json(input) });

export const updateProduct = (id: string, input: unknown) =>
  request<{ product: Jersey }>(`/api/products/${id}`, { method: 'PUT', body: json(input) });

export const deleteProduct = (id: string) =>
  request<void>(`/api/products/${id}`, { method: 'DELETE' });

export async function uploadImage(file: File): Promise<string> {
  const { url } = await request<{ url: string }>('/api/admin/upload', {
    method: 'POST',
    body: file,
    headers: { 'Content-Type': file.type },
  });
  return url;
}

// ------------------------------------------------------------------- conta ---

export interface OrderItem {
  name: string;
  size: string;
  quantity: number;
  unitPrice: number;
  image: string | null;
}

export interface Order {
  id: string;
  email: string;
  total: number;
  status: string;
  paymentMethod: string | null;
  trackingCode: string | null;
  createdAt: string;
  items: OrderItem[];
}

export const fetchOrders = () =>
  request<{ orders: Order[] }>('/api/account/orders').then((r) => r.orders);

export const fetchWishlist = () =>
  request<{ products: Jersey[] }>('/api/account/wishlist').then((r) => r.products);

export const addToWishlist = (productId: string) =>
  request<void>('/api/account/wishlist', { method: 'POST', body: json({ productId }) });

export const removeFromWishlist = (productId: string) =>
  request<void>(`/api/account/wishlist?id=${productId}`, { method: 'DELETE' });

export interface Profile {
  name: string;
  email: string;
  cpf: string | null;
  phone: string | null;
}

export interface Address {
  zipCode: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
}

export const fetchProfile = () =>
  request<{ profile: Profile; address: Address | null }>('/api/account/profile');

export const saveProfile = (input: {
  name: string;
  cpf?: string;
  phone?: string;
  address?: Partial<Address>;
}) => request<void>('/api/account/profile', { method: 'PUT', body: json(input) });
