import React, { useState } from 'react';
import { X, ShieldCheck, Check, ShoppingBag, Heart } from 'lucide-react';
import type { Jersey } from '../types/jersey';

interface ProductModalProps {
  jersey: Jersey | null;
  onClose: () => void;
  onAddToCart: (jersey: Jersey, size: 'P' | 'M' | 'G' | 'GG') => void;
  isWishlisted: boolean;
  onToggleWishlist: (jersey: Jersey) => void;
  onOpenAuthenticityWithCode: (code: string) => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  jersey,
  onClose,
  onAddToCart,
  isWishlisted,
  onToggleWishlist,
  onOpenAuthenticityWithCode
}) => {
  if (!jersey) return null;

  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState<'P' | 'M' | 'G' | 'GG'>(jersey.sizes[0]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto glass-panel border border-white/20 p-6 md:p-8 bg-[#0c101a] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          
          {/* Left: Product Images Gallery */}
          <div className="md:col-span-6 space-y-4">
            
            <div className="relative aspect-[4/4] rounded-xl overflow-hidden bg-black/60 border border-white/10">
              <img
                src={jersey.images[selectedImage] || jersey.images[0]}
                alt={jersey.name}
                className="w-full h-full object-cover object-center"
              />

              {jersey.isMatchWorn && (
                <span className="absolute top-3 left-3 bg-amber-500 text-black font-black text-[10px] px-2.5 py-1 rounded tracking-wider uppercase shadow-lg">
                  MATCH WORN (USADA EM JOGO)
                </span>
              )}

              {jersey.isAutographed && (
                <span className="absolute top-3 right-3 bg-purple-600 text-white font-black text-[10px] px-2.5 py-1 rounded tracking-wider uppercase shadow-lg">
                  AUTOGRAFADA COM CERTIFICADO
                </span>
              )}
            </div>

            {/* Thumbnails */}
            {jersey.images.length > 1 && (
              <div className="flex items-center gap-3">
                {jersey.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImage === idx ? 'border-[#00FF7F] scale-105' : 'border-white/10 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Authenticity Box */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#00FF7F]" />
                  Código de Autenticidade Vault:
                </span>
                <span className="text-xs font-mono font-bold text-[#00FF7F] bg-[#00FF7F]/10 px-2 py-0.5 rounded border border-[#00FF7F]/30">
                  {jersey.authenticityCode}
                </span>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenAuthenticityWithCode(jersey.authenticityCode);
                }}
                className="w-full py-2 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-white font-bold transition-colors flex items-center justify-center gap-1"
              >
                Verificar Certificado Digital Completo
              </button>
            </div>

          </div>

          {/* Right: Details & Order Form */}
          <div className="md:col-span-6 flex flex-col justify-between space-y-6">
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  {jersey.brand} • {jersey.season}
                </span>
                <button
                  onClick={() => onToggleWishlist(jersey)}
                  className={`p-2 rounded-full border transition-all ${
                    isWishlisted 
                      ? 'bg-rose-500/20 text-rose-500 border-rose-500/50' 
                      : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-rose-500' : ''}`} />
                </button>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white font-['Outfit'] leading-tight">
                {jersey.name}
              </h2>

              {/* Price */}
              <div className="flex items-baseline gap-3 pt-2">
                <span className="text-3xl font-black text-[#00FF7F] font-['Outfit']">
                  R$ {jersey.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                {jersey.originalPrice && (
                  <span className="text-base text-gray-500 line-through">
                    R$ {jersey.originalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>

              {/* Description & History */}
              <div className="space-y-2 pt-2 text-sm text-gray-300 leading-relaxed">
                <p>{jersey.description}</p>
                <div className="p-3 rounded-lg bg-[#141b2b] border border-white/10 text-xs text-gray-300">
                  <span className="font-bold text-[#FFD700] block mb-1">Histórico da Peça:</span>
                  {jersey.history}
                </div>
              </div>

              {/* Condition Badge */}
              <div className="flex items-center gap-2 pt-1 text-xs">
                <span className="text-gray-400 font-semibold">Estado de Conservação:</span>
                <span className="text-[#FFD700] font-bold bg-[#FFD700]/10 px-2.5 py-1 rounded border border-[#FFD700]/30">
                  {jersey.condition}
                </span>
              </div>

              {/* Size Selector */}
              <div className="space-y-2 pt-4">
                <label className="text-xs font-bold text-gray-300 block uppercase tracking-wider">
                  Selecione o Tamanho Disponível:
                </label>
                <div className="flex items-center gap-3">
                  {jersey.sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`w-12 h-12 rounded-xl font-bold text-sm transition-all border ${
                        selectedSize === size
                          ? 'bg-[#00FF7F] text-[#05140b] border-[#00FF7F] shadow-[0_0_15px_rgba(0,255,127,0.3)] scale-105'
                          : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-6 border-t border-white/10">
              <button
                onClick={() => {
                  onAddToCart(jersey, selectedSize);
                  onClose();
                }}
                className="btn-primary w-full py-4 text-center justify-center font-bold text-base shadow-[0_0_20px_rgba(0,255,127,0.3)]"
              >
                <ShoppingBag className="w-5 h-5" /> Adicionar ao Carrinho
              </button>

              <div className="flex items-center justify-center gap-4 text-xs text-gray-400 pt-1">
                <span className="flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-[#00FF7F]" /> Envio com Seguro Total
                </span>
                <span className="flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-[#00FF7F]" /> Lacre Inviolável
                </span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
