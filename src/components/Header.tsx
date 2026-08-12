import { useEffect, useRef, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import type { SessionUser } from '../lib/api';
import { ALL, type CategoryNode } from '../lib/categories';

interface HeaderProps {
  cartCount: number;
  onOpenCart: () => void;
  query: string;
  onSearch: (value: string) => void;
  categoryTree: CategoryNode[];
  activeCategory: string;
  onCategoryChange: (value: string) => void;
  user: SessionUser | null;
  isAdmin: boolean;
  onLogin: () => void;
  onRegister: () => void;
  onNavigate: (to: string) => void;
}

const FALLBACK_CATEGORIES: CategoryNode[] = [
  { label: 'De Jogo', children: ['Autografadas'] },
  { label: 'Europeus', children: ['Espanhóis', 'Italianos'] },
  { label: 'Brasileiros', children: [] },
  { label: 'Sulamericanas', children: [] },
  { label: 'Seleções', children: [] },
];

const CATEGORY_ORDER = new Map(
  FALLBACK_CATEGORIES.map((category, index) => [category.label, index]),
);

export function Header({
  cartCount,
  onOpenCart,
  query,
  onSearch,
  categoryTree,
  activeCategory,
  onCategoryChange,
  user,
  isAdmin,
  onLogin,
  onRegister,
  onNavigate,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState(query);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 767px)').matches);
  const [compressed, setCompressed] = useState(() => window.scrollY > 40);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);
  const menuDialogRef = useRef<HTMLElement>(null);
  const searchDialogRef = useRef<HTMLDivElement>(null);
  const menuCategories = [...(categoryTree.length > 0 ? categoryTree : FALLBACK_CATEGORIES)].toSorted(
    (a, b) =>
      (CATEGORY_ORDER.get(a.label) ?? Number.MAX_SAFE_INTEGER) -
      (CATEGORY_ORDER.get(b.label) ?? Number.MAX_SAFE_INTEGER),
  );
  const showMobileProducts = productsOpen && isMobile;

  useEffect(() => {
    const syncHeader = () => setCompressed(window.scrollY > 40);
    window.addEventListener('scroll', syncHeader, { passive: true });
    return () => window.removeEventListener('scroll', syncHeader);
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const syncViewport = () => setIsMobile(media.matches);
    media.addEventListener('change', syncViewport);
    return () => media.removeEventListener('change', syncViewport);
  }, []);

  useEffect(() => {
    if (!menuOpen && !searchOpen) return;
    const previousOverflow = document.body.style.overflow;
    const restoreFocus = searchOpen ? searchTriggerRef.current : menuTriggerRef.current;
    const mobileProducts = showMobileProducts
      ? menuDialogRef.current?.querySelector<HTMLElement>('.store-mobile-products')
      : null;
    const dialog = searchOpen
      ? searchDialogRef.current
      : mobileProducts
        ? mobileProducts
        : menuDialogRef.current;
    const initialFocus = searchOpen
      ? dialog?.querySelector<HTMLElement>('input')
      : dialog?.querySelector<HTMLElement>('button');
    const frame = window.requestAnimationFrame(() => initialFocus?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        setSearchOpen(false);
        setProductsOpen(false);
        return;
      }

      if (event.key !== 'Tab' || !dialog) return;
      const focusable = [...dialog.querySelectorAll<HTMLElement>('button, input, a[href]')].filter(
        (element) => !element.hasAttribute('disabled') && element.offsetParent !== null,
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable.at(-1)!;
      if (!dialog.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      restoreFocus?.focus();
    };
  }, [menuOpen, searchOpen, showMobileProducts]);

  const closeOverlays = () => {
    setMenuOpen(false);
    setSearchOpen(false);
  };

  const go = (to: string) => {
    closeOverlays();
    onNavigate(to);
  };

  const pickCategory = (category: string) => {
    onCategoryChange(category);
    go('/produtos');
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch(searchDraft);
    go('/produtos');
  };

  return (
    <header id="topo" className={`store-header${compressed ? ' is-compressed' : ''}`}>
      <div className="store-header-row">
        <div className="store-header-side store-header-left">
          <button
            ref={menuTriggerRef}
            type="button"
            aria-controls="store-menu-dialog"
            aria-expanded={menuOpen}
            onClick={() => {
              setSearchDraft(query);
              setMenuOpen(true);
              setSearchOpen(false);
              setProductsOpen(false);
            }}
          >
            Menu
          </button>
          <button
            ref={searchTriggerRef}
            type="button"
            className="store-header-search-trigger"
            aria-controls="store-search-dialog"
            aria-expanded={searchOpen}
            onClick={() => {
              setSearchDraft(query);
              setSearchOpen(true);
              setMenuOpen(false);
            }}
          >
            Buscar
          </button>
        </div>

        <button
          type="button"
          onClick={() => go('/')}
          className="store-logo"
          aria-label="Soccer Pika — início"
        >
          <img src="/logo.png" alt="Soccer Pika" width={70} height={70} />
        </button>

        <div className="store-header-side store-header-right">
          {user ? (
            <button
              type="button"
              onClick={() => go('/conta')}
              className="store-account-link"
              title={user.email}
            >
              {user.name.split(' ')[0] || 'Conta'}
            </button>
          ) : (
            <button type="button" onClick={onLogin} className="store-account-link">
              Login
            </button>
          )}
          <button type="button" onClick={onOpenCart} className="store-cart-link">
            Carrinho
            <span className="store-cart-count" aria-label={`${cartCount} itens`}>
              {cartCount}
            </span>
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div
          className="store-overlay store-menu-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setMenuOpen(false);
          }}
        >
          <aside
            id="store-menu-dialog"
            ref={menuDialogRef}
            className="store-menu-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
          >
            <div
              className="store-menu-primary"
              aria-hidden={showMobileProducts || undefined}
              inert={showMobileProducts || undefined}
            >
              <div className="store-drawer-close-row">
                <button type="button" onClick={() => setMenuOpen(false)} aria-label="Fechar menu">
                  <X size={24} strokeWidth={2} />
                </button>
              </div>
              <form onSubmit={submitSearch} className="store-menu-search">
                <input
                  type="search"
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  placeholder="O que você está buscando?"
                  aria-label="Buscar produtos"
                />
                <button type="submit">Buscar</button>
              </form>
              <nav aria-label="Navegação principal">
              <ul className="store-menu-list">
                <li>
                  <button type="button" onClick={() => go('/')}>
                    Início
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setProductsOpen((open) => !open)}
                    aria-expanded={productsOpen}
                  >
                    <span>Produtos</span>
                    <span className="store-menu-arrow" aria-hidden="true">
                      {productsOpen ? '−' : '▸'}
                    </span>
                  </button>
                  {productsOpen ? (
                    <ul className="store-submenu">
                      <li>
                        <button type="button" onClick={() => pickCategory(ALL)}>
                          Ver todos os produtos
                        </button>
                      </li>
                      {menuCategories.map((category) => (
                        <li key={category.label}>
                          <button
                            type="button"
                            className={activeCategory === category.label ? 'is-active' : ''}
                            onClick={() => pickCategory(category.label)}
                          >
                            {category.label}
                          </button>
                          {category.children.length > 0 ? (
                            <ul>
                              {category.children.map((child) => (
                                <li key={child}>
                                  <button
                                    type="button"
                                    className={activeCategory === child ? 'is-active' : ''}
                                    onClick={() => pickCategory(child)}
                                  >
                                    {child}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
                <li>
                  <button type="button" onClick={() => go('/contato')}>
                    Contato
                  </button>
                </li>
                {isAdmin ? (
                  <li>
                    <button type="button" onClick={() => go('/admin')}>
                      Painel
                    </button>
                  </li>
                ) : null}
              </ul>

              <div className="store-menu-session">
                {user ? (
                  <button type="button" onClick={() => go('/conta')}>
                    Minha conta
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        closeOverlays();
                        onLogin();
                      }}
                    >
                      Iniciar sessão
                    </button>
                    <span aria-hidden="true">/</span>
                    <button
                      type="button"
                      onClick={() => {
                        closeOverlays();
                        onRegister();
                      }}
                    >
                      Criar uma conta
                    </button>
                  </>
                )}
              </div>
              </nav>
            </div>

            {showMobileProducts ? (
              <MobileProductsMenu
                categories={menuCategories}
                activeCategory={activeCategory}
                onBack={() => setProductsOpen(false)}
                onClose={() => {
                  setMenuOpen(false);
                  setProductsOpen(false);
                }}
                onPick={pickCategory}
              />
            ) : null}
          </aside>
        </div>
      ) : null}

      {searchOpen ? (
        <div
          id="store-search-dialog"
          ref={searchDialogRef}
          className="store-overlay store-search-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Busca"
        >
          <button
            type="button"
            onClick={() => setSearchOpen(false)}
            className="store-search-close"
            aria-label="Fechar busca"
          >
            <X size={42} strokeWidth={2} />
          </button>
          <form onSubmit={submitSearch} className="store-search-form">
            <input
              type="search"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="O que você está buscando?"
              aria-label="O que você está buscando?"
            />
            <button type="submit">Buscar</button>
          </form>
        </div>
      ) : null}
    </header>
  );
}

function MobileProductsMenu({
  categories,
  activeCategory,
  onBack,
  onClose,
  onPick,
}: {
  categories: CategoryNode[];
  activeCategory: string;
  onBack: () => void;
  onClose: () => void;
  onPick: (category: string) => void;
}) {
  const [parent, setParent] = useState<CategoryNode | null>(null);
  const backRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    backRef.current?.focus();
  }, [parent]);

  const goBack = () => {
    if (parent) setParent(null);
    else onBack();
  };

  return (
    <div className="store-mobile-products">
      <div className="store-mobile-products-header">
        <button ref={backRef} type="button" onClick={goBack} aria-label="Voltar">
          ◀
        </button>
        <strong>{parent?.label ?? 'Produtos'}</strong>
        <button type="button" onClick={onClose} aria-label="Fechar menu">
          <X size={24} strokeWidth={2} />
        </button>
      </div>
      <ul className="store-mobile-products-list">
        <li>
          <button
            type="button"
            className={parent && activeCategory === parent.label ? 'is-active' : ''}
            onClick={() => onPick(parent?.label ?? ALL)}
          >
            {parent ? `Ver tudo em ${parent.label}` : 'Ver todos os produtos'}
          </button>
        </li>
        {(parent ? parent.children.map((label) => ({ label, children: [] })) : categories).map(
          (category) => (
            <li key={category.label}>
              <button
                type="button"
                className={activeCategory === category.label ? 'is-active' : ''}
                onClick={() => {
                  if (category.children.length > 0) setParent(category);
                  else onPick(category.label);
                }}
              >
                <span>{category.label}</span>
                {category.children.length > 0 ? <span aria-hidden="true">▶</span> : null}
              </button>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
