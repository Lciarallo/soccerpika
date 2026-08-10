import { useState } from 'react';
import { Menu, Search, ShoppingBag, X } from 'lucide-react';

interface HeaderProps {
  cartCount: number;
  onOpenCart: () => void;
  query: string;
  onQueryChange: (value: string) => void;
  categories: string[];
  activeCategory: string;
  onCategoryChange: (value: string) => void;
}

export function Header({
  cartCount,
  onOpenCart,
  query,
  onQueryChange,
  categories,
  activeCategory,
  onCategoryChange,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const pick = (category: string) => {
    onCategoryChange(category);
    setMenuOpen(false);
    document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 bg-paper">
      {/* Barra superior preta — igual à adbar da loja original */}
      <div className="bg-ink text-paper">
        <p className="mx-auto max-w-7xl px-4 py-2 text-center text-xs font-semibold tracking-wide">
          PEÇAS ÚNICAS · ENVIO PARA TODO O BRASIL · PARCELE EM ATÉ 12X
        </p>
      </div>

      <div className="border-b-2 border-ink">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="-ml-1 p-2 md:hidden"
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <a href="#topo" className="flex shrink-0 items-center gap-3">
            <img
              src="./logo.png"
              alt="Soccer Pika"
              width={44}
              height={44}
              className="h-11 w-11"
            />
            <span className="hidden font-display text-xl font-900 tracking-tight sm:block">
              SOCCER<span className="text-brand">PIKA</span>
            </span>
          </a>

          <div className="relative ml-auto hidden max-w-sm flex-1 md:block">
            <Search
              size={18}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Buscar camisa, clube, ano…"
              className="w-full border-2 border-line py-2.5 pr-3 pl-10 text-sm font-medium
                         placeholder:text-muted focus:border-ink focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={onOpenCart}
            className="relative ml-auto p-2 md:ml-0"
            aria-label={`Abrir carrinho (${cartCount} ${cartCount === 1 ? 'item' : 'itens'})`}
          >
            <ShoppingBag size={22} />
            {cartCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center
                           rounded-full bg-brand px-1 text-[11px] font-bold text-paper"
              >
                {cartCount}
              </span>
            )}
          </button>
        </div>

        {/* Busca no mobile */}
        <div className="border-t border-line px-4 py-2 md:hidden">
          <div className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Buscar camisa, clube, ano…"
              className="w-full border-2 border-line py-2.5 pr-3 pl-10 text-sm font-medium
                         placeholder:text-muted focus:border-ink focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Navegação de categorias */}
      <nav
        className={`border-b-2 border-ink bg-paper ${menuOpen ? 'block' : 'hidden md:block'}`}
        aria-label="Categorias"
      >
        <ul className="mx-auto flex max-w-7xl flex-col gap-0 px-4 md:flex-row md:gap-1">
          {categories.map((category) => {
            const active = activeCategory === category;
            return (
              <li key={category}>
                <button
                  type="button"
                  onClick={() => pick(category)}
                  aria-current={active ? 'true' : undefined}
                  className={`w-full border-b-4 py-3 text-left text-sm font-bold tracking-wide uppercase
                              transition-colors md:w-auto md:px-4 md:text-center ${
                                active
                                  ? 'border-brand text-brand'
                                  : 'border-transparent hover:border-ink'
                              }`}
                >
                  {category}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="rule-brand" />
    </header>
  );
}
