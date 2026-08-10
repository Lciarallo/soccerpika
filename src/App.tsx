import { useCallback, useMemo, useState } from 'react';
import './App.css';
import { jerseys } from './data/jerseys';
import type { CartItem, FilterState, Jersey } from './types/jersey';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Catalog } from './components/Catalog';
import { ProductModal } from './components/ProductModal';
import { CartDrawer } from './components/CartDrawer';
import { AuthenticityChecker } from './components/AuthenticityChecker';
import { SellJerseyForm } from './components/SellJerseyForm';
import { Footer } from './components/Footer';

const INITIAL_FILTERS: FilterState = {
  query: '',
  category: 'Todos',
  era: 'Todas',
  brand: 'Todas',
  onlyInStock: false,
  sortBy: 'destaque',
};

const ERA_ORDER = ['80s', '90s', '2000s', '2010s+', 'Sem data'];

export default function App() {
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [selected, setSelected] = useState<Jersey | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  const categories = useMemo(
    () => ['Todos', ...[...new Set(jerseys.map((j) => j.category))].sort()],
    [],
  );

  const eras = useMemo(() => {
    const present = new Set(jerseys.map((j) => j.era));
    return ['Todas', ...ERA_ORDER.filter((e) => present.has(e as Jersey['era']))];
  }, []);

  const brands = useMemo(
    () => ['Todas', ...[...new Set(jerseys.map((j) => j.brand).filter(Boolean))].sort()],
    [],
  );

  const visible = useMemo(() => {
    const q = filters.query.trim().toLowerCase();

    const list = jerseys.filter((j) => {
      if (filters.category !== 'Todos' && j.category !== filters.category) return false;
      if (filters.era !== 'Todas' && j.era !== filters.era) return false;
      if (filters.brand !== 'Todas' && j.brand !== filters.brand) return false;
      if (filters.onlyInStock && !j.inStock) return false;
      if (!q) return true;
      return [j.name, j.club, j.brand, j.season, j.description, ...j.categories]
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
  }, [filters]);

  const featured = useMemo(
    () =>
      jerseys
        .filter((j) => j.inStock)
        .toSorted((a, b) => b.price - a.price)
        .slice(0, 3),
    [],
  );

  const setFilter = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
      setFilters((prev) => ({ ...prev, [key]: value })),
    [],
  );

  const resetFilters = useCallback(() => setFilters(INITIAL_FILTERS), []);

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
    setCartOpen(true);
  }, []);

  const updateQuantity = useCallback((id: string, size: string, quantity: number) => {
    setCart((prev) =>
      quantity <= 0
        ? prev.filter((i) => !(i.jersey.id === id && i.size === size))
        : prev.map((i) =>
            i.jersey.id === id && i.size === size ? { ...i, quantity } : i,
          ),
    );
  }, []);

  const removeItem = useCallback(
    (id: string, size: string) =>
      setCart((prev) => prev.filter((i) => !(i.jersey.id === id && i.size === size))),
    [],
  );

  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <>
      <Header
        cartCount={cartCount}
        onOpenCart={() => setCartOpen(true)}
        query={filters.query}
        onQueryChange={(v) => setFilter('query', v)}
        categories={categories}
        activeCategory={filters.category}
        onCategoryChange={(v) => setFilter('category', v)}
      />

      <main>
        <Hero featured={featured} total={jerseys.length} onSelect={setSelected} />

        <Catalog
          jerseys={visible}
          filters={filters}
          onFilterChange={setFilter}
          onReset={resetFilters}
          categories={categories}
          eras={eras}
          brands={brands}
          onSelect={setSelected}
        />

        <AuthenticityChecker />
        <SellJerseyForm />
      </main>

      <Footer />

      <ProductModal
        jersey={selected}
        onClose={() => setSelected(null)}
        onAddToCart={addToCart}
      />

      <CartDrawer
        open={cartOpen}
        items={cart}
        onClose={() => setCartOpen(false)}
        onUpdateQuantity={updateQuantity}
        onRemove={removeItem}
      />
    </>
  );
}
