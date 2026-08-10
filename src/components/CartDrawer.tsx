import { useEffect } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import type { CartItem } from '../types/jersey';
import { formatPrice, installment } from '../lib/format';

interface CartDrawerProps {
  open: boolean;
  items: CartItem[];
  onClose: () => void;
  onUpdateQuantity: (id: string, size: string, quantity: number) => void;
  onRemove: (id: string, size: string) => void;
  onCheckout: () => void;
}

export function CartDrawer({
  open,
  items,
  onClose,
  onUpdateQuantity,
  onRemove,
  onCheckout,
}: CartDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const total = items.reduce((sum, i) => sum + i.jersey.price * i.quantity, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  const parcela = installment(total);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-ink/60"
      role="dialog"
      aria-modal="true"
      aria-label="Carrinho"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex h-full w-full max-w-md flex-col bg-paper">
        <header className="flex items-center justify-between px-6 py-5">
          <h2 className="font-display text-2xl font-900 uppercase">
            Carrinho {count > 0 && <span className="text-brand">({count})</span>}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar carrinho"
            className="hover:text-brand"
          >
            <X size={24} strokeWidth={1.5} />
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
            <p className="font-display text-xl font-800 uppercase">Carrinho vazio</p>
            <p className="text-sm text-muted">
              Escolha uma peça do acervo — todas são únicas e saem de circulação
              depois da venda.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="link-underline mt-2 text-sm tracking-wide uppercase hover:text-brand"
            >
              Explorar acervo
            </button>
          </div>
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto px-6">
              {items.map((item) => (
                <li
                  key={`${item.jersey.id}-${item.size}`}
                  className="flex gap-4 border-b border-line py-5 last:border-b-0"
                >
                  <div className="h-24 w-24 shrink-0 bg-surface">
                    <img
                      src={item.jersey.images[0]}
                      alt={item.jersey.name}
                      className="h-full w-full object-contain"
                    />
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="line-clamp-2 text-xs font-bold uppercase">
                      {item.jersey.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted">Tamanho {item.size}</p>

                    <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateQuantity(item.jersey.id, item.size, item.quantity - 1)
                          }
                          aria-label="Diminuir quantidade"
                          className="text-muted hover:text-ink"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="min-w-4 text-center text-sm font-bold tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateQuantity(item.jersey.id, item.size, item.quantity + 1)
                          }
                          disabled={item.quantity >= item.jersey.stockQty}
                          aria-label="Aumentar quantidade"
                          className="text-muted hover:text-ink disabled:opacity-30"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <p className="text-sm font-bold">
                        {formatPrice(item.jersey.price * item.quantity)}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemove(item.jersey.id, item.size)}
                    aria-label={`Remover ${item.jersey.name}`}
                    className="self-start text-muted hover:text-brand"
                  >
                    <X size={16} />
                  </button>
                </li>
              ))}
            </ul>

            <footer className="border-t border-line px-6 py-5">
              <div className="flex items-baseline justify-between">
                <span className="text-sm tracking-widest uppercase">Total</span>
                <span className="font-display text-2xl font-900">{formatPrice(total)}</span>
              </div>
              <p className="mt-1 text-right text-xs text-muted">
                ou {parcela.times}x de {parcela.value} sem juros
              </p>

              <button
                type="button"
                onClick={onCheckout}
                className="btn btn-primary mt-4 w-full py-4 text-sm tracking-wide uppercase"
              >
                Finalizar compra
              </button>
              <p className="mt-2 text-center text-[11px] text-muted">
                Pix, cartão em até 12x ou boleto.
              </p>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
