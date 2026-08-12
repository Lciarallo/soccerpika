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
import { CookieBanner } from './components/CookieBanner';
import { AccountPage } from './pages/AccountPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { jerseys as referenceCatalog } from './data/jerseys';

const INITIAL_FILTERS: FilterState = {
  query: '',
  category: ALL,
  era: 'Todas',
  brands: [],
  colors: [],
  sizes: [],
  minPrice: null,
  maxPrice: null,
  sortBy: 'destaque',
};

/** Ordem atual dos destaques da loja oficial. Novos itens do painel entram depois. */
const HOME_FEATURED_ORDER = [
  'camisa-brasil-1995-96-n-17-de-jogo-fvbca',
  'camisa-italia-2006-no-21-pirlo-d7cxt',
  'camisa-boca-juniors-2003-de-jogo-no-4-ibarra-18a',
  'camisa-napoli-2022-23-no-77-kvaratskhelia-1gagu',
  'camisa-gremio-1997-no-7-paulo-nunes-qknjt',
  'camisa-jamaica-2008-10-no-10-43c0w',
  'camisa-gremio-2017-no-10',
  'camisa-milan-125-anos-comemorativa-xa2q7',
  'camisa-juventude-1999-away-no-10-1629t',
  'camisa-boca-juniors-2000-n-15-perez-zkrqb',
  'jaqueta-mundial-gremio-ajax-1995',
  'camisa-inter-2007-n-11-autografada-vqixt',
  'camisa-corinthians-2022-third-mundial',
  'camisa-barcelona-2014-third-n-11-neymar-noloe',
  'camisa-real-madrid-2006-07',
  'camisa-gremio-2014-plano-azul-1928-manga-longa-n',
  'camisa-sao-paulo-1992-no-10-rai-autografada',
  'fluminense-2023-third-cartola',
  'camisa-vasco-2000-n-10-5kpap',
  'camisa-gremio-2000-goleiro-havana',
  'camisa-sao-paulo-2004-no9',
  'camisa-vasco-2011-away',
  'camisa-vasco-2007-especial-1000gols-romario',
  'jaqueta-internacional-2008',
  'camisa-botafogo-1996',
  'camisa-juventude-1999-branca-g',
  'camisa-de-jogo-gremio-1989-n-10',
  'camisa-barcelona-2009',
  'camisa-barcelona-2012-third-n-3-pique',
] as const;

const HOME_FEATURED_RANK: ReadonlyMap<string, number> = new Map(
  HOME_FEATURED_ORDER.map((slug, index) => [slug, index]),
);

/** Ordenações editoriais observadas no catálogo oficial. */
const CATALOG_BEST_SELLING_ORDER = [
  'camisa-juventude-1999-away-no-10-1629t',
  'camisa-milan-125-anos-comemorativa-xa2q7',
  'camisa-gremio-1997-no-7-paulo-nunes-qknjt',
  'camisa-napoli-2022-23-no-77-kvaratskhelia-1gagu',
  'camisa-boca-juniors-2003-de-jogo-no-4-ibarra-18a',
  'camisa-jamaica-2008-10-no-10-43c0w',
  'camisa-italia-2006-no-21-pirlo-d7cxt',
  'camisa-brasil-1995-96-n-17-de-jogo-fvbca',
  'camisa-gremio-2017-no-10',
  'camisa-sao-paulo-1992-no-10-rai-autografada',
  'camisa-sao-paulo-2004-no9',
  'camisa-vasco-2007-especial-1000gols-romario',
  'camisa-de-jogo-gremio-1989-n-10',
  'camisa-corinthians-2022-third-mundial',
  'camisa-barcelona-2014-third-n-11-neymar-noloe',
  'camisa-real-madrid-2006-07',
  'camisa-vasco-2000-n-10-5kpap',
  'camisa-boca-juniors-2000-n-15-perez-zkrqb',
  'fluminense-2023-third-cartola',
  'camisa-inter-2007-n-11-autografada-vqixt',
  'camisa-gremio-2000-goleiro-havana',
  'camisa-vasco-2011-away',
  'jaqueta-internacional-2008',
  'camisa-botafogo-1996',
  'camisa-juventude-1999-branca-g',
  'camisa-barcelona-2009',
  'camisa-gremio-2014-plano-azul-1928-manga-longa-n',
  'camisa-barcelona-2012-third-n-3-pique',
  'camisa-real-madrid-1998-7a-copa-europa',
  'jaqueta-mundial-gremio-ajax-1995',
] as const;

