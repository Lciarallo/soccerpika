import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { ALL, type CategoryNode } from '../lib/categories';
import type { FilterState, Jersey, SortBy } from '../types/jersey';
import { JerseyCard } from './JerseyCard';

interface CatalogProps {
  jerseys: Jersey[];
  allJerseys: Jersey[];
  filters: FilterState;
  onFilterChange: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  onReset: () => void;
  categoryTree: CategoryNode[];
  onSelect: (jersey: Jersey) => void;
  wishlist: Set<string>;
  onToggleWishlist: (jersey: Jersey) => void;
  onNavigate: (to: string) => void;
}

const SORT_LABELS: Record<SortBy, string> = {
  'preco-asc': 'Preço: menor ao maior',
  'preco-desc': 'Preço: maior ao menor',
  nome: 'A - Z',
  'nome-desc': 'Z - A',
  novo: 'Mais novo ao mais antigo',
  antigo: 'Mais antigo ao mais novo',
  destaque: 'Mais vendidos',
  featured: 'Destaque',
};

const CATEGORY_ORDER = ['De Jogo', 'Europeus', 'Brasileiros', 'Sulamericanas', 'Seleções'];
const COLOR_ORDER = ['Branco', 'Preto', 'Amarelo', 'Azul', 'Marrom', 'Pink', 'Vermelho', 'Azul claro'];
const SIZE_ORDER = ['G (justo)', 'M', 'G', 'GG'];
const PAGE_SIZE = 12;
type MobileFilterKey = 'sort' | 'categories' | 'colors' | 'sizes' | 'brands' | 'price';
const COLOR_SWATCHES: Record<string, string> = {
  Branco: '#fff',
  Preto: '#000',
  Amarelo: '#ffe000',
  Azul: '#020094',
  Marrom: '#8b5a2b',
  Pink: '#f56cac',
  Vermelho: '#d60000',
  'Azul claro': '#8dd7ff',
};

function countFacet(jerseys: Jersey[], values: (jersey: Jersey) => string[]) {
  const counts = new Map<string, number>();
  jerseys.forEach((jersey) => {
    new Set(values(jersey).filter(Boolean)).forEach((value) =>
      counts.set(value, (counts.get(value) ?? 0) + 1),
    );
  });
  return counts;
}

