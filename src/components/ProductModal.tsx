import { useEffect, useState } from 'react';
import { Check, ExternalLink, PenLine, Shirt, Truck, X } from 'lucide-react';
import type { Jersey } from '../types/jersey';
import { formatPrice, installment } from '../lib/format';

interface ProductModalProps {
  jersey: Jersey | null;
  onClose: () => void;
  onAddToCart: (jersey: Jersey, size: string) => void;
}

export function ProductModal({ jersey, onClose, onAddToCart }: ProductModalProps) {
  const [imageIndex, setImageIndex] = useState(0);
  const [size, setSize] = useState<string>('');
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
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/70 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={jersey.name}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-4xl border-2 border-ink bg-paper">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-3 right-3 z-10 border-2 border-ink bg-paper p-1.5 hover:bg-ink hover:text-paper"
        >
          <X size={18} />
        </button>

        <div className="grid md:grid-cols-2">
          {/* Galeria */}
          <div className="border-ink md:border-r-2">
            <div className="aspect-square bg-surface">
              <img
                src={jersey.images[imageIndex]}
                alt={`${jersey.name} — foto ${imageIndex + 1}`}
                className="h-full w-full object-contain p-6"
              />
            </div>

            {jersey.images.length > 1 && (
              <div className="flex gap-2 border-t-2 border-ink p-3">
                {jersey.images.map((src, i) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setImageIndex(i)}
                    aria-label={`Ver foto ${i + 1}`}
                    aria-current={i === imageIndex ? 'true' : undefined}
                    className={`h-16 w-16 shrink-0 border-2 bg-surface ${
                      i === imageIndex ? 'border-brand' : 'border-line hover:border-ink'
                    }`}
                  >
                    <img src={src} alt="" className="h-full w-full object-contain p-1" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Detalhes */}
          <div className="flex flex-col p-5 sm:p-7">
            <div className="flex flex-wrap gap-1.5">
              {jersey.isMatchWorn && (
                <span className="flex items-center gap-1 bg-navy px-2 py-1 text-[10px] font-bold tracking-wider text-paper uppercase">
                  <Shirt size={11} /> De jogo
                </span>
              )}
              {jersey.isAutographed && (
                <span className="flex items-center gap-1 bg-brand px-2 py-1 text-[10px] font-bold tracking-wider text-paper uppercase">
                  <PenLine size={11} /> Autografada
                </span>
              )}
              {/* A categoria "De Jogo" já aparece como selo — não repetir. */}
              {!(jersey.isMatchWorn && jersey.category === 'De Jogo') && (
                <span className="border-2 border-ink px-2 py-1 text-[10px] font-bold tracking-wider uppercase">
                  {jersey.category}
                </span>
              )}
            </div>

            <h2 className="mt-3 font-display text-2xl leading-tight font-900 uppercase">
              {jersey.name}
            </h2>

            <p className="mt-1.5 text-sm text-muted">
              {jersey.brand || 'Marca não informada'}
              {jersey.season && ` · Temporada ${jersey.season}`}
              {jersey.colors.length > 0 && ` · ${jersey.colors.join(', ')}`}
            </p>

            {jersey.description && (
              <p className="mt-4 border-t-2 border-line pt-4 text-sm leading-relaxed">
                {jersey.description}
              </p>
            )}

            <div className="mt-5 border-t-2 border-ink pt-4">
              <p className="font-display text-3xl font-900">{formatPrice(jersey.price)}</p>
              <p className="mt-1 text-sm text-muted">
                em até {parcela.times}x de {parcela.value} sem juros
              </p>
            </div>

            {jersey.sizes.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 font-display text-xs font-800 tracking-widest uppercase">
                  Tamanho
                </p>
                <div className="flex flex-wrap gap-2">
                  {jersey.sizes.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setSize(option)}
                      aria-pressed={size === option}
                      className={`min-w-12 border-2 px-3 py-2 text-sm font-bold ${
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

            <p className="mt-5 flex items-center gap-2 text-sm font-semibold">
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full ${
                  jersey.inStock ? 'bg-success' : 'bg-danger'
                }`}
              />
              {jersey.inStock
                ? `Disponível — ${jersey.stockQty} ${jersey.stockQty === 1 ? 'unidade' : 'unidades'} em estoque`
                : 'Esgotado — peça única já vendida'}
            </p>

            <div className="mt-5 space-y-2.5">
              <button
                type="button"
                onClick={add}
                disabled={!jersey.inStock}
                className={`btn w-full py-3.5 text-sm uppercase ${
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

              <a
                href={jersey.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline w-full py-3 text-xs uppercase"
              >
                Ver na loja oficial <ExternalLink size={14} />
              </a>
            </div>

            <p className="mt-4 flex items-center gap-2 border-t-2 border-line pt-4 text-xs text-muted">
              <Truck size={14} /> Enviamos para todo o Brasil · peça única, sem reposição
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
