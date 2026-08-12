import { useEffect, useRef } from 'react';
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
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    const frame = window.requestAnimationFrame(() =>
      drawerRef.current?.querySelector<HTMLElement>('button')?.focus(),
    );
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab' || !drawerRef.current) return;
      const focusable = [
        ...drawerRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input'),
      ].filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable.at(-1)!;
      if (!drawerRef.current.contains(document.activeElement)) {
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
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open]);

  if (!open) return null;

  const total = items.reduce((sum, i) => sum + i.jersey.price * i.quantity, 0);
  const parcela = installment(total);

  return (
    <div
      className="store-cart-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Carrinho"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div ref={drawerRef} className="store-cart-drawer">
        <header className="store-cart-header">
          <h2>Carrinho de compras</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar carrinho"
          >
            <X size={24} strokeWidth={2} />
          </button>
        </header>

        {items.length === 0 ? (
          <p className="store-cart-empty">O carrinho de compras está vazio.</p>
        ) : (
          <>
            <ul className="store-cart-items">
              {items.map((item) => (
                <li key={`${item.jersey.id}-${item.size}`}>
                  <div className="store-cart-image">
                    <img
                      src={item.jersey.images[0]}
                      alt={item.jersey.name}
                    />
                  </div>

                  <div className="store-cart-item-copy">
                    <p className="store-cart-item-name">{item.jersey.name}</p>
                    <p className="store-cart-item-size">Tamanho {item.size}</p>

                    <div className="store-cart-item-bottom">
                      <div className="store-cart-quantity">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateQuantity(item.jersey.id, item.size, item.quantity - 1)
                          }
                          aria-label="Diminuir quantidade"
                        >
                          <Minus size={14} />
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateQuantity(item.jersey.id, item.size, item.quantity + 1)
                          }
                          disabled={item.quantity >= item.jersey.stockQty}
                          aria-label="Aumentar quantidade"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <p className="store-cart-item-price">
                        {formatPrice(item.jersey.price * item.quantity)}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemove(item.jersey.id, item.size)}
                    aria-label={`Remover ${item.jersey.name}`}
                    className="store-cart-remove"
                  >
                    <X size={16} />
                  </button>
                </li>
              ))}
            </ul>

            <footer className="store-cart-footer">
              <div className="store-cart-total">
                <span>Total</span>
                <strong>{formatPrice(total)}</strong>
              </div>
              <p className="store-cart-installments">
                ou {parcela.times}x de {parcela.value} sem juros
              </p>

              <button
                type="button"
                onClick={onCheckout}
                className="store-cart-checkout"
              >
                Finalizar compra
              </button>
              <p className="store-cart-methods">
                Pix, cartão em até 12x ou boleto.
              </p>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