const CATALOG_USER_ORDER = [
  ...CATALOG_BEST_SELLING_ORDER.slice(0, 9),
  'jaqueta-mundial-gremio-ajax-1995',
  'camisa-real-madrid-1998-7a-copa-europa',
  'camisa-corinthians-2022-third-mundial',
  'camisa-barcelona-2012-third-n-3-pique',
  'camisa-gremio-2014-plano-azul-1928-manga-longa-n',
  'camisa-barcelona-2009',
  'camisa-de-jogo-gremio-1989-n-10',
  'camisa-juventude-1999-branca-g',
  'camisa-botafogo-1996',
  'jaqueta-internacional-2008',
  'camisa-vasco-2007-especial-1000gols-romario',
  'camisa-vasco-2011-away',
  'camisa-gremio-2000-goleiro-havana',
  'camisa-sao-paulo-2004-no9',
  'camisa-inter-2007-n-11-autografada-vqixt',
  'fluminense-2023-third-cartola',
  'camisa-sao-paulo-1992-no-10-rai-autografada',
  'camisa-boca-juniors-2000-n-15-perez-zkrqb',
  'camisa-vasco-2000-n-10-5kpap',
  'camisa-real-madrid-2006-07',
  'camisa-barcelona-2014-third-n-11-neymar-noloe',
] as const;

const CATALOG_CREATED_DESC_ORDER = [
  ...CATALOG_BEST_SELLING_ORDER.slice(0, 9),
  'camisa-barcelona-2014-third-n-11-neymar-noloe',
  'camisa-real-madrid-2006-07',
  'camisa-vasco-2000-n-10-5kpap',
  'camisa-boca-juniors-2000-n-15-perez-zkrqb',
  'camisa-sao-paulo-1992-no-10-rai-autografada',
  'fluminense-2023-third-cartola',
  'camisa-inter-2007-n-11-autografada-vqixt',
  'camisa-sao-paulo-2004-no9',
  'camisa-gremio-2000-goleiro-havana',
  'camisa-vasco-2011-away',
  'camisa-vasco-2007-especial-1000gols-romario',
  'jaqueta-internacional-2008',
  'camisa-botafogo-1996',
  'camisa-juventude-1999-branca-g',
  'camisa-de-jogo-gremio-1989-n-10',
  'camisa-barcelona-2009',
  'camisa-gremio-2014-plano-azul-1928-manga-longa-n',
  'camisa-barcelona-2012-third-n-3-pique',
  'camisa-corinthians-2022-third-mundial',
  'camisa-real-madrid-1998-7a-copa-europa',
  'jaqueta-mundial-gremio-ajax-1995',
] as const;

const CATALOG_BEST_SELLING_RANK: ReadonlyMap<string, number> = new Map(
  CATALOG_BEST_SELLING_ORDER.map((slug, index) => [slug, index]),
);
const CATALOG_USER_RANK: ReadonlyMap<string, number> = new Map(
  CATALOG_USER_ORDER.map((slug, index) => [slug, index]),
);
const CATALOG_CREATED_DESC_RANK: ReadonlyMap<string, number> = new Map(
  CATALOG_CREATED_DESC_ORDER.map((slug, index) => [slug, index]),
);

function sortByCatalogRank(jerseys: Jersey[], rank: ReadonlyMap<string, number>) {
  return jerseys
    .map((jersey, originalIndex) => ({ jersey, originalIndex }))
    .toSorted(
      (a, b) =>
        (rank.get(a.jersey.slug ?? a.jersey.id) ?? Number.MAX_SAFE_INTEGER) -
          (rank.get(b.jersey.slug ?? b.jersey.id) ?? Number.MAX_SAFE_INTEGER) ||
        a.originalIndex - b.originalIndex,
    )
    .map(({ jersey }) => jersey);
}

function sortByCatalogDate(jerseys: Jersey[], newestFirst: boolean) {
  return jerseys.toSorted((a, b) => {
    const aRank = CATALOG_CREATED_DESC_RANK.get(a.slug ?? a.id);
    const bRank = CATALOG_CREATED_DESC_RANK.get(b.slug ?? b.id);
    if (aRank !== undefined && bRank !== undefined) {
      return newestFirst ? aRank - bRank : bRank - aRank;
    }
    if (aRank !== undefined) return newestFirst ? 1 : -1;
    if (bRank !== undefined) return newestFirst ? -1 : 1;
    const dateDelta =
      new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
    return newestFirst ? dateDelta : -dateDelta;
  });
}

