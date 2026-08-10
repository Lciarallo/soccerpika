import { PenLine, Shirt } from 'lucide-react';
import type { Jersey } from '../types/jersey';
import { formatPrice, installment } from '../lib/format';

interface JerseyCardProps {
  jersey: Jersey;
  onSelect: (jersey: Jersey) => void;
}

export function JerseyCard({ jersey, onSelect }: JerseyCardProps) {
  const parcela = installment(jersey.price);

  return (
    <article className="group flex flex-col border-2 border-ink bg-paper transition-shadow hover:shadow-[6px_6px_0_0_var(--color-brand)]">
      <button
        type="button"
        onClick={() => onSelect(jersey)}
        className="relative block aspect-square overflow-hidden bg-surface"
        aria-label={`Ver detalhes de ${jersey.name}`}
      >
        <img
          src={jersey.images[0]}
          alt={jersey.name}
          loading="lazy"
          className="h-full w-full object-contain p-4 transition-transform duration-300 group-hover:scale-105"
        />

        <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5">
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
        </div>

        {!jersey.inStock && (
          <span className="absolute inset-x-0 bottom-0 bg-ink py-2 text-center text-[11px] font-bold tracking-widest text-paper uppercase">
            Esgotado
          </span>
        )}
      </button>

      <div className="flex flex-1 flex-col border-t-2 border-ink p-4">
        <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">
          {jersey.brand || 'Sem marca'}
          {jersey.season && ` · ${jersey.season}`}
        </p>

        <h3 className="mt-1 line-clamp-2 font-display text-sm leading-tight font-800 uppercase">
          <button type="button" onClick={() => onSelect(jersey)} className="text-left hover:text-brand">
            {jersey.name}
          </button>
        </h3>

        <div className="mt-auto pt-4">
          <p className="font-display text-xl font-900">{formatPrice(jersey.price)}</p>
          <p className="mt-0.5 text-[11px] text-muted">
            {parcela.times}x de {parcela.value} sem juros
          </p>

          <button
            type="button"
            onClick={() => onSelect(jersey)}
            disabled={!jersey.inStock}
            className={`btn mt-3 w-full py-2.5 text-xs uppercase ${
              jersey.inStock ? 'btn-dark' : 'btn-outline'
            }`}
          >
            {jersey.inStock ? 'Ver detalhes' : 'Esgotado'}
          </button>
        </div>
      </div>
    </article>
  );
}
