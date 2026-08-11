import { useEffect, useState } from 'react';
import { Check, ExternalLink, Heart, X } from 'lucide-react';
import type { Jersey } from '../types/jersey';
import { formatPrice, installment } from '../lib/format';

interface ProductModalProps {
  jersey: Jersey | null;
  onClose: () => void;
  onAddToCart: (jersey: Jersey, size: string) => void;
  isSaved: boolean;
  onToggleWishlist: (jersey: Jersey) => void;
}

export function ProductModal({
  jersey,
  onClose,
  onAddToCart,
  isSaved,
  onToggleWishlist,
}: ProductModalProps) {
  const [imageIndex, setImageIndex] = useState(0);
  const [size, setSize] = useState('');
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setImageIndex(0);
    setAdded(false);
    setSize(jersey?.sizes[0] ?? 'Único');
  }, [jersey]);

  useEffect(() => {
    if (!jersey) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [jersey, onClose]);

  if (!jersey) return null;

  const parcela = installment(jersey.price);

  const add = () => {
    onAddToCart(jersey, size);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/60 p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={jersey.name}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-5xl bg-paper">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 z-10 text-ink hover:text-brand"
        >
          <X size={24} strokeWidth={1.5} />
        </button>

        <div className="grid gap-8 p-5 sm:p-10 md:grid-cols-2">
          <div>
            <div className="aspect-square">
              <img
                src={jersey.images[imageIndex]}
                alt={`${jersey.name} — foto ${imageIndex + 1}`}
                className="h-full w-full object-contain"
              />
            </div>

            {jersey.images.length > 1 && (
              <div className="mt-4 flex gap-3">
                {jersey.images.map((src, i) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setImageIndex(i)}
                    aria-label={`Ver foto ${i + 1}`}
                    aria-current={i === imageIndex ? 'true' : undefined}
                    className={`h-16 w-16 shrink-0 bg-surface transition-opacity ${
                      i === imageIndex ? 'opacity-100' : 'opacity-45 hover:opacity-80'
                    }`}
                  >
                    <img src={src} alt="" className="h-full w-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col">
            <p className="text-xs tracking-widest text-muted uppercase">
              {jersey.category}
              {jersey.brand && ` · ${jersey.brand}`}
              {jersey.season && ` · ${jersey.season}`}
            </p>

            <h2 className="mt-2 font-display text-3xl leading-none font-900 uppercase">
              {jersey.name}
            </h2>

            <p className="mt-5 font-display text-3xl font-900">{formatPrice(jersey.price)}</p>
            <p className="mt-1 text-sm text-muted">
              em até {parcela.times}x de {parcela.value} sem juros
            </p>

            {jersey.description && (
              <p className="mt-5 text-sm leading-relaxed">{jersey.description}</p>
            )}

            {jersey.sizes.length > 0 && (
              <div className="mt-6">
                <p className="text-xs tracking-widest text-muted uppercase">Tamanho</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {jersey.sizes.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setSize(option)}
                      aria-pressed={size === option}
                      className={`min-w-12 border px-3 py-2 text-sm font-bold transition-colors ${
                        size === option
                          ? 'border-ink bg-ink text-paper'
                          : 'border-line hover:border-ink'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p className="mt-5 flex items-center gap-2 text-sm">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  jersey.inStock ? 'bg-success' : 'bg-danger'
                }`}
              />
              {jersey.inStock
                ? `Disponível — ${jersey.stockQty} ${jersey.stockQty === 1 ? 'unidade' : 'unidades'}`
                : 'Esgotado — peça única já vendida'}
            </p>

            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={add}
                disabled={!jersey.inStock}
                className={`btn w-full py-4 text-sm tracking-wide uppercase ${
                  added ? 'btn-dark' : 'btn-primary'
                }`}
              >
                {added ? (
                  <>
                    <Check size={16} /> Adicionado
                  </>
                ) : jersey.inStock ? (
                  'Adicionar ao carrinho'
                ) : (
                  'Indisponível'
                )}
              </button>

              <button
                type="button"
                onClick={() => onToggleWishlist(jersey)}
                aria-pressed={isSaved}
                className="btn btn-outline w-full py-3 text-xs uppercase"
              >
                <Heart size={14} fill={isSaved ? 'currentColor' : 'none'} />
                {isSaved ? 'Salvo nos desejos' : 'Salvar nos desejos'}
              </button>

              {jersey.sourceUrl && (
                <a
                  href={jersey.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-underline flex items-center justify-center gap-1.5 text-xs tracking-wide uppercase hover:text-brand"
                >
                  Ver na loja oficial <ExternalLink size={13} />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