const KNOWN_COLORS = new Set([
  'Branco',
  'Preto',
  'Amarelo',
  'Azul',
  'Marrom',
  'Pink',
  'Vermelho',
  'Azul claro',
]);
const KNOWN_SIZES = new Set(['G (justo)', 'M', 'G', 'GG']);
const REFERENCE_METADATA = new Map(
  referenceCatalog.map((jersey) => [
    jersey.id,
    {
      colors: (jersey.colors ?? []).filter((value) => KNOWN_COLORS.has(value)),
      sizes: [
        ...jersey.sizes,
        ...(jersey.colors ?? []).filter((value) => KNOWN_SIZES.has(value)),
      ],
    },
  ]),
);

export default function App() {
  return (
    <SessionProvider>
      <Routes />
    </SessionProvider>
  );
}

function Routes() {
  const { path, navigate } = useRoute();

  if (path === '/admin' || path.startsWith('/admin/')) {
    return <AdminDashboard onExit={() => navigate('/')} />;
  }
  if (path === '/conta' || path.startsWith('/conta/')) {
    return <AccountPage onExit={() => navigate('/')} />;
  }
  return <Storefront path={path} navigate={navigate} />;
}

function Storefront({
  path,
  navigate,
}: {
  path: string;
  navigate: (to: string) => void;
}) {
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
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());

  useEffect(() => {
    api
      .fetchProducts()
      .then((products) =>
        setJerseys(
          products.map((product) => {
            const metadata = REFERENCE_METADATA.get(product.slug ?? product.id);
            if (!metadata) return product;
            return {
              ...product,
              colors: product.colors?.length ? product.colors : metadata.colors,
              sizes: [...new Set([...product.sizes, ...metadata.sizes])],
            };
          }),
        ),
      )
      .catch((error: Error) => setLoadError(error.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) {
      setWishlist(new Set());
      return;
    }
    api
      .fetchWishlist()
      .then((items) => setWishlist(new Set(items.map((item) => item.id))))
      .catch(() => setWishlist(new Set()));
  }, [user]);

  const categoryTree = useMemo(() => buildCategoryTree(jerseys), [jerseys]);

  const visible = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    const list = jerseys.filter((jersey) => {
      if (!matchesCategory(jersey, filters.category)) return false;
      if (filters.era !== 'Todas' && jersey.era !== filters.era) return false;
      if (filters.brands.length > 0 && !filters.brands.includes(jersey.brand)) return false;
      if (
        filters.colors.length > 0 &&
        !filters.colors.some((color) => jersey.colors?.includes(color))
      ) {
        return false;
      }
      if (
        filters.sizes.length > 0 &&
        !filters.sizes.some((size) => jersey.sizes.includes(size))
      ) {
        return false;
      }
      if (filters.minPrice !== null && jersey.price < filters.minPrice) return false;
      if (filters.maxPrice !== null && jersey.price > filters.maxPrice) return false;
      if (!query) return true;
      return [jersey.name, jersey.club, jersey.brand, jersey.season, jersey.description]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });

    switch (filters.sortBy) {
      case 'preco-asc':
        return list.toSorted((a, b) => a.price - b.price);
      case 'preco-desc':
        return list.toSorted((a, b) => b.price - a.price);
      case 'nome':
        return list.toSorted((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      case 'nome-desc':
        return list.toSorted((a, b) => b.name.localeCompare(a.name, 'pt-BR'));
      case 'antigo':
        return sortByCatalogDate(list, false);
      case 'novo':
        return sortByCatalogDate(list, true);
      case 'featured':
        return sortByCatalogRank(list, CATALOG_USER_RANK);
      default:
        return sortByCatalogRank(list, CATALOG_BEST_SELLING_RANK);
    }
  }, [jerseys, filters]);

  const featured = useMemo(() => {
    const rank = (jersey: Jersey) =>
      HOME_FEATURED_RANK.get(jersey.slug ?? jersey.id) ?? Number.MAX_SAFE_INTEGER;

    return jerseys
      .filter((jersey) => jersey.slug !== 'camisa-real-madrid-1998-7a-copa-europa')
      .map((jersey, originalIndex) => ({ jersey, originalIndex }))
      .toSorted(
        (a, b) =>
          rank(a.jersey) - rank(b.jersey) || a.originalIndex - b.originalIndex,
      )
      .map(({ jersey }) => jersey);
  }, [jerseys]);

  const setFilter = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
      setFilters((previous) => ({ ...previous, [key]: value })),
    [],
  );

  const addToCart = useCallback((jersey: Jersey, size: string) => {
    setCart((previous) => {
      const existing = previous.find(
        (item) => item.jersey.id === jersey.id && item.size === size,
      );
      if (existing) {
        return previous.map((item) =>
          item === existing
            ? { ...item, quantity: Math.min(item.quantity + 1, jersey.stockQty) }
            : item,
        );
      }
      return [...previous, { jersey, size, quantity: 1 }];
    });
    setSelected(null);
    setCartOpen(true);
  }, []);

  const toggleWishlist = useCallback(
    async (jersey: Jersey) => {
      if (!user) {
        setAuthMode('login');
        setAuthOpen(true);
        return;
      }
      const saved = wishlist.has(jersey.id);
      setWishlist((previous) => {
        const next = new Set(previous);
        if (saved) next.delete(jersey.id);
        else next.add(jersey.id);
        return next;
      });
      try {
        if (saved) await api.removeFromWishlist(jersey.id);
        else await api.addToWishlist(jersey.id);
      } catch {
        setWishlist((previous) => {
          const next = new Set(previous);
          if (saved) next.add(jersey.id);
          else next.delete(jersey.id);
          return next;
        });
      }
    },
    [user, wishlist],
  );

  if (path === '/admin') {
    return <AdminDashboard onExit={() => navigate('/')} />;
  }

  if (path === '/conta') {
    return <AccountPage onExit={() => navigate('/')} />;
  }

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const page = path === '/produtos' || path.startsWith('/produtos/')
    ? 'products'
    : path === '/contato' || path.startsWith('/contato/')
      ? 'contact'
      : 'home';

  return (
    <div className="storefront">
      <Header
        cartCount={cartCount}
        onOpenCart={() => setCartOpen(true)}
        query={filters.query}
        onSearch={(value) => setFilters({ ...INITIAL_FILTERS, query: value })}
        categoryTree={categoryTree}
        activeCategory={filters.category}
        onCategoryChange={(value) =>
          setFilters({ ...INITIAL_FILTERS, category: value })
        }
        user={user}
        isAdmin={isAdmin}
        onLogin={() => {
          setAuthMode('login');
          setAuthOpen(true);
        }}
        onRegister={() => {
          setAuthMode('register');
          setAuthOpen(true);
        }}
        onNavigate={navigate}
      />

      <main>
        {page === 'home' ? (
          <>
            <Hero />
            {loading ? (
              <LoadingStorefront />
            ) : loadError ? (
              <StorefrontError message={loadError} />
            ) : (
              <FeaturedCarousel jerseys={featured} onSelect={setSelected} />
            )}
            <InstagramSection />
          </>
        ) : page === 'products' ? (
          loading ? (
            <LoadingStorefront />
          ) : loadError ? (
            <StorefrontError message={loadError} />
          ) : (
            <Catalog
              jerseys={visible}
              allJerseys={jerseys}
              filters={filters}
              onFilterChange={setFilter}
              onReset={() => setFilters(INITIAL_FILTERS)}
              categoryTree={categoryTree}
              onSelect={setSelected}
              wishlist={wishlist}
              onToggleWishlist={toggleWishlist}
              onNavigate={navigate}
            />
          )
        ) : (
          <>
            <SellJerseyForm />
            <AuthenticityChecker />
          </>
        )}
      </main>

      <Footer onNavigate={navigate} />
      <CookieBanner />

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
          setCart((previous) =>
            quantity <= 0
              ? previous.filter(
                  (item) => !(item.jersey.id === id && item.size === size),
                )
              : previous.map((item) =>
                  item.jersey.id === id && item.size === size
                    ? { ...item, quantity }
                    : item,
                ),
          )
        }
        onRemove={(id, size) =>
          setCart((previous) =>
            previous.filter(
              (item) => !(item.jersey.id === id && item.size === size),
            ),
          )
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

      <AuthModal
        open={authOpen}
        initialMode={authMode}
        onClose={() => setAuthOpen(false)}
      />
    </div>
  );
}

function LoadingStorefront() {
  return (
    <p className="storefront-state">
      <Loader2 size={16} className="animate-spin" /> Carregando o acervo…
    </p>
  );
}

function StorefrontError({ message }: { message: string }) {
  return (
    <div className="storefront-error">
      <p className="storefront-error-title">Não foi possível carregar o acervo</p>
      <p>{message}</p>
    </div>
  );
}
