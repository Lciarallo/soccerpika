import React, { useState } from 'react';
import { ShoppingBag, Search, ShieldCheck, Heart, Zap, Sparkles, Flame } from 'lucide-react';

interface HeaderProps {
  cartCount: number;
  wishlistCount: number;
  onOpenCart: () => void;
  onOpenAuthenticity: () => void;
  onOpenSellModal: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeSection: string;
  setActiveSection: (section: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  cartCount,
  wishlistCount,
  onOpenCart,
  onOpenAuthenticity,
  onOpenSellModal,
  searchQuery,
  setSearchQuery,
  activeSection,
  setActiveSection
}) => {
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  return (
    <div className="sticky top-0 z-50">
      
      {/* Top Football Ticker Bar */}
      <div className="ticker-bar flex items-center justify-center gap-6">
        <span className="flex items-center gap-1.5 font-black">
          <Flame className="w-3.5 h-3.5 fill-current" /> SOCCER PIKA • ACERVO DE CAMISAS RARAS & DE JOGO
        </span>
        <span className="hidden md:inline font-black">• FRETE GRÁTIS ACIMA DE R$ 1.500</span>
        <span className="hidden lg:inline font-black">• 100% AUTÊNTICAS DE ÉPOCA</span>
      </div>

      {/* Main Header */}
      <header className="bg-[#090d16]/90 backdrop-blur-md border-b border-white/10 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 gap-4">
            
            {/* Logo & Identity */}
            <div 
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => setActiveSection('catalog')}
            >
              <div className="relative w-11 h-11 rounded-xl bg-gradient-to-tr from-[#00FF7F] via-[#FFD700] to-[#00FF7F] p-[2px] shadow-[0_0_20px_rgba(0,255,127,0.3)] transition-transform group-hover:scale-105">
                <div className="w-full h-full bg-[#0f1523] rounded-[10px] flex items-center justify-center">
                  <Zap className="w-6 h-6 text-[#FFD700] fill-[#FFD700] animate-pulse" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-2xl tracking-tight text-white font-['Outfit']">SOCCER<span className="text-[#00FF7F]">PIKA</span></span>
                  <span className="bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/40 text-[10px] font-black px-1.5 py-0.5 rounded tracking-widest uppercase">VAULT</span>
                </div>
                <p className="text-[11px] font-medium text-gray-400 -mt-1 tracking-wide">Futebol Raiz & Raridades</p>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-6">
              <button 
                onClick={() => setActiveSection('catalog')}
                className={`text-sm font-bold transition-colors ${activeSection === 'catalog' ? 'text-[#00FF7F]' : 'text-gray-300 hover:text-white'}`}
              >
                Todas as Camisas (30)
              </button>

              <button 
                onClick={() => {
                  setActiveSection('catalog');
                  const heroEl = document.getElementById('hero-spotlight');
                  heroEl?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-sm font-bold text-gray-300 hover:text-[#FFD700] transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4 text-[#FFD700]" />
                Relíquia da Semana
              </button>

              <button 
                onClick={onOpenAuthenticity}
                className="text-sm font-bold text-gray-300 hover:text-[#00FF7F] transition-colors flex items-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4 text-[#00FF7F]" />
                Verificar Autenticidade
              </button>

              <button 
                onClick={onOpenSellModal}
                className="text-sm font-bold text-gray-300 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3.5 py-1.5 rounded-xl border border-white/10"
              >
                Vender / Desapegar
              </button>
            </nav>

            {/* Search Bar */}
            <div className="flex-1 max-w-xs relative hidden sm:block">
              <div className={`relative flex items-center rounded-xl bg-white/5 border transition-all ${isSearchFocused ? 'border-[#00FF7F] bg-white/10 shadow-[0_0_15px_rgba(0,255,127,0.15)]' : 'border-white/10'}`}>
                <Search className="w-4 h-4 text-gray-400 ml-3.5 absolute pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar Grêmio, Brasil, Romário, Pirlo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  className="w-full bg-transparent pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Cart & Wishlist Buttons */}
            <div className="flex items-center gap-3">
              <button 
                className="relative p-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-rose-400 hover:border-rose-500/40 hover:bg-white/10 transition-all"
                title="Favoritos"
              >
                <Heart className="w-5 h-5" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#090d16]">
                    {wishlistCount}
                  </span>
                )}
              </button>

              <button
                onClick={onOpenCart}
                className="relative flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#00FF7F]/10 border border-[#00FF7F]/40 text-[#00FF7F] hover:bg-[#00FF7F]/20 font-bold transition-all shadow-[0_0_15px_rgba(0,255,127,0.15)]"
              >
                <ShoppingBag className="w-5 h-5 text-[#00FF7F]" />
                <span className="text-xs tracking-wider uppercase font-black hidden lg:inline">Carrinho</span>
                <span className="bg-[#00FF7F] text-[#041209] text-xs font-black px-2 py-0.5 rounded-full">
                  {cartCount}
                </span>
              </button>
            </div>

          </div>
        </div>
      </header>
    </div>
  );
};