export function Catalog({
  jerseys,
  allJerseys,
  filters,
  onFilterChange,
  onReset,
  categoryTree,
  onSelect,
  wishlist,
  onToggleWishlist,
  onNavigate,
}: CatalogProps) {
  const filterKey = JSON.stringify([
    filters.query,
    filters.category,
    filters.era,
    filters.brands,
    filters.colors,
    filters.sizes,
    filters.minPrice,
    filters.maxPrice,
    filters.sortBy,
  ]);
  const [pagination, setPagination] = useState({
    key: filterKey,
    desktopPage: 0,
    mobileCount: PAGE_SIZE,
  });
  const [showAllBrands, setShowAllBrands] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [expandedFilters, setExpandedFilters] = useState<Set<MobileFilterKey>>(
    () => new Set(['price']),
  );
  const [isMobile, setIsMobile] = useState(() =>
    window.matchMedia('(max-width: 767px)').matches,
  );
  const filterTriggerRef = useRef<HTMLButtonElement>(null);
  const filterDialogRef = useRef<HTMLElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [minimum, setMinimum] = useState(() =>
    filters.minPrice === null ? '' : String(filters.minPrice),
  );
  const [maximum, setMaximum] = useState(() =>
    filters.maxPrice === null ? '' : String(filters.maxPrice),
  );

  useEffect(() => {
    setMinimum(filters.minPrice === null ? '' : String(filters.minPrice));
  }, [filters.minPrice]);

  useEffect(() => {
    setMaximum(filters.maxPrice === null ? '' : String(filters.maxPrice));
  }, [filters.maxPrice]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const syncViewport = () => {
      setIsMobile(media.matches);
      if (!media.matches) setFilterOpen(false);
    };
    media.addEventListener('change', syncViewport);
    return () => media.removeEventListener('change', syncViewport);
  }, []);

  useEffect(() => {
    if (!filterOpen) return;
    const previousOverflow = document.body.style.overflow;
    const restoreFocus = filterTriggerRef.current;
    const frame = window.requestAnimationFrame(() =>
      filterDialogRef.current?.querySelector<HTMLElement>('button')?.focus(),
    );
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setFilterOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !filterDialogRef.current) return;
      const focusable = [
        ...filterDialogRef.current.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href]',
        ),
      ].filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable.at(-1)!;
      if (!filterDialogRef.current.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      restoreFocus?.focus();
    };
  }, [filterOpen]);

  const colorCounts = useMemo(
    () => countFacet(allJerseys, (jersey) => jersey.colors ?? []),
    [allJerseys],
  );
  const sizeCounts = useMemo(
    () => countFacet(allJerseys, (jersey) => jersey.sizes),
    [allJerseys],
  );
  const brandCounts = useMemo(
    () => countFacet(allJerseys, (jersey) => (jersey.brand ? [jersey.brand] : [])),
    [allJerseys],
  );
  const priceBounds = useMemo(() => {
    const prices = allJerseys.map((jersey) => jersey.price);
    return {
      minimum: prices.length ? Math.min(...prices) : 0,
      maximum: prices.length ? Math.max(...prices) : 0,
    };
  }, [allJerseys]);
  const activePagination =
    pagination.key === filterKey
      ? pagination
      : { key: filterKey, desktopPage: 0, mobileCount: PAGE_SIZE };
  const pageCount = Math.max(1, Math.ceil(jerseys.length / PAGE_SIZE));
  const currentPage = Math.min(activePagination.desktopPage, pageCount - 1);
  const pageItems = jerseys.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const mobileItems = jerseys.slice(0, activePagination.mobileCount);
  const brands = [...brandCounts.entries()].toSorted(([a], [b]) => a.localeCompare(b, 'pt-BR'));
  const categories = [...categoryTree].toSorted(
    (a, b) =>
      (CATEGORY_ORDER.indexOf(a.label) === -1
        ? Number.MAX_SAFE_INTEGER
        : CATEGORY_ORDER.indexOf(a.label)) -
      (CATEGORY_ORDER.indexOf(b.label) === -1
        ? Number.MAX_SAFE_INTEGER
        : CATEGORY_ORDER.indexOf(b.label)),
  );
  const hasActiveFilters =
    filters.category !== ALL ||
    filters.query.trim() !== '' ||
    filters.brands.length > 0 ||
    filters.colors.length > 0 ||
    filters.sizes.length > 0 ||
    filters.minPrice !== null ||
    filters.maxPrice !== null;

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (
      !sentinel ||
      activePagination.mobileCount >= jerseys.length ||
      !isMobile
    ) {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setPagination({
          key: filterKey,
          desktopPage: activePagination.desktopPage,
          mobileCount: Math.min(activePagination.mobileCount + PAGE_SIZE, jerseys.length),
        });
      },
      { rootMargin: '360px 0px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [
    activePagination.desktopPage,
    activePagination.mobileCount,
    filterKey,
    isMobile,
    jerseys.length,
  ]);

  const changeFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    onFilterChange(key, value);
  };

  const toggleMultiFilter = (key: 'brands' | 'colors' | 'sizes', value: string) => {
    const selected = filters[key];
    changeFilter(
      key,
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    );
  };

  const resetFilters = () => {
    setMinimum('');
    setMaximum('');
    onReset();
  };
  const toggleMobileSection = (section: MobileFilterKey) =>
    setExpandedFilters((current) => {
      const next = new Set(current);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  return (
    <section id="catalogo" className="store-catalog" aria-labelledby="catalog-title">
      <header className="store-catalog-header">
        <p>
          <a
            href="/"
            onClick={(event) => {
              event.preventDefault();
              onNavigate('/');
            }}
          >
            Início
          </a>{' '}
          <span aria-hidden="true">|</span> Produtos
        </p>
        <h1 id="catalog-title">Produtos</h1>
      </header>

      <button
        ref={filterTriggerRef}
        type="button"
        className="store-mobile-filter-trigger"
        aria-haspopup="dialog"
        aria-expanded={filterOpen}
        onClick={() => setFilterOpen(true)}
      >
        Filtrar e ordenar
      </button>

      {filterOpen ? (
        <div className="store-mobile-filter-overlay">
          <aside
            ref={filterDialogRef}
            className="store-mobile-filter-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Filtrar e ordenar produtos"
          >
            <div className="store-mobile-filter-close-row">
              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                aria-label="Fechar filtros"
              >
                <X size={24} strokeWidth={2} />
              </button>
            </div>

            <MobileFilterSection
              id="sort"
              title="Ordenar por"
              expanded={expandedFilters.has('sort')}
              onToggle={() => toggleMobileSection('sort')}
            >
              <div className="store-mobile-sort-options">
                {(Object.keys(SORT_LABELS) as SortBy[]).map((key) => (
                  <label key={key}>
                    <input
                      type="radio"
                      name="mobile-sort"
                      value={key}
                      checked={filters.sortBy === key}
                      onChange={() => changeFilter('sortBy', key)}
                    />
                    <span>{SORT_LABELS[key]}</span>
                  </label>
                ))}
              </div>
            </MobileFilterSection>

            <MobileFilterSection
              id="categories"
              title="Categorias"
              expanded={expandedFilters.has('categories')}
              onToggle={() => toggleMobileSection('categories')}
            >
              <ul className="store-mobile-category-options">
                {categories.map((category) => (
                  <li key={category.label}>
                    <FilterLink
                      label={category.label}
                      active={filters.category === category.label}
                      onClick={() =>
                        changeFilter(
                          'category',
                          filters.category === category.label ? ALL : category.label,
                        )
                      }
                    />
                  </li>
                ))}
              </ul>
            </MobileFilterSection>

            <MobileFilterSection
              id="colors"
              title="Cor"
              expanded={expandedFilters.has('colors')}
              onToggle={() => toggleMobileSection('colors')}
            >
              <div className="store-mobile-facet-options">
                {COLOR_ORDER.filter((color) => colorCounts.has(color)).map((color) => (
                  <FacetOption
                    key={color}
                    label={color === 'Azul claro' ? 'Azul Claro' : color}
                    count={colorCounts.get(color) ?? 0}
                    checked={filters.colors.includes(color)}
                    onChange={() => toggleMultiFilter('colors', color)}
                    swatch={COLOR_SWATCHES[color]}
                  />
                ))}
              </div>
            </MobileFilterSection>

            <MobileFilterSection
              id="sizes"
              title="Tamanho"
              expanded={expandedFilters.has('sizes')}
              onToggle={() => toggleMobileSection('sizes')}
            >
              <div className="store-mobile-facet-options">
                {SIZE_ORDER.filter((size) => sizeCounts.has(size)).map((size) => (
                  <FacetOption
                    key={size}
                    label={size === 'GG' ? 'Gg' : size}
                    count={sizeCounts.get(size) ?? 0}
                    checked={filters.sizes.includes(size)}
                    onChange={() => toggleMultiFilter('sizes', size)}
                  />
                ))}
              </div>
            </MobileFilterSection>

            <MobileFilterSection
              id="brands"
              title="Marca"
              expanded={expandedFilters.has('brands')}
              onToggle={() => toggleMobileSection('brands')}
            >
              <div className="store-mobile-facet-options">
                {(showAllBrands ? brands : brands.slice(0, 8)).map(([brand, count]) => (
                  <FacetOption
                    key={brand}
                    label={brand}
                    count={count}
                    checked={filters.brands.includes(brand)}
                    onChange={() => toggleMultiFilter('brands', brand)}
                  />
                ))}
                {brands.length > 8 ? (
                  <button
                    type="button"
                    className="store-facet-more"
                    onClick={() => setShowAllBrands((visible) => !visible)}
                  >
                    {showAllBrands ? 'Ver menos' : 'Ver mais'}
                  </button>
                ) : null}
              </div>
            </MobileFilterSection>

            <MobileFilterSection
              id="price"
              title="Preço"
              expanded={expandedFilters.has('price')}
              onToggle={() => toggleMobileSection('price')}
            >
              <div className="store-mobile-price-filter">
                <label>
                  <span>De</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={minimum}
                    placeholder={String(priceBounds.minimum)}
                    onChange={(event) => setMinimum(event.target.value)}
                  />
                </label>
                <label>
                  <span>Até</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={maximum}
                    placeholder={String(priceBounds.maximum)}
                    onChange={(event) => setMaximum(event.target.value)}
                  />
                </label>
                <button
                  type="button"
                  disabled={
                    !minimum &&
                    !maximum &&
                    filters.minPrice === null &&
                    filters.maxPrice === null
                  }
                  onClick={() => {
                    changeFilter('minPrice', minimum ? Number(minimum) : null);
                    changeFilter('maxPrice', maximum ? Number(maximum) : null);
                  }}
                >
                  Aplicar
                </button>
              </div>
            </MobileFilterSection>

            {hasActiveFilters ? (
              <button
                type="button"
                onClick={resetFilters}
                className="store-mobile-filter-reset"
              >
                Limpar filtros
              </button>
            ) : null}
          </aside>
        </div>
      ) : null}

      <div className="store-catalog-layout">
        <aside
          className="store-catalog-filters store-catalog-filters-desktop"
          aria-label="Filtros do catálogo"
        >
          <div className="store-filter-group">
            <h2>Ordenar por</h2>
            <select
              value={filters.sortBy}
              onChange={(event) => changeFilter('sortBy', event.target.value as SortBy)}
              aria-label="Ordenar por"
            >
              {(Object.keys(SORT_LABELS) as SortBy[]).map((key) => (
                <option key={key} value={key}>
                  {SORT_LABELS[key]}
                </option>
              ))}
            </select>
          </div>

          <div className="store-filter-group">
            <h2>Categorias</h2>
            <ul className="store-filter-list">
              {categories.map((category) => (
                <li key={category.label}>
                  <FilterLink
                    label={category.label}
                    active={filters.category === category.label}
                    onClick={() =>
                      changeFilter(
                        'category',
                        filters.category === category.label ? ALL : category.label,
                      )
                    }
                  />
                </li>
              ))}
            </ul>
          </div>

          <FacetGroup title="Cor" className="store-color-group">
            {COLOR_ORDER.filter((color) => colorCounts.has(color)).map((color) => (
              <FacetOption
                key={color}
                label={color === 'Azul claro' ? 'Azul Claro' : color}
                count={colorCounts.get(color) ?? 0}
                checked={filters.colors.includes(color)}
                onChange={() => toggleMultiFilter('colors', color)}
                swatch={COLOR_SWATCHES[color]}
              />
            ))}
          </FacetGroup>

          <FacetGroup title="Tamanho" className="store-size-group">
            {SIZE_ORDER.filter((size) => sizeCounts.has(size)).map((size) => (
              <FacetOption
                key={size}
                label={size === 'GG' ? 'Gg' : size}
                count={sizeCounts.get(size) ?? 0}
                checked={filters.sizes.includes(size)}
                onChange={() => toggleMultiFilter('sizes', size)}
              />
            ))}
          </FacetGroup>

          <FacetGroup title="Marca" className="store-brand-group">
            {(showAllBrands ? brands : brands.slice(0, 8)).map(([brand, count]) => (
              <FacetOption
                key={brand}
                label={brand}
                count={count}
                checked={filters.brands.includes(brand)}
                onChange={() => toggleMultiFilter('brands', brand)}
              />
            ))}
            {brands.length > 8 ? (
              <button
                type="button"
                className="store-facet-more"
                onClick={() => setShowAllBrands((visible) => !visible)}
              >
                {showAllBrands ? 'Ver menos' : 'Ver mais'}
              </button>
            ) : null}
          </FacetGroup>

          <FacetGroup title="Preço" className="store-price-group">
            <div className="store-price-filter">
              <label>
                <span>De</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={minimum}
                  placeholder={String(priceBounds.minimum)}
                  onChange={(event) => setMinimum(event.target.value)}
                />
              </label>
              <label>
                <span>Até</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={maximum}
                  placeholder={String(priceBounds.maximum)}
                  onChange={(event) => setMaximum(event.target.value)}
                />
              </label>
              <button
                type="button"
                disabled={
                  !minimum &&
                  !maximum &&
                  filters.minPrice === null &&
                  filters.maxPrice === null
                }
                onClick={() => {
                  changeFilter('minPrice', minimum ? Number(minimum) : null);
                  changeFilter('maxPrice', maximum ? Number(maximum) : null);
                }}
              >
                Aplicar
              </button>
            </div>
          </FacetGroup>

          {hasActiveFilters ? (
            <button type="button" onClick={resetFilters} className="store-filter-reset">
              Limpar filtros
            </button>
          ) : null}
        </aside>

        {jerseys.length > 0 ? (
          <>
          <div className="store-catalog-results store-catalog-results-desktop">
            <div className="store-catalog-grid">
              {pageItems.map((jersey) => (
                <JerseyCard
                  key={jersey.id}
                  jersey={jersey}
                  onSelect={onSelect}
                  isSaved={wishlist.has(jersey.id)}
                  onToggleWishlist={onToggleWishlist}
                />
              ))}
            </div>
            {pageCount > 1 ? (
              <nav className="store-pagination" aria-label="Páginas de produtos">
                {Array.from({ length: pageCount }, (_, index) => (
                  <button
                    type="button"
                    key={index}
                    className={currentPage === index ? 'is-active' : ''}
                    aria-current={currentPage === index ? 'page' : undefined}
                    onClick={() => {
                      setPagination({
                        key: filterKey,
                        desktopPage: index,
                        mobileCount: activePagination.mobileCount,
                      });
                      document.querySelector('#catalogo')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    {index + 1}
                  </button>
                ))}
              </nav>
            ) : null}
          </div>
          <div className="store-catalog-results store-catalog-results-mobile">
            <div className="store-catalog-grid store-catalog-grid-mobile">
              {mobileItems.map((jersey) => (
                <JerseyCard
                  key={jersey.id}
                  jersey={jersey}
                  onSelect={onSelect}
                  isSaved={wishlist.has(jersey.id)}
                  onToggleWishlist={onToggleWishlist}
                />
              ))}
            </div>
            <div
              ref={loadMoreRef}
              className="store-mobile-load-more"
              aria-hidden="true"
            />
          </div>
          </>
        ) : (
          <div className="store-catalog-empty">
            <h2>Nada encontrado</h2>
            <p>Tente outra busca ou remova os filtros para ver o acervo inteiro.</p>
            <button type="button" onClick={resetFilters}>
              Limpar filtros
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function MobileFilterSection({
  id,
  title,
  expanded,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const contentId = `mobile-filter-${id}`;
  return (
    <section className={`store-mobile-filter-section${expanded ? ' is-open' : ''}`}>
      <button
        type="button"
        className="store-mobile-filter-heading"
        aria-expanded={expanded}
        aria-controls={contentId}
        onClick={onToggle}
      >
        <span>{title}</span>
        <span
          className={`store-mobile-filter-chevron${expanded ? ' is-expanded' : ''}`}
          aria-hidden="true"
        />
      </button>
      <div id={contentId} className="store-mobile-filter-content" hidden={!expanded}>
        {children}
      </div>
    </section>
  );
}

function FacetGroup({
  title,
  children,
  className = '',
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`store-filter-group store-facet-group ${className}`}>
      <h2>{title}</h2>
      <div className="store-facet-options">{children}</div>
    </div>
  );
}

function FacetOption({
  label,
  count,
  checked,
  onChange,
  swatch,
}: {
  label: string;
  count: number;
  checked: boolean;
  onChange: () => void;
  swatch?: string;
}) {
  return (
    <label className="store-facet-option">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span>
        {label} ({count})
      </span>
      {swatch ? (
        <i
          className="store-color-swatch"
          style={{ backgroundColor: swatch }}
          aria-hidden="true"
        />
      ) : null}
    </label>
  );
}

function FilterLink({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'true' : undefined}
      className={active ? 'is-active' : ''}
    >
      {label}
    </button>
  );
}
