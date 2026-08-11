import { useState } from 'react';
import { Search, X } from 'lucide-react';
import type { SessionUser } from '../lib/api';

interface HeaderProps {
  cartCount: number;
  onOpenCart: () => void;
  query: string;
  onQueryChange: (value: string) => void;
  categories: string[];
  activeCategory: string;
  onCategoryChange: (value: string) => void;
  user: SessionUser | null;
  isAdmin: boolean;
  onLogin: () => void;
  onNavigate: (to: string) => void;
}

export function Header({
  cartCount,
  onOpenCart,
  query,
  onQueryChange,
  categories,
  activeCategory,
  onCategoryChange,
  user,
  isAdmin,
  onLogin,
  onNavigate,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const pick = (category: string) => {
    onCategoryChange(category);
    setMenuOpen(false);
    document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header id="topo" className="sticky top-0 z-40 bg-paper">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center px-5 py-4 sm:px-8">
        {/* Esquerda */}
        <div className="flex items-center gap-5 text-sm tracking-wide uppercase sm:gap-7 sm:text-base">
          <button
            type="button"
            onClick={() => {
              setMenuOpen((v) => !v);
              setSearchOpen(false);
            }}
            aria-expanded={menuOpen}
            className="uppercase hover:text-brand"
          >
            {menuOpen ? 'Fechar' : 'Menu'}
          </button>
          <button
            type="button"
            onClick={() => {
              setSearchOpen((v) => !v);
              setMenuOpen(false);
            }}
            aria-expanded={searchOpen}
            className="uppercase hover:text-brand"
          >
            Buscar
          </button>
        </div>

        {/* Logo centralizado */}
        <a href="#topo" aria-label="Soccer Pika — início">
          <img src="/logo.png" alt="Soccer Pika" width={56} height={56} className="h-14 w-14" />
        </a>

        {/* Direita */}
        <div className="flex items-center justify-end gap-5 text-sm tracking-wide uppercase sm:gap-7 sm:text-base">
          {isAdmin && (
            <button
              type="button"
              onClick={() => onNavigate('/admin')}
              className="hidden uppercase hover:text-brand sm:inline"
            >
              Painel
            </button>
          )}

          {user ? (
            <button
              type="button"
              onClick={() => onNavigate('/conta')}
              className="max-w-28 truncate uppercase hover:text-brand"
              title={user.email}
            >
              {user.name.split(' ')[0]}
            </button>
          ) : (
            <button type="button" onClick={onLogin} className="uppercase hover:text-brand">
              Entrar
            </button>
          )}

          <button type="button" onClick={onOpenCart} className="relative uppercase hover:text-brand">
            Carrinho
            <span
              className={`absolute -top-1 -right-3 flex h-4 min-w-4 items-center justify-center
                          rounded-full px-1 text-[10px] font-bold ${
                            cartCount > 0 ? 'bg-brand text-paper' : 'bg-ink text-paper'
                          }`}
            >
              {cartCount}
            </span>
          </button>
        </div>
      </div>

      {/* Busca */}
      {searchOpen && (
        <div className="px-5 pb-4 sm:px-8">
          <div className="relative mx-auto max-w-2xl">
            <Search
              size={18}
              className="pointer-events-none absolute top-1/2 left-0 -translate-y-1/2 text-muted"
            />
            <input
              type="search"
              autoFocus
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Buscar camisa, clube, ano…"
              className="w-full border-b border-ink bg-transparent py-2.5 pr-8 pl-7 text-base
                         placeholder:text-muted focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => onQueryChange('')}
                aria-label="Limpar busca"
                className="absolute top-1/2 right-0 -translate-y-1/2 text-muted hover:text-ink"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Menu de categorias */}
      {menuOpen && (
        <nav className="px-5 pb-6 sm:px-8" aria-label="Categorias">
          <ul className="mx-auto max-w-2xl">
            {categories.map((category) => (
              <li key={category} className="border-b border-line last:border-b-0">
                <button
                  type="button"
                  onClick={() => pick(category)}
                  aria-current={activeCategory === category ? 'true' : undefined}
                  className={`w-full py-3 text-left font-display text-2xl font-800 uppercase
                              transition-colors sm:text-3xl ${
                                activeCategory === category ? 'text-brand' : 'hover:text-brand'
                              }`}
                >
                  {category}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
