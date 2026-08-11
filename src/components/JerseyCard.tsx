import { Heart } from 'lucide-react';
import type { Jersey } from '../types/jersey';
import { formatPrice } from '../lib/format';

interface JerseyCardProps {
  jersey: Jersey;
  onSelect: (jersey: Jersey) => void;
  isSaved?: boolean;
  onToggleWishlist?: (jersey: Jersey) => void;
}

/** Frete grátis acima deste valor — mesmo selo vermelho que a loja exibe. */
const FREE_SHIPPING_FROM = 1000;

export function JerseyCard({
  jersey,
  onSelect,
  isSaved = false,
  onToggleWishlist,
}: JerseyCardProps) {
  const freeShipping = jersey.inStock && jersey.price >= FREE_SHIPPING_FROM;

  return (
    <article className="group relative">
      <button
        type="button"
        onClick={() => onSelect(jersey)}
        className="relative block w-full"
        aria-label={`Ver detalhes de ${jersey.name}`}
      >
        <div className="relative aspect-square overflow-hidden">
          <img
            src={jersey.images[0]}
            alt={jersey.name}
            loading="lazy"
            className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
          />
        </div>

        {freeShipping && (
          <span className="absolute top-0 left-0 bg-brand px-2.5 py-1 text-[11px] font-bold tracking-wide text-paper uppercase">
            Frete grátis
          </span>
        )}

        {!jersey.inStock && (
          <span className="absolute top-0 left-0 bg-ink px-2.5 py-1 text-[11px] font-bold tracking-wide text-paper uppercase">
            Esgotado
          </span>
        )}
      </button>

      {onToggleWishlist && (
        <button
          type="button"
          onClick={() => onToggleWishlist(jersey)}
          aria-pressed={isSaved}
          aria-label={
            isSaved ? `Remover ${jersey.name} dos desejos` : `Salvar ${jersey.name} nos desejos`
          }
          className={`absolute top-0 right-0 p-2 transition-colors ${
            isSaved ? 'text-brand' : 'text-muted hover:text-ink'
          }`}
        >
          <Heart size={18} fill={isSaved ? 'currentColor' : 'none'} strokeWidth={1.75} />
        </button>
      )}

      <div className="pt-3">
        <h3 className="text-sm leading-snug font-bold uppercase">
          <button
            type="button"
            onClick={() => onSelect(jersey)}
            className="text-left transition-colors group-hover:text-brand"
          >
            {jersey.name}
          </button>
        </h3>
        <p className={`mt-1.5 text-sm ${jersey.inStock ? 'text-ink' : 'text-muted line-through'}`}>
          {formatPrice(jersey.price)}
        </p>
      </div>
    </article>
  );
}
