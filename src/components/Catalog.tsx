import type { FilterState, Jersey, SortBy } from '../types/jersey';
import { JerseyCard } from './JerseyCard';

interface CatalogProps {
  jerseys: Jersey[];
  filters: FilterState;
  onFilterChange: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  onReset: () => void;
  categories: string[];
  onSelect: (jersey: Jersey) => void;
  wishlist: Set<string>;
  onToggleWishlist: (jersey: Jersey) => void;
}

const SORT_LABELS: Record<SortBy, string> = {
  destaque: 'Destaques',
  'preco-asc': 'Menor preço',
  'preco-desc': 'Maior preço',
  nome: 'Nome (A–Z)',
};

export function Catalog({
  jerseys,
  filters,
  onFilterChange,
  onReset,
  categories,
  onSelect,
  wishlist,
  onToggleWishlist,
}: CatalogProps) {
  return (
    <section id="catalogo" className="px-5 py-10 sm:px-8" aria-labelledby="acervo-titulo">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="text-sm text-muted tabular-nums">
            {jerseys.length} {jerseys.length === 1 ? 'peça' : 'peças'}
          </p>
          <h2
            id="acervo-titulo"
            className="mt-2 font-display text-4xl font-900 uppercase sm:text-5xl"
          >
            Produtos
          </h2>

          <ul className="mt-6 space-y-1">
            {categories.map((category) => (
              <li key={category}>
                <button
                  type="button"
                  onClick={() => onFilterChange('category', category)}
                  aria-current={filters.category === category ? 'true' : undefined}
                  className={`text-sm tracking-wide uppercase transition-colors ${
                    filters.category === category
                      ? 'font-bold text-brand'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  {category}
                </button>
              </li>
            ))}
          </ul>

          <label className="mt-6 flex cursor-pointer items-center gap-2 text-sm tracking-wide uppercase">
            <input
              type="checkbox"
              checked={filters.onlyInStock}
              onChange={(e) => onFilterChange('onlyInStock', e.target.checked)}
              className="h-4 w-4 accent-[var(--color-brand)]"
            />
            Só disponíveis
          </label>

          <label className="mt-6 block">
            <span className="text-sm tracking-wide text-muted uppercase">Ordenar</span>
            <select
              value={filters.sortBy}
              onChange={(e) => onFilterChange('sortBy', e.target.value as SortBy)}
              className="mt-1.5 w-full border-b border-ink bg-transparent py-2 text-sm focus:outline-none"
            >
              {(Object.keys(SORT_LABELS) as SortBy[]).map((key) => (
                <option key={key} value={key}>
                  {SORT_LABELS[key]}
                </option>
              ))}
            </select>
          </label>
        </div>

        {jerseys.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 xl:grid-cols-4">
            {jerseys.map((jersey) => (
              <JerseyCard
                key={jersey.id}
                jersey={jersey}
                onSelect={onSelect}
                isSaved={wishlist.has(jersey.id)}
                onToggleWishlist={onToggleWishlist}
              />
            ))}
          </div>
        ) : (
          <div className="py-24 text-center">
            <p className="font-display text-2xl font-800 uppercase">Nada encontrado</p>
            <p className="mt-2 text-sm text-muted">
              Tente outra busca ou remova os filtros para ver o acervo inteiro.
            </p>
            <button
              type="button"
              onClick={onReset}
              className="link-underline mt-5 text-sm tracking-wide uppercase hover:text-brand"
            >
              Limpar filtros
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
