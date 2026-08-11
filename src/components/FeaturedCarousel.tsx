import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { Jersey } from '../types/jersey';
import { JerseyCard } from './JerseyCard';

interface FeaturedCarouselProps {
  jerseys: Jersey[];
  onSelect: (jersey: Jersey) => void;
  title?: string;
  /** Espelha a seção: trilho à direita e a fila já começando pelo fim. */
  mirrored?: boolean;
}

const GAP = 24;

export function FeaturedCarousel({
  jerseys,
  onSelect,
  title = 'Destaques',
  mirrored = false,
}: FeaturedCarouselProps) {
  const trackRef = useRef<HTMLUListElement>(null);
  const headingId = useId();
  const [index, setIndex] = useState(0);

  /** Índice do primeiro item visível, derivado da rolagem real do trilho. */
  const syncIndex = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const item = track.firstElementChild as HTMLElement | null;
    if (!item) return;
    const step = item.offsetWidth + GAP;
    setIndex(Math.min(jerseys.length - 1, Math.round(track.scrollLeft / step)));
  }, [jerseys.length]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    track.addEventListener('scroll', syncIndex, { passive: true });
    return () => track.removeEventListener('scroll', syncIndex);
  }, [syncIndex]);

  /*
   * No modo espelhado a fila começa encostada na direita. Precisa ser depois do
   * layout, e `scroll-smooth` no elemento faria isso virar uma animação visível
   * no carregamento — por isso o salto é feito com behavior 'instant'.
   */
  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track || !mirrored) return;
    const toEnd = () => {
      track.scrollTo({ left: track.scrollWidth, behavior: 'instant' as ScrollBehavior });
      // O salto programático não dispara o listener a tempo do primeiro render.
      syncIndex();
    };
    toEnd();
    // As fotos entram depois e mudam a largura do trilho; reposiciona quando isso acontece.
    const ro = new ResizeObserver(toEnd);
    ro.observe(track);
    const t = setTimeout(() => ro.disconnect(), 2000);
    return () => {
      clearTimeout(t);
      ro.disconnect();
    };
  }, [mirrored, jerseys.length, syncIndex]);

  const scrollBy = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const item = track.firstElementChild as HTMLElement | null;
    track.scrollBy({ left: direction * ((item?.offsetWidth ?? 280) + GAP), behavior: 'smooth' });
  };

  if (jerseys.length === 0) return null;

  return (
    <section className="px-5 py-10 sm:px-8" aria-labelledby={headingId}>
      <div className={`section-grid ${mirrored ? 'section-grid-mirror' : ''}`}>
        <div className={mirrored ? 'lg:text-right' : undefined}>
          <p className="text-sm text-muted tabular-nums">
            {index + 1} / {jerseys.length}
          </p>
          <h2 id={headingId} className="section-title mt-2">
            {title}
          </h2>

          <div className={`mt-5 flex gap-4 ${mirrored ? 'lg:justify-end' : ''}`}>
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              aria-label="Anterior"
              className="text-ink transition-colors hover:text-brand"
            >
              <ArrowLeft size={28} strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              aria-label="Próximo"
              className="text-ink transition-colors hover:text-brand"
            >
              <ArrowRight size={28} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <ul
          ref={trackRef}
          className="flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth pb-2
                     [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {jerseys.map((jersey) => (
            <li key={jersey.id} className="w-[74vw] shrink-0 snap-start sm:w-64">
              <JerseyCard jersey={jersey} onSelect={onSelect} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
