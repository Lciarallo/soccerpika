import React from 'react';
import { Heart, ShoppingBag, Eye, Star } from 'lucide-react';
import type { Jersey } from '../types/jersey';

interface JerseyCardProps {
  jersey: Jersey;
  isWishlisted: boolean;
  onToggleWishlist: (jersey: Jersey) => void;
  onSelectJersey: (jersey: Jersey) => void;
  onAddToCart: (jersey: Jersey, size: 'P' | 'M' | 'G' | 'GG') => void;
}

export const JerseyCard: React.FC<JerseyCardProps> = ({
  jersey,
  isWishlisted,
  onToggleWishlist,
  onSelectJersey,
  onAddToCart
}) => {
  const getRarityBadge = (tier: string) => {
    switch (tier) {
      case 'GRAIL':
        return <span className="badge-rarity badge-grail flex items-center gap-1">★ GRAIL</span>;
      case 'LEGENDARY':
        return <span className="badge-rarity badge-legendary">LEGENDÁRIA</span>;
      case 'COLLECTOR':
        return <span className="badge-rarity badge-collector">COLECIONADOR</span>;
      default:
        return <span className="badge-rarity badge-rare">RARA</span>;
    }
  };

  return (
    <div className="jersey-card group relative flex flex-col justify-between">
      
      {/* Image Container */}
      <div 
        className="relative aspect-[4/4] overflow-hidden bg-black/50 cursor-pointer"
        onClick={() => onSelectJersey(jersey)}
      >
        <img
          src={jersey.images[0]}
          alt={jersey.name}
          className="w-full h-full object-cover object-center group-hover:scale-108 transition-transform duration-500"
          loading="lazy"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-[#0f1523] via-transparent to-black/40" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <div>{getRarityBadge(jersey.rarityTier)}</div>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleWishlist(jersey);
            }}
            className={`pointer-events-auto p-2 rounded-full backdrop-blur-md transition-all ${
              isWishlisted 
                ? 'bg-rose-500/20 text-rose-500 border border-rose-500/50' 
                : 'bg-black/50 text-gray-300 hover:text-white border border-white/10'
            }`}
            title="Favoritar Manto"
          >
            <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-rose-500' : ''}`} />
          </button>
        </div>

        {/* Match Worn / Autographed Badge */}
        <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-1 pointer-events-none">
          <div className="flex items-center gap-1 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-md text-[11px] text-gray-200 font-bold border border-white/10">
            <Star className="w-3 h-3 text-[#FFD700] fill-[#FFD700]" />
            <span>{jersey.condition.split(' ')[0]}</span>
          </div>

          {jersey.isMatchWorn && (
            <span className="bg-amber-500 text-black font-black text-[9px] px-2 py-0.5 rounded tracking-wider uppercase">
              DE JOGO
            </span>
          )}

          {jersey.isAutographed && (
            <span className="bg-purple-600 text-white font-black text-[9px] px-2 py-0.5 rounded tracking-wider uppercase">
              AUTOGRAFADA
            </span>
          )}
        </div>

        {/* Hover Quick View Button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[2px]">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectJersey(jersey);
            }}
            className="px-4 py-2.5 rounded-xl bg-white text-black font-extrabold text-xs flex items-center gap-1.5 shadow-2xl transform translate-y-2 group-hover:translate-y-0 transition-all font-['Outfit']"
          >
            <Eye className="w-4 h-4" /> Detalhes da Peça
          </button>
        </div>

      </div>

      {/* Info Section */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        
        <div>
          <div className="flex items-center justify-between text-xs text-gray-400 font-semibold mb-1">
            <span className="text-[#00FF7F] font-bold">{jersey.club}</span>
            <span className="font-mono text-gray-400">{jersey.season}</span>
          </div>

          <h3 
            onClick={() => onSelectJersey(jersey)}
            className="text-base font-bold text-white hover:text-[#00FF7F] transition-colors cursor-pointer line-clamp-2 font-['Outfit'] leading-snug"
          >
            {jersey.name}
          </h3>
          
          <p className="text-[11px] text-gray-400 mt-1 line-clamp-1 font-mono">
            {jersey.brand} • {jersey.authenticityCode}
          </p>
        </div>

        {/* Price & Action */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-gray-400 block font-medium">À vista no PIX</span>
            <div className="text-lg font-black text-[#00FF7F] font-['Outfit']">
              R$ {jersey.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <button
            onClick={() => onAddToCart(jersey, jersey.sizes[0])}
            className="p-2.5 rounded-xl bg-[#00FF7F] hover:bg-[#00e070] text-[#041209] font-bold transition-all shadow-[0_0_15px_rgba(0,255,127,0.2)]"
            title="Adicionar ao carrinho"
          >
            <ShoppingBag className="w-5 h-5" />
          </button>
        </div>

      </div>

    </div>
  );
};
