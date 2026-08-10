import React, { useState } from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, Tag, Check, Copy, QrCode } from 'lucide-react';
import confetti from 'canvas-confetti';
import type { CartItem } from '../types/jersey';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (jerseyId: string, size: string, delta: number) => void;
  onRemoveItem: (jerseyId: string, size: string) => void;
  onClearCart: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart
}) => {
  if (!isOpen) return null;

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountPercent: number } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card'>('pix');
  const [orderCompleted, setOrderCompleted] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);

  const subtotal = items.reduce((acc, item) => acc + item.jersey.price * item.quantity, 0);
  const discountAmount = appliedCoupon ? (subtotal * appliedCoupon.discountPercent) / 100 : 0;
  const total = Math.max(0, subtotal - discountAmount);

  const freeShippingThreshold = 1500;
  const freeShippingProgress = Math.min(100, (subtotal / freeShippingThreshold) * 100);

  const applyCoupon = () => {
    setCouponError('');
    const codeUpper = couponCode.trim().toUpperCase();
    if (codeUpper === 'RARE10') {
      setAppliedCoupon({ code: 'RARE10', discountPercent: 10 });
    } else if (codeUpper === 'PIKA2026') {
      setAppliedCoupon({ code: 'PIKA2026', discountPercent: 15 });
    } else {
      setCouponError('Cupom inválido. Tente RARE10 ou PIKA2026');
    }
  };

  const handleFinalizePurchase = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
    setOrderCompleted(true);
  };

  const copyPixCode = () => {
    navigator.clipboard.writeText("00020126580014br.gov.bcb.pix0136soccerpika-vault-pix-key-20265204000053039865802BR5910SOCCERPIKA6009SAO PAULO62070503***6304E2D4");
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-sm">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#090d16] border-l border-white/10 flex flex-col justify-between shadow-2xl">
          
          {/* Header */}
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#00FF7F]" />
              <h2 className="text-xl font-bold text-white font-['Outfit']">Seu Manto Vault ({items.length})</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Shipping Progress */}
          <div className="px-6 py-3 bg-[#0e1422] border-b border-white/10 text-xs">
            <div className="flex justify-between text-gray-300 mb-1 font-semibold">
              <span>
                {subtotal >= freeShippingThreshold ? '✨ Frete Grátis com Seguro Liberado!' : `Falta R$ ${(freeShippingThreshold - subtotal).toFixed(2)} para Frete Grátis`}
              </span>
              <span>{Math.round(freeShippingProgress)}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#00FF7F] to-[#00E5FF] transition-all duration-500"
                style={{ width: `${freeShippingProgress}%` }}
              />
            </div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {items.length > 0 ? (
              items.map((item) => (
                <div 
                  key={`${item.jersey.id}-${item.size}`}
                  className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex gap-3 items-center"
                >
                  <img
                    src={item.jersey.images[0]}
                    alt={item.jersey.name}
                    className="w-16 h-16 object-cover rounded-lg bg-black/40 border border-white/10"
                  />

                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-white truncate font-['Outfit']">{item.jersey.name}</h4>
                    <span className="text-[11px] text-gray-400 block mt-0.5">
                      Tamanho: <strong className="text-[#00FF7F] font-mono">{item.size}</strong>
                    </span>
                    <div className="text-xs font-black text-[#00FF7F] mt-1">
                      R$ {item.jersey.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-lg border border-white/10">
                    <button
                      onClick={() => onUpdateQuantity(item.jersey.id, item.size, -1)}
                      className="p-1 text-gray-400 hover:text-white"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-bold text-white px-1.5 font-mono">{item.quantity}</span>
                    <button
                      onClick={() => onUpdateQuantity(item.jersey.id, item.size, 1)}
                      className="p-1 text-gray-400 hover:text-white"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => onRemoveItem(item.jersey.id, item.size)}
                    className="p-1.5 text-gray-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            ) : (
              <div className="py-20 text-center space-y-3">
                <ShoppingBag className="w-12 h-12 text-gray-600 mx-auto" />
                <p className="text-sm text-gray-400">Seu carrinho de raridades está vazio.</p>
              </div>
            )}
          </div>

          {/* Footer & Checkout Area */}
          {items.length > 0 && (
            <div className="p-6 border-t border-white/10 bg-[#07090e] space-y-4">
              
              {/* Coupon Input */}
              <div className="space-y-1">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Cupom (ex: RARE10)"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 focus:border-[#00FF7F] rounded-xl pl-9 pr-3 py-2 text-xs text-white font-mono uppercase focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={applyCoupon}
                    className="btn-secondary text-xs px-3 py-2"
                  >
                    Aplicar
                  </button>
                </div>
                {couponError && <p className="text-[11px] text-rose-400">{couponError}</p>}
                {appliedCoupon && (
                  <p className="text-[11px] text-[#00FF7F] font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Cupom {appliedCoupon.code} aplicado ({appliedCoupon.discountPercent}% OFF)
                  </p>
                )}
              </div>

              {/* Total Calculation */}
              <div className="space-y-1.5 text-xs text-gray-300">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-[#00FF7F]">
                    <span>Desconto Cupom</span>
                    <span>- R$ {discountAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black text-white pt-2 border-t border-white/10">
                  <span>Total</span>
                  <span className="text-[#00FF7F]">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <button
                onClick={() => setIsCheckoutModalOpen(true)}
                className="btn-primary w-full py-3.5 text-center justify-center font-bold text-sm shadow-[0_0_20px_rgba(0,255,127,0.3)]"
              >
                Finalizar Pedido de Colecionador <ArrowRight className="w-4 h-4 ml-1" />
              </button>

            </div>
          )}

        </div>
      </div>

      {/* Checkout Modal */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="relative w-full max-w-lg glass-panel border border-[#00FF7F]/40 p-6 sm:p-8 bg-[#0c111c] rounded-2xl space-y-6">
            
            <button
              onClick={() => {
                setIsCheckoutModalOpen(false);
                setOrderCompleted(false);
              }}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {!orderCompleted ? (
              <>
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-white font-['Outfit']">Checkout Seguro Vault</h3>
                  <p className="text-xs text-gray-400">Escolha o método de pagamento para concluir seu pedido.</p>
                </div>

                {/* Select Payment Method */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPaymentMethod('pix')}
                    className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                      paymentMethod === 'pix' 
                        ? 'bg-[#00FF7F]/15 border-[#00FF7F] text-[#00FF7F]' 
                        : 'bg-white/5 border-white/10 text-gray-400'
                    }`}
                  >
                    <QrCode className="w-4 h-4" /> PIX (5% OFF Adicional)
                  </button>

                  <button
                    onClick={() => setPaymentMethod('card')}
                    className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                      paymentMethod === 'card' 
                        ? 'bg-[#00FF7F]/15 border-[#00FF7F] text-[#00FF7F]' 
                        : 'bg-white/5 border-white/10 text-gray-400'
                    }`}
                  >
                    Cartão de Crédito
                  </button>
                </div>

                {/* Payment Form View */}
                {paymentMethod === 'pix' ? (
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center space-y-3">
                    <div className="w-32 h-32 bg-white p-2 mx-auto rounded-lg flex items-center justify-center">
                      <QrCode className="w-24 h-24 text-black" />
                    </div>
                    <p className="text-xs text-gray-300 font-semibold">Escaneie o QR Code no app do seu banco ou use a chave Copia e Cola.</p>
                    <button
                      onClick={copyPixCode}
                      className="w-full py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-bold text-white flex items-center justify-center gap-1.5 border border-white/10"
                    >
                      {copiedPix ? <Check className="w-4 h-4 text-[#00FF7F]" /> : <Copy className="w-4 h-4" />}
                      {copiedPix ? 'Chave PIX Copiada!' : 'Copiar Chave PIX'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 text-xs">
                    <input
                      type="text"
                      placeholder="Número do Cartão (0000 0000 0000 0000)"
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[#00FF7F]"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Validade (MM/AA)"
                        className="bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[#00FF7F]"
                      />
                      <input
                        type="text"
                        placeholder="CVV (123)"
                        className="bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[#00FF7F]"
                      />
                    </div>
                  </div>
                )}

                <button
                  onClick={handleFinalizePurchase}
                  className="btn-primary w-full py-3.5 text-center justify-center font-bold text-sm"
                >
                  Confirmar e Concluir Pedido
                </button>
              </>
            ) : (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#00FF7F]/20 text-[#00FF7F] border border-[#00FF7F]/50 flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-white font-['Outfit']">Pedido Confirmado!</h3>
                <p className="text-xs text-gray-300 max-w-sm mx-auto">
                  Seu manto raro foi reservado e está preparado para envio blindado. O certificado digital foi emitido com sucesso!
                </p>
                <div className="p-3 rounded-lg bg-white/5 border border-white/10 font-mono text-xs text-[#00FF7F]">
                  Código do Pedido: #SPK-{Math.floor(100000 + Math.random() * 900000)}
                </div>
                <button
                  onClick={() => {
                    onClearCart();
                    setIsCheckoutModalOpen(false);
                    onClose();
                  }}
                  className="btn-primary py-3 px-6 text-xs mx-auto"
                >
                  Voltar ao Vault
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
