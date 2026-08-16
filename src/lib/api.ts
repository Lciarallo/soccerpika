/**
 * Camada de API do Soccer Pika integrada com Vercel Serverless Functions (/api/*)
 */

import type { Jersey } from '../types/jersey';
import { initialFeaturedJerseys } from '../data/featured';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number = 400) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// ------------------------------------------------------------------ sessão ---

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  cpf?: string | null;
  phone?: string | null;
}

export const getSession = async (): Promise<SessionUser | null> => {
  try {
    const res = await fetch('/api/auth/session', { credentials: 'same-origin' });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user || null;
  } catch {
    return null;
  }
};

export const logout = async (): Promise<void> => {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
};

// ---------------------------------------------------------------- produtos ---

export const fetchProducts = async (): Promise<Jersey[]> => {
  try {
    const res = await fetch('/api/products', { credentials: 'same-origin' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.products) && data.products.length > 0) {
        return data.products;
      }
    }
  } catch (err) {
    console.warn('API indisponível, usando catálogo semente:', err);
  }

  return initialFeaturedJerseys;
};

export const createProduct = async (input: unknown): Promise<{ product: Jersey }> => {
  const res = await fetch('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(input),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new ApiError(data.error || 'Erro ao criar produto.', res.status);
  }
  return data;
};

export const updateProduct = async (id: string, input: unknown): Promise<{ product: Jersey }> => {
  const res = await fetch(`/api/products/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(input),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new ApiError(data.error || 'Erro ao atualizar produto.', res.status);
  }
  return data;
};

export const deleteProduct = async (id: string): Promise<void> => {
  const res = await fetch(`/api/products/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'same-origin',
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Erro ao excluir produto.' }));
    throw new ApiError(data.error || 'Erro ao excluir produto.', res.status);
  }
};

export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/admin/upload', {
    method: 'POST',
    credentials: 'same-origin',
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new ApiError(data.error || 'Erro ao fazer upload da imagem.', res.status);
  }
  return data.url;
}

// --------------------------------------------------------------- Instagram ---

export interface InstagramPost {
  id: string;
  href: string;
  src: string;
  alt: string;
}

export const fetchInstagramPosts = async (signal?: AbortSignal): Promise<InstagramPost[]> => {
  try {
    const res = await fetch('/api/instagram', { signal });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.posts) && data.posts.length > 0) {
        return data.posts;
      }
    }
  } catch {
    // fallback
  }

  return [
    {
      id: 'post-1',
      href: 'https://instagram.com/soccerpika',
      src: '/instagram/post-1.png',
      alt: 'Mantos pesados que acabaram de chegar no acervo!',
    },
    {
      id: 'post-2',
      href: 'https://instagram.com/soccerpika',
      src: '/instagram/post-2.png',
      alt: 'Detalhes que contam a história das grandes finais.',
    },
    {
      id: 'post-3',
      href: 'https://instagram.com/soccerpika',
      src: '/instagram/post-3.png',
      alt: 'Autenticidade conferida peça por peça.',
    },
  ];
};

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

export const fetchOrders = async (): Promise<Order[]> => {
  try {
    const res = await fetch('/api/account/orders', { credentials: 'same-origin' });
    if (res.ok) {
      const data = await res.json();
      return data.orders || [];
    }
  } catch {
    // fallback
  }
  return [];
};

export const fetchWishlist = async (): Promise<Jersey[]> => {
  try {
    const res = await fetch('/api/account/wishlist', { credentials: 'same-origin' });
    if (res.ok) {
      const data = await res.json();
      return data.wishlist || [];
    }
  } catch {
    // fallback
  }
  return [];
};

export const addToWishlist = async (productId: string): Promise<void> => {
  await fetch('/api/account/wishlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ productId }),
  });
};

export const removeFromWishlist = async (productId: string): Promise<void> => {
  await fetch(`/api/account/wishlist?productId=${encodeURIComponent(productId)}`, {
    method: 'DELETE',
    credentials: 'same-origin',
  });
};

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

export const fetchProfile = async (): Promise<{ profile: Profile; address: Address | null }> => {
  const res = await fetch('/api/account/profile', { credentials: 'same-origin' });
  const data = await res.json();
  if (!res.ok) {
    throw new ApiError(data.error || 'Não autenticado', res.status);
  }
  return data;
};

export const saveProfile = async (input: {
  name: string;
  cpf?: string;
  phone?: string;
  address?: Partial<Address>;
}): Promise<void> => {
  const res = await fetch('/api/account/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Erro ao salvar perfil.' }));
    throw new ApiError(data.error || 'Erro ao salvar perfil.', res.status);
  }
};

// -------------------------------------------------------------- painel admin ---

export interface PeriodStats {
  revenue: number;
  orderCount: number;
  averageTicket: number;
  unitsSold: number;
}

export interface RankedDatum {
  label: string;
  value: number;
}

export interface DashboardData {
  days: number;
  current: PeriodStats;
  previous: PeriodStats;
  daily: { label: string; value: number }[];
  topProducts: RankedDatum[];
  statusCounts: Record<string, number>;
  lowStock: { id: string; name: string; stockQty: number }[];
  recentOrders: {
    id: string;
    customerName: string | null;
    email: string;
    itemCount: number;
    total: number;
    status: string;
    createdAt: string;
  }[];
}

export const fetchAdminDashboard = async (days: 7 | 30 | 90): Promise<DashboardData> => {
  const res = await fetch(`/api/admin/dashboard?days=${days}`, { credentials: 'same-origin' });
  const data = await res.json();
  if (!res.ok) {
    throw new ApiError(data.error || 'Erro ao carregar o painel.', res.status);
  }
  return data;
};

export interface AdminOrder extends Order {
  customerName: string | null;
}

export const fetchAdminOrders = async (): Promise<AdminOrder[]> => {
  const res = await fetch('/api/admin/orders', { credentials: 'same-origin' });
  const data = await res.json();
  if (!res.ok) {
    throw new ApiError(data.error || 'Erro ao carregar os pedidos.', res.status);
  }
  return data.orders || [];
};

export const updateAdminOrder = async (
  id: string,
  input: { status?: string; trackingCode?: string },
): Promise<void> => {
  const res = await fetch(`/api/admin/orders/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Erro ao atualizar o pedido.' }));
    throw new ApiError(data.error || 'Erro ao atualizar o pedido.', res.status);
  }
};

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: string;
  orderCount: number;
}

export const fetchAdminUsers = async (): Promise<AdminUserRow[]> => {
  const res = await fetch('/api/admin/users', { credentials: 'same-origin' });
  const data = await res.json();
  if (!res.ok) {
    throw new ApiError(data.error || 'Erro ao carregar os usuários.', res.status);
  }
  return data.users || [];
};

export const updateAdminUserRole = async (id: string, role: 'user' | 'admin'): Promise<void> => {
  const res = await fetch(`/api/admin/users/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ role }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Erro ao atualizar o usuário.' }));
    throw new ApiError(data.error || 'Erro ao atualizar o usuário.', res.status);
  }
};
