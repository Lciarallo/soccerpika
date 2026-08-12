import { Heart } from 'lucide-react';
import type { Jersey } from '../types/jersey';
import { formatPrice } from '../lib/format';

interface JerseyCardProps {
  jersey: Jersey;
  onSelect: (jersey: Jersey) => void;
  isSaved?: boolean;
  onToggleWishlist?: (jersey: Jersey) => void;
}

const FREE_SHIPPING_FROM = 1000;

export function JerseyCard({
  jersey,
  onSelect,
  isSaved = false,
  onToggleWishlist,
}: JerseyCardProps) {
  const freeShipping = jersey.price >= FREE_SHIPPING_FROM;

  return (
    <article className="store-product-card">
      <button
        type="button"
        onClick={() => onSelect(jersey)}
        className="store-product-visual"
        aria-label={`Ver detalhes de ${jersey.name}`}
      >
        <span className="store-product-image">
          {jersey.images[0] ? (
            <img src={jersey.images[0]} alt={jersey.name} loading="lazy" />
          ) : null}
        </span>

        {!jersey.inStock || freeShipping ? (
          <span className="store-product-labels">
            {!jersey.inStock ? <span className="store-label-sold">Esgotado</span> : null}
            {freeShipping ? <span className="store-label-shipping">Frete grátis</span> : null}
          </span>
        ) : null}
      </button>

      {onToggleWishlist ? (
        <button
          type="button"
          onClick={() => onToggleWishlist(jersey)}
          aria-pressed={isSaved}
          aria-label={
            isSaved
              ? `Remover ${jersey.name} dos desejos`
              : `Salvar ${jersey.name} nos desejos`
          }
          className={`store-product-wishlist${isSaved ? ' is-saved' : ''}`}
        >
          <Heart size={18} fill={isSaved ? 'currentColor' : 'none'} strokeWidth={1.75} />
        </button>
      ) : null}

      <div className="store-product-description">
        <h3>
          <button type="button" onClick={() => onSelect(jersey)}>
            {jersey.name}
          </button>
        </h3>
        <p>{formatPrice(jersey.price)}</p>
      </div>
    </article>
  );
}
