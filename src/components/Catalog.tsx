import { ALL, type CategoryNode } from '../lib/categories';
import type { FilterState, Jersey, SortBy } from '../types/jersey';
import { JerseyCard } from './JerseyCard';

interface CatalogProps {
  jerseys: Jersey[];
  filters: FilterState;
  onFilterChange: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  onReset: () => void;
  categoryTree: CategoryNode[];
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
  categoryTree,
  onSelect,
  wishlist,
  onToggleWishlist,
}: CatalogProps) {
  return (
    <section id="catalogo" className="px-5 py-10 sm:px-8" aria-labelledby="acervo-titulo">
      <div className="section-grid">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="text-sm text-muted tabular-nums">
            {jerseys.length} {jerseys.length === 1 ? 'peça' : 'peças'}
          </p>
          <h2
            id="acervo-titulo"
            className="section-title mt-2"
          >
            Produtos
          </h2>

          <ul className="mt-6 space-y-1">
            <li>
              <FilterLink
                label="Todos"
                active={filters.category === ALL}
                onClick={() => onFilterChange('category', ALL)}
              />
            </li>
            {categoryTree.map((node) => (
              <li key={node.label}>
                <FilterLink
                  label={node.label}
                  active={filters.category === node.label}
                  onClick={() => onFilterChange('category', node.label)}
                />
                {node.children.length > 0 && (
                  <ul className="mb-1 pl-3">
                    {node.children.map((child) => (
                      <li key={child}>
                        <FilterLink
                          label={child}
                          nested
                          active={filters.category === child}
                          onClick={() => onFilterChange('category', child)}
                        />
                      </li>
                    ))}
                  </ul>
                )}
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

function FilterLink({
  label,
  active,
  nested = false,
  onClick,
}: {
  label: string;
  active: boolean;
  nested?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'true' : undefined}
      className={`py-0.5 tracking-wide uppercase transition-colors ${
        nested ? 'text-xs' : 'text-sm'
      } ${active ? 'font-bold text-brand' : 'text-muted hover:text-ink'}`}
    >
      {label}
    </button>
  );
}
