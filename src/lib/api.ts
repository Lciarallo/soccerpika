/**
 * Camada de API do Soccer Pika integrada com Firebase (Firestore, Auth, Storage, Functions)
 * Utiliza importação dinâmica para manter o bundle inicial leve e instantâneo.
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
  const { auth, db } = await import('./firebase');
  const user = auth.currentUser;
  if (!user) return null;
  const tokenResult = await user.getIdTokenResult();
  const isAdmin = tokenResult.claims.admin === true;

  let profileData: Record<string, unknown> = {};
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (snap.exists()) profileData = snap.data();
  } catch {
    // fallback
  }

  return {
    id: user.uid,
    email: user.email || '',
    name: user.displayName || (profileData.name as string) || 'Cliente',
    role: isAdmin || profileData.role === 'admin' ? 'admin' : 'user',
    cpf: (profileData.cpf as string) || null,
    phone: (profileData.phone as string) || null,
  };
};

export const logout = async (): Promise<void> => {
  const { auth } = await import('./firebase');
  await auth.signOut();
};

// ---------------------------------------------------------------- produtos ---

export const fetchProducts = async (): Promise<Jersey[]> => {
  try {
    const [{ db }, { collection, query, where, limit, getDocs }] = await Promise.all([
      import('./firebase'),
      import('firebase/firestore'),
    ]);

    const productsRef = collection(db, 'products');
    const q = query(productsRef, where('status', '!=', 'draft'), limit(100));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      return snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        const jersey: Jersey = {
          id: data.id || docSnap.id,
          slug: data.slug || docSnap.id,
          name: data.name,
          club: data.club || '',
          season: data.year || data.season || '',
          era: data.era || 'Sem data',
          category: data.category || 'Outros',
          price: (data.priceInCents ?? 0) / 100,
          brand: data.badge || data.brand || '',
          description: data.description || '',
          images: data.images || ['/logo.png'],
          sizes: data.sizes || ['M'],
          colors: data.colors || [],
          inStock: data.status !== 'sold',
          stockQty: data.status === 'sold' ? 0 : (data.stockQty ?? 1),
          isMatchWorn: data.isMatchWorn ?? false,
          isAutographed: data.isAutographed ?? false,
          isPublished: data.status !== 'draft',
          createdAt: data.createdAt,
        };
        return jersey;
      });
    }
  } catch (err) {
    console.warn('Firestore indisponível, usando catálogo semente:', err);
  }

  // Fallback para semente local se Firestore estiver vazio ou offline
  return initialFeaturedJerseys;
};

export const createProduct = async (input: unknown): Promise<{ product: Jersey }> => {
  try {
    const [{ functions }, { httpsCallable }] = await Promise.all([
      import('./firebase'),
      import('firebase/functions'),
    ]);
    const adminCreateProductFn = httpsCallable<unknown, { product: Jersey }>(
      functions,
      'adminCreateProduct',
    );
    const res = await adminCreateProductFn(input);
    return { product: res.data.product };
  } catch (err: unknown) {
    throw new ApiError((err as Error).message || 'Erro ao criar produto.');
  }
};

export const updateProduct = async (id: string, input: unknown): Promise<{ product: Jersey }> => {
  try {
    const [{ functions }, { httpsCallable }] = await Promise.all([
      import('./firebase'),
      import('firebase/functions'),
    ]);
    const adminUpdateProductFn = httpsCallable<unknown, { product: Jersey }>(
      functions,
      'adminUpdateProduct',
    );
    const res = await adminUpdateProductFn({ id, ...(input as Record<string, unknown>) });
    return { product: res.data.product };
  } catch (err: unknown) {
    throw new ApiError((err as Error).message || 'Erro ao atualizar produto.');
  }
};

export const deleteProduct = async (id: string): Promise<void> => {
  try {
    const [{ functions }, { httpsCallable }] = await Promise.all([
      import('./firebase'),
      import('firebase/functions'),
    ]);
    const adminDeleteProductFn = httpsCallable<{ id: string }, { ok: boolean }>(
      functions,
      'adminDeleteProduct',
    );
    await adminDeleteProductFn({ id });
  } catch (err: unknown) {
    throw new ApiError((err as Error).message || 'Erro ao excluir produto.');
  }
};

export async function uploadImage(file: File): Promise<string> {
  const [{ storage }, { ref, uploadBytes, getDownloadURL }] = await Promise.all([
    import('./firebase'),
    import('firebase/storage'),
  ]);

  const ext = file.name.split('.').pop() || 'webp';
  const cleanName = file.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const storagePath = `products/${Date.now()}_${cleanName}.${ext}`;
  const fileRef = ref(storage, storagePath);

  await uploadBytes(fileRef, file, { contentType: file.type });
  return await getDownloadURL(fileRef);
}

// --------------------------------------------------------------- Instagram ---

export interface InstagramPost {
  id: string;
  href: string;
  src: string;
  alt: string;
}

export const fetchInstagramPosts = async (_signal?: AbortSignal): Promise<InstagramPost[]> => {
  if (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ) {
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
  }

  try {
    const [{ functions }, { httpsCallable }] = await Promise.all([
      import('./firebase'),
      import('firebase/functions'),
    ]);
    const getInstagramFeedFn = httpsCallable<
      void,
      { posts: Array<{ id: string; permalink: string; media_url?: string; caption?: string }> }
    >(functions, 'getInstagramFeed');
    const res = await getInstagramFeedFn();
    return res.data.posts.map((p) => ({
      id: p.id,
      href: p.permalink,
      src: p.media_url || '/instagram/post-1.png',
      alt: p.caption || 'Soccer Pika no Instagram',
    }));
  } catch {
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
  }
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
  const { auth, db } = await import('./firebase');
  const user = auth.currentUser;
  if (!user) return [];

  try {
    const { collection, query, where, orderBy, limit, getDocs } = await import(
      'firebase/firestore'
    );
    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef,
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(50),
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        email: data.customer?.email || user.email || '',
        total: (data.totalInCents ?? 0) / 100,
        status: data.status || 'pending_payment',
        paymentMethod: data.payment?.method || null,
        trackingCode: data.trackingCode || null,
        createdAt: data.createdAt,
        items: (data.items || []).map(
          (i: {
            productName: string;
            size: string;
            quantity: number;
            priceInCents: number;
            image: string;
          }) => ({
            name: i.productName,
            size: i.size,
            quantity: i.quantity,
            unitPrice: (i.priceInCents ?? 0) / 100,
            image: i.image || null,
          }),
        ),
      };
    });
  } catch {
    return [];
  }
};

export const fetchWishlist = async (): Promise<Jersey[]> => {
  const { auth, db } = await import('./firebase');
  const user = auth.currentUser;
  if (!user) return [];

  try {
    const { collection, getDocs } = await import('firebase/firestore');
    const wishlistSnap = await getDocs(collection(db, 'users', user.uid, 'wishlist'));
    const productIds = wishlistSnap.docs.map((d) => d.id);
    if (productIds.length === 0) return [];

    const allProducts = await fetchProducts();
    return allProducts.filter((p) => productIds.includes(p.id));
  } catch {
    return [];
  }
};

export const addToWishlist = async (productId: string): Promise<void> => {
  const { auth, db } = await import('./firebase');
  const user = auth.currentUser;
  if (!user) return;
  const { doc, setDoc } = await import('firebase/firestore');
  await setDoc(doc(db, 'users', user.uid, 'wishlist', productId), {
    productId,
    addedAt: new Date().toISOString(),
  });
};

export const removeFromWishlist = async (productId: string): Promise<void> => {
  const { auth, db } = await import('./firebase');
  const user = auth.currentUser;
  if (!user) return;
  const { doc, deleteDoc } = await import('firebase/firestore');
  await deleteDoc(doc(db, 'users', user.uid, 'wishlist', productId));
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
  const { auth, db } = await import('./firebase');
  const user = auth.currentUser;
  if (!user) throw new ApiError('Não autenticado', 401);

  const { doc, getDoc } = await import('firebase/firestore');
  const snap = await getDoc(doc(db, 'users', user.uid));
  const data = snap.data() || {};

  return {
    profile: {
      name: (data.name as string) || user.displayName || '',
      email: user.email || '',
      cpf: (data.cpf as string) || null,
      phone: (data.phone as string) || null,
    },
    address: (data.address as Address) || null,
  };
};

export const saveProfile = async (input: {
  name: string;
  cpf?: string;
  phone?: string;
  address?: Partial<Address>;
}): Promise<void> => {
  const { auth, db } = await import('./firebase');
  const user = auth.currentUser;
  if (!user) throw new ApiError('Não autenticado', 401);

  const { doc, setDoc } = await import('firebase/firestore');
  await setDoc(
    doc(db, 'users', user.uid),
    {
      ...input,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
};
