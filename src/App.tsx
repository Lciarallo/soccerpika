import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import './App.css';
import * as api from './lib/api';
import { ALL, buildCategoryTree, matchesCategory } from './lib/categories';
import type { CartItem, FilterState, Jersey } from './types/jersey';
import { SessionProvider } from './hooks/useSession';
import { useSession } from './hooks/session-context';
import { useRoute } from './hooks/useRoute';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { FeaturedCarousel } from './components/FeaturedCarousel';
import { Catalog } from './components/Catalog';
import { ProductModal } from './components/ProductModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { AuthModal } from './components/AuthModal';
import { AuthenticityChecker } from './components/AuthenticityChecker';
import { InstagramSection } from './components/InstagramSection';
import { SellJerseyForm } from './components/SellJerseyForm';
import { Footer } from './components/Footer';
import { AccountPage } from './pages/AccountPage';
import { AdminDashboard } from './pages/AdminDashboard';

const INITIAL_FILTERS: FilterState = {
  query: '',
  category: ALL,
  era: 'Todas',
  brand: 'Todas',
  onlyInStock: false,
  sortBy: 'destaque',
};

export default function App() {
  return (
    <SessionProvider>
      <Routes />
    </SessionProvider>
  );
}

function Routes() {
  const { path, navigate } = useRoute();

  if (path.startsWith('/admin')) {
    return <AdminDashboard onExit={() => navigate('/')} />;
  }
  if (path.startsWith('/conta')) {
    return <AccountPage onExit={() => navigate('/')} />;
  }
  return <Storefront navigate={navigate} />;
}

function Storefront({ navigate }: { navigate: (to: string) => void }) {
  const { user, isAdmin } = useSession();

  const [jerseys, setJerseys] = useState<Jersey[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [selected, setSelected] = useState<Jersey | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());

  useEffect(() => {
    api
      .fetchProducts()
      .then(setJerseys)
      .catch((e) => setLoadError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // A lista de desejos só existe para quem está logado.
  useEffect(() => {
    if (!user) {
      setWishlist(new Set());
      return;
    }
    api
      .fetchWishlist()
      .then((items) => setWishlist(new Set(items.map((i) => i.id))))
      .catch(() => setWishlist(new Set()));
  }, [user]);

  const categoryTree = useMemo(() => buildCategoryTree(jerseys), [jerseys]);

  const visible = useMemo(() => {
    const q = filters.query.trim().toLowerCase();

    const list = jerseys.filter((j) => {
      if (!matchesCategory(j, filters.category)) return false;
      if (filters.onlyInStock && !j.inStock) return false;
      if (!q) return true;
      return [j.name, j.club, j.brand, j.season, j.description]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });

    switch (filters.sortBy) {
      case 'preco-asc':
        return list.toSorted((a, b) => a.price - b.price);
      case 'preco-desc':
        return list.toSorted((a, b) => b.price - a.price);
      case 'nome':
        return list.toSorted((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      default:
        // Destaques: disponíveis primeiro, depois pelo valor da peça.
        return list.toSorted(
          (a, b) => Number(b.inStock) - Number(a.inStock) || b.price - a.price,
        );
    }
  }, [jerseys, filters]);

  const featured = useMemo(
    () => jerseys.filter((j) => j.inStock).toSorted((a, b) => b.price - a.price),
    [jerseys],
  );

  const featuredReversed = useMemo(() => featured.toReversed(), [featured]);

  const setFilter = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
      setFilters((prev) => ({ ...prev, [key]: value })),
    [],
  );

  const addToCart = useCallback((jersey: Jersey, size: string) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.jersey.id === jersey.id && i.size === size);
      if (existing) {
        return prev.map((i) =>
          i === existing
            ? { ...i, quantity: Math.min(i.quantity + 1, jersey.stockQty) }
            : i,
        );
      }
      return [...prev, { jersey, size, quantity: 1 }];
    });
    setSelected(null);
    setCartOpen(true);
  }, []);

  const toggleWishlist = useCallback(
    async (jersey: Jersey) => {
      if (!user) {
        setAuthOpen(true);
        return;
      }
      const saved = wishlist.has(jersey.id);
      // Atualiza na hora e desfaz se o servidor recusar.
      setWishlist((prev) => {
        const next = new Set(prev);
        if (saved) next.delete(jersey.id);
        else next.add(jersey.id);
        return next;
      });
      try {
        if (saved) await api.removeFromWishlist(jersey.id);
        else await api.addToWishlist(jersey.id);
      } catch {
        setWishlist((prev) => {
          const next = new Set(prev);
          if (saved) next.add(jersey.id);
          else next.delete(jersey.id);
          return next;
        });
      }
    },
    [user, wishlist],
  );

  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <>
      <Header
        cartCount={cartCount}
        onOpenCart={() => setCartOpen(true)}
        query={filters.query}
        onQueryChange={(v) => setFilter('query', v)}
        categoryTree={categoryTree}
        activeCategory={filters.category}
        onCategoryChange={(v) => setFilter('category', v)}
        user={user}
        isAdmin={isAdmin}
        onLogin={() => setAuthOpen(true)}
        onNavigate={navigate}
      />

      <main>
        <Hero />

        {loading ? (
          <p className="flex items-center justify-center gap-2 py-24 text-sm text-muted">
            <Loader2 size={16} className="animate-spin" /> Carregando o acervo…
          </p>
        ) : loadError ? (
          <div className="px-5 py-24 text-center sm:px-8">
            <p className="font-display text-xl font-800 uppercase">
              Não foi possível carregar o acervo
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">{loadError}</p>
            <p className="mx-auto mt-2 max-w-md text-xs text-muted">
              As rotas /api só existem sob <code>vercel dev</code> ou em produção.
            </p>
          </div>
        ) : (
          <>
            <FeaturedCarousel jerseys={featured} onSelect={setSelected} />
            {/* Mesmo carrossel espelhado: entra pela direita e na ordem inversa. */}
            <FeaturedCarousel
              jerseys={featuredReversed}
              onSelect={setSelected}
              mirrored
            />
            <Catalog
              jerseys={visible}
              filters={filters}
              onFilterChange={setFilter}
              onReset={() => setFilters(INITIAL_FILTERS)}
              categoryTree={categoryTree}
              onSelect={setSelected}
              wishlist={wishlist}
              onToggleWishlist={toggleWishlist}
            />
          </>
        )}

        <AuthenticityChecker />
        <InstagramSection jerseys={featured} />
        <SellJerseyForm />
      </main>

      <Footer />

      <ProductModal
        jersey={selected}
        onClose={() => setSelected(null)}
        onAddToCart={addToCart}
        isSaved={selected ? wishlist.has(selected.id) : false}
        onToggleWishlist={toggleWishlist}
      />

      <CartDrawer
        open={cartOpen}
        items={cart}
        onClose={() => setCartOpen(false)}
        onUpdateQuantity={(id, size, quantity) =>
          setCart((prev) =>
            quantity <= 0
              ? prev.filter((i) => !(i.jersey.id === id && i.size === size))
              : prev.map((i) =>
                  i.jersey.id === id && i.size === size ? { ...i, quantity } : i,
                ),
          )
        }
        onRemove={(id, size) =>
          setCart((prev) => prev.filter((i) => !(i.jersey.id === id && i.size === size)))
        }
        onCheckout={() => {
          setCartOpen(false);
          setCheckoutOpen(true);
        }}
      />

      <CheckoutModal
        open={checkoutOpen}
        items={cart}
        onClose={() => setCheckoutOpen(false)}
        onPaid={() => setCart([])}
      />

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
