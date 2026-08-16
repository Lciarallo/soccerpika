import { useEffect, useMemo, useState } from 'react';
import { Loader2, Minus, Package, Plus, Search, TriangleAlert, X } from 'lucide-react';
import * as api from '../../lib/api';
import type { Jersey } from '../../types/jersey';
import { formatPrice } from '../../lib/format';

const LOW_STOCK_THRESHOLD = 2;

type View = 'todos' | 'disponivel' | 'alerta' | 'esgotado';

const normalize = (value: string) => value.trim().toLowerCase();

/** Só troca o estoque; os outros campos vão junto porque o PUT reescreve o produto inteiro. */
const toPayload = (p: Jersey, stockQty: number) => ({
  name: p.name,
  slug: p.slug ?? '',
  club: p.club,
  season: p.season,
  era: p.era,
  category: p.category,
  brand: p.brand,
  description: p.description,
  price: p.price,
  stockQty,
  sizes: p.sizes,
  images: p.images,
  isMatchWorn: p.isMatchWorn,
  isAutographed: p.isAutographed,
  isPublished: p.isPublished ?? true,
  weightGrams: p.weightGrams,
  isFreeShipping: p.isFreeShipping,
});

export function StockAdmin() {
  const [products, setProducts] = useState<Jersey[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<View>('todos');
  const [pending, setPending] = useState<Set<string>>(new Set());

  useEffect(() => {
    void api
      .fetchProducts()
      .then(setProducts)
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao carregar catálogo.'));
  }, []);

  const visible = useMemo(() => {
    if (!products) return [];
    const term = normalize(search);
    return products.filter((p) => {
      if (view === 'disponivel' && p.stockQty === 0) return false;
      if (view === 'esgotado' && p.stockQty > 0) return false;
      if (view === 'alerta' && p.stockQty > LOW_STOCK_THRESHOLD) return false;
      if (!term) return true;
      return [p.name, p.brand, p.club].map(normalize).some((f) => f.includes(term));
    });
  }, [products, search, view]);

  const inventoryValue = useMemo(
    () => (products ?? []).reduce((sum, p) => sum + p.price * p.stockQty, 0),
    [products],
  );
  const alertCount = (products ?? []).filter((p) => p.stockQty <= LOW_STOCK_THRESHOLD).length;
  const outCount = (products ?? []).filter((p) => p.stockQty === 0).length;

  const setStock = async (product: Jersey, next: number) => {
    if (next < 0) return;
    setPending((prev) => new Set(prev).add(product.id));
    setError(null);
    try {
      const { product: updated } = await api.updateProduct(product.id, toPayload(product, next));
      setProducts((prev) => prev?.map((p) => (p.id === product.id ? updated : p)) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao atualizar estoque.');
    } finally {
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    }
  };

  if (!products) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted">
        <Loader2 size={15} className="animate-spin" /> Carregando estoque…
      </p>
    );
  }

  const TABS: { key: View; label: string; count: number }[] = [
    { key: 'todos', label: 'Todos', count: products.length },
    { key: 'disponivel', label: 'Disponível', count: products.length - outCount },
    { key: 'alerta', label: 'Em alerta', count: alertCount },
    { key: 'esgotado', label: 'Esgotado', count: outCount },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
        <div>
          <h1 className="font-display text-3xl font-900 uppercase">Estoque</h1>
          <p className="mt-1 text-xs text-muted">
            <span className="font-semibold text-ink">{formatPrice(inventoryValue)}</span> em mercadorias
            paradas
          </p>
        </div>
      </header>

      {error && (
        <p className="flex items-center justify-between bg-surface p-3 text-sm text-danger">
          {error}
          <button type="button" onClick={() => setError(null)} aria-label="Dispensar">
            <X size={15} />
          </button>
        </p>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex flex-wrap border border-line">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setView(tab.key)}
              aria-pressed={view === tab.key}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold uppercase transition-colors ${
                view === tab.key ? 'bg-ink text-paper' : 'text-muted hover:text-ink'
              }`}
            >
              {tab.key === 'alerta' && tab.count > 0 && <TriangleAlert className="h-3.5 w-3.5 text-brand" />}
              {tab.label}
              <span className="ml-1 bg-surface px-1.5 py-0.5 text-[0.6rem] tabular-nums text-ink">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome, marca ou clube…"
            className="w-full border-b border-ink bg-transparent py-2.5 pl-9 text-sm focus:outline-none"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 border border-line py-16 text-center">
          <Package className="h-10 w-10 text-line" />
          <p className="text-sm text-muted">Nenhuma peça encontrada neste filtro.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((product) => {
            const isOut = product.stockQty === 0;
            const isLow = !isOut && product.stockQty <= LOW_STOCK_THRESHOLD;
            const busy = pending.has(product.id);

            return (
              <li
                key={product.id}
                className={`flex flex-col gap-4 border p-4 sm:flex-row sm:items-center ${
                  isOut ? 'border-brand/60 bg-brand/5' : isLow ? 'border-brand/30' : 'border-line'
                }`}
              >
                <div className="flex flex-1 gap-3">
                  <div className="h-14 w-14 shrink-0 bg-surface">
                    {product.images[0] && (
                      <img src={product.images[0]} alt="" className="h-full w-full object-contain" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{product.name}</p>
                    <p className="text-xs text-muted">{product.brand || 'sem marca'}</p>
                    {isOut ? (
                      <span className="mt-1 inline-block bg-ink px-2 py-0.5 text-[10px] font-bold text-paper uppercase">
                        Esgotado
                      </span>
                    ) : isLow ? (
                      <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-brand uppercase">
                        <TriangleAlert className="h-3 w-3" /> estoque baixo
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    disabled={busy || product.stockQty <= 0}
                    onClick={() => setStock(product, product.stockQty - 1)}
                    className="flex h-8 w-8 items-center justify-center border border-line text-ink transition-colors hover:border-ink disabled:opacity-30"
                    aria-label={`Remover uma unidade de ${product.name}`}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <input
                    type="number"
                    min={0}
                    value={product.stockQty}
                    disabled={busy}
                    onChange={(event) => setStock(product, Math.max(0, Number(event.target.value)))}
                    className="w-16 border-b border-ink bg-transparent py-1 text-center font-display text-base font-900 tabular-nums focus:outline-none"
                    aria-label={`Quantidade em estoque de ${product.name}`}
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setStock(product, product.stockQty + 1)}
                    className="flex h-8 w-8 items-center justify-center border border-line text-ink transition-colors hover:border-ink disabled:opacity-30"
                    aria-label={`Adicionar uma unidade a ${product.name}`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                  {busy && <Loader2 className="h-4 w-4 animate-spin text-muted" />}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
