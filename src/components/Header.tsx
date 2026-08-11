import { useState } from 'react';
import { Search, X } from 'lucide-react';
import type { SessionUser } from '../lib/api';
import { ALL, type CategoryNode } from '../lib/categories';

interface HeaderProps {
  cartCount: number;
  onOpenCart: () => void;
  query: string;
  onQueryChange: (value: string) => void;
  categoryTree: CategoryNode[];
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
  categoryTree,
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

  const toggleSearch = () => {
    setSearchOpen((v) => !v);
    setMenuOpen(false);
  };

  return (
    <header id="topo" className="sticky top-0 z-40 bg-paper">
      {/*
       * minmax(0,1fr) nas laterais: com `1fr` puro elas não encolhem abaixo do
       * próprio conteúdo e espremem a coluna do meio, fazendo o logo vazar por
       * cima dos links. Abaixo de `sm` sobram só Menu, logo e Carrinho — quatro
       * rótulos não cabem em 320px; Buscar e Entrar vão para dentro do painel.
       */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center px-4 py-4 sm:px-8">
        {/* Esquerda */}
        <div className="flex items-center gap-4 text-sm tracking-wide uppercase sm:gap-7 sm:text-base">
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
            onClick={toggleSearch}
            aria-expanded={searchOpen}
            className="hidden uppercase hover:text-brand sm:inline"
          >
            Buscar
          </button>
        </div>

        {/* Logo centralizado */}
        <a href="#topo" aria-label="Soccer Pika — início" className="px-1 sm:px-2">
          <img
            src="/logo.png"
            alt="Soccer Pika"
            width={56}
            height={56}
            className="h-10 w-10 sm:h-14 sm:w-14"
          />
        </a>

        {/* Direita */}
        <div className="flex items-center justify-end gap-4 text-sm tracking-wide uppercase sm:gap-7 sm:text-base">
          {isAdmin && (
            <button
              type="button"
              onClick={() => onNavigate('/admin')}
              className="hidden uppercase hover:text-brand lg:inline"
            >
              Painel
            </button>
          )}

          {user ? (
            <button
              type="button"
              onClick={() => onNavigate('/conta')}
              className="hidden max-w-28 truncate uppercase hover:text-brand sm:inline"
              title={user.email}
            >
              {user.name.split(' ')[0]}
            </button>
          ) : (
            <button
              type="button"
              onClick={onLogin}
              className="hidden uppercase hover:text-brand sm:inline"
            >
              Entrar
            </button>
          )}

          {/* Contagem inline: um badge flutuante vazava a borda no mobile. */}
          <button type="button" onClick={onOpenCart} className="uppercase hover:text-brand">
            Carrinho
            <span className={cartCount > 0 ? 'text-brand' : 'text-muted'}> ({cartCount})</span>
          </button>
        </div>
      </div>

      {/* Busca */}
      {searchOpen && (
        <div className="px-4 pb-4 sm:px-8">
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

      {/* Painel do menu */}
      {menuOpen && (
        <nav className="px-4 pb-6 sm:px-8" aria-label="Menu">
          <ul className="mx-auto max-w-2xl">
            <li className="border-b border-line">
              <button
                type="button"
                onClick={() => pick(ALL)}
                aria-current={activeCategory === ALL ? 'true' : undefined}
                className={`w-full py-3 text-left font-display text-2xl font-800 uppercase
                            transition-colors sm:text-3xl ${
                              activeCategory === ALL ? 'text-brand' : 'hover:text-brand'
                            }`}
              >
                Ver todos os produtos
              </button>
            </li>

            {categoryTree.map((node) => (
              <li key={node.label} className="border-b border-line">
                <button
                  type="button"
                  onClick={() => pick(node.label)}
                  aria-current={activeCategory === node.label ? 'true' : undefined}
                  className={`w-full py-3 text-left font-display text-2xl font-800 uppercase
                              transition-colors sm:text-3xl ${
                                activeCategory === node.label ? 'text-brand' : 'hover:text-brand'
                              }`}
                >
                  {node.label}
                </button>

                {/* Segundo nível, como no menu da loja. */}
                {node.children.length > 0 && (
                  <ul className="pb-3 pl-4">
                    {node.children.map((child) => (
                      <li key={child}>
                        <button
                          type="button"
                          onClick={() => pick(child)}
                          aria-current={activeCategory === child ? 'true' : undefined}
                          className={`w-full py-1.5 text-left text-sm tracking-wide uppercase
                                      transition-colors ${
                                        activeCategory === child
                                          ? 'font-bold text-brand'
                                          : 'text-muted hover:text-ink'
                                      }`}
                        >
                          {child}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}

            {/* Só no mobile: o que não coube no cabeçalho. */}
            <li className="border-b border-line sm:hidden">
              <button
                type="button"
                onClick={toggleSearch}
                className="w-full py-3 text-left text-sm tracking-wide uppercase hover:text-brand"
              >
                Buscar
              </button>
            </li>
            <li className="border-b border-line sm:hidden">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  if (user) onNavigate('/conta');
                  else onLogin();
                }}
                className="w-full py-3 text-left text-sm tracking-wide uppercase hover:text-brand"
              >
                {user ? 'Minha conta' : 'Entrar'}
              </button>
            </li>
            {isAdmin && (
              <li className="border-b border-line lg:hidden">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onNavigate('/admin');
                  }}
                  className="w-full py-3 text-left text-sm tracking-wide uppercase hover:text-brand"
                >
                  Painel
                </button>
              </li>
            )}
          </ul>
        </nav>
      )}
    </header>
  );
}
