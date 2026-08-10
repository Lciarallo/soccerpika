import { SlidersHorizontal, X } from 'lucide-react';
import type { FilterState, Jersey, SortBy } from '../types/jersey';
import { JerseyCard } from './JerseyCard';

interface CatalogProps {
  jerseys: Jersey[];
  filters: FilterState;
  onFilterChange: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  onReset: () => void;
  categories: string[];
  eras: string[];
  brands: string[];
  onSelect: (jersey: Jersey) => void;
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
  eras,
  brands,
  onSelect,
}: CatalogProps) {
  const hasFilters =
    filters.query !== '' ||
    filters.category !== 'Todos' ||
    filters.era !== 'Todas' ||
    filters.brand !== 'Todas' ||
    filters.onlyInStock;

  return (
    <section id="catalogo" className="mx-auto max-w-7xl px-4 py-14">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink pb-5">
        <div>
          <h2 className="font-display text-3xl font-900 uppercase sm:text-4xl">
            O acervo
          </h2>
          <p className="mt-1 text-sm text-muted">
            {jerseys.length} {jerseys.length === 1 ? 'peça encontrada' : 'peças encontradas'}
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm font-semibold">
          <SlidersHorizontal size={16} />
          <span className="sr-only sm:not-sr-only">Ordenar por</span>
          <select
            value={filters.sortBy}
            onChange={(e) => onFilterChange('sortBy', e.target.value as SortBy)}
            className="border-2 border-ink bg-paper px-3 py-2 text-sm font-semibold focus:outline-none"
          >
            {(Object.keys(SORT_LABELS) as SortBy[]).map((key) => (
              <option key={key} value={key}>
                {SORT_LABELS[key]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-8 py-6 lg:grid-cols-[220px_1fr]">
        {/* Filtros */}
        <aside className="space-y-6">
          <Filter
            label="Categoria"
            options={categories}
            value={filters.category}
            onChange={(v) => onFilterChange('category', v)}
          />
          <Filter
            label="Época"
            options={eras}
            value={filters.era}
            onChange={(v) => onFilterChange('era', v)}
          />
          <Filter
            label="Marca"
            options={brands}
            value={filters.brand}
            onChange={(v) => onFilterChange('brand', v)}
          />

          <label className="flex cursor-pointer items-center gap-2.5 border-t-2 border-ink pt-5 text-sm font-semibold">
            <input
              type="checkbox"
              checked={filters.onlyInStock}
              onChange={(e) => onFilterChange('onlyInStock', e.target.checked)}
              className="h-4 w-4 accent-[var(--color-brand)]"
            />
            Somente disponíveis
          </label>

          {hasFilters && (
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-1.5 text-sm font-bold text-brand hover:underline"
            >
              <X size={14} /> Limpar filtros
            </button>
          )}
        </aside>

        {/* Grade */}
        {jerseys.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {jerseys.map((jersey) => (
              <JerseyCard key={jersey.id} jersey={jersey} onSelect={onSelect} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-line py-24 text-center">
            <p className="font-display text-xl font-800 uppercase">Nada encontrado</p>
            <p className="mt-2 max-w-xs text-sm text-muted">
              Tente outra busca ou remova alguns filtros para ver mais peças do acervo.
            </p>
            <button type="button" onClick={onReset} className="btn btn-primary mt-6 px-5 py-2.5 text-sm uppercase">
              Limpar filtros
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

interface FilterProps {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}

function Filter({ label, options, value, onChange }: FilterProps) {
  return (
    <fieldset>
      <legend className="mb-2.5 font-display text-xs font-800 tracking-widest uppercase">
        {label}
      </legend>
      <ul className="space-y-1">
        {options.map((option) => {
          const active = value === option;
          return (
            <li key={option}>
              <button
                type="button"
                onClick={() => onChange(option)}
                aria-pressed={active}
                className={`w-full border-l-4 py-1.5 pl-2.5 text-left text-sm transition-colors ${
                  active
                    ? 'border-brand font-bold text-ink'
                    : 'border-transparent text-muted hover:border-line-strong hover:text-ink'
                }`}
              >
                {option}
              </button>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
