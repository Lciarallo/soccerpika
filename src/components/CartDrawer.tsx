import { useEffect } from 'react';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import type { CartItem } from '../types/jersey';
import { formatPrice, installment } from '../lib/format';

interface CartDrawerProps {
  open: boolean;
  items: CartItem[];
  onClose: () => void;
  onUpdateQuantity: (id: string, size: string, quantity: number) => void;
  onRemove: (id: string, size: string) => void;
}

export function CartDrawer({
  open,
  items,
  onClose,
  onUpdateQuantity,
  onRemove,
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

  const checkout = () => {
    const linhas = items
      .map(
        (i) =>
          `• ${i.jersey.name} (${i.size}) × ${i.quantity} — ${formatPrice(
            i.jersey.price * i.quantity,
          )}`,
      )
      .join('\n');
    const texto = `Olá! Quero fechar este pedido na Soccer Pika:\n\n${linhas}\n\nTotal: ${formatPrice(total)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-ink/70"
      role="dialog"
      aria-modal="true"
      aria-label="Carrinho"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex h-full w-full max-w-md flex-col border-l-2 border-ink bg-paper">
        <header className="flex items-center justify-between border-b-2 border-ink px-5 py-4">
          <h2 className="flex items-center gap-2 font-display text-lg font-900 uppercase">
            <ShoppingBag size={20} />
            Carrinho
            {count > 0 && <span className="text-brand">({count})</span>}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar carrinho"
            className="border-2 border-ink p-1.5 hover:bg-ink hover:text-paper"
          >
            <X size={18} />
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <ShoppingBag size={44} className="text-line" strokeWidth={1.5} />
            <p className="font-display text-lg font-800 uppercase">Carrinho vazio</p>
            <p className="max-w-xs text-sm text-muted">
              Escolha uma peça do acervo — todas são únicas e saem de circulação depois da venda.
            </p>
            <button type="button" onClick={onClose} className="btn btn-primary mt-2 px-5 py-2.5 text-sm uppercase">
              Explorar acervo
            </button>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y-2 divide-line overflow-y-auto">
              {items.map((item) => (
                <li key={`${item.jersey.id}-${item.size}`} className="flex gap-3 p-4">
                  <div className="h-24 w-24 shrink-0 border-2 border-line bg-surface">
                    <img
                      src={item.jersey.images[0]}
                      alt={item.jersey.name}
                      className="h-full w-full object-contain p-1.5"
                    />
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="line-clamp-2 text-xs font-bold uppercase">{item.jersey.name}</p>
                    <p className="mt-0.5 text-[11px] text-muted">Tamanho {item.size}</p>

                    <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                      <div className="flex items-center border-2 border-ink">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateQuantity(item.jersey.id, item.size, item.quantity - 1)
                          }
                          aria-label="Diminuir quantidade"
                          className="px-2 py-1 hover:bg-ink hover:text-paper"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="min-w-8 text-center text-sm font-bold">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateQuantity(item.jersey.id, item.size, item.quantity + 1)
                          }
                          disabled={item.quantity >= item.jersey.stockQty}
                          aria-label="Aumentar quantidade"
                          className="px-2 py-1 hover:bg-ink hover:text-paper disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink"
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      <p className="font-display text-sm font-900">
                        {formatPrice(item.jersey.price * item.quantity)}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemove(item.jersey.id, item.size)}
                    aria-label={`Remover ${item.jersey.name}`}
                    className="self-start p-1 text-muted hover:text-brand"
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>

            <footer className="border-t-2 border-ink p-5">
              <div className="flex items-baseline justify-between">
                <span className="font-display text-sm font-800 tracking-widest uppercase">
                  Total
                </span>
                <span className="font-display text-2xl font-900">{formatPrice(total)}</span>
              </div>
              <p className="mt-1 text-right text-xs text-muted">
                ou {parcela.times}x de {parcela.value} sem juros
              </p>

              <button
                type="button"
                onClick={checkout}
                className="btn btn-primary mt-4 w-full py-3.5 text-sm uppercase"
              >
                Finalizar pedido
              </button>
              <p className="mt-2 text-center text-[11px] text-muted">
                Você será levado ao WhatsApp para combinar pagamento e envio.
              </p>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
