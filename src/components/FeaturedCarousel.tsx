import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { Jersey } from '../types/jersey';
import { JerseyCard } from './JerseyCard';

interface FeaturedCarouselProps {
  jerseys: Jersey[];
  onSelect: (jersey: Jersey) => void;
}

export function FeaturedCarousel({ jerseys, onSelect }: FeaturedCarouselProps) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);

  /** Índice do primeiro item visível, derivado da rolagem real do trilho. */
  const syncIndex = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const item = track.firstElementChild as HTMLElement | null;
    if (!item) return;
    const step = item.offsetWidth + 24;
    setIndex(Math.min(jerseys.length - 1, Math.round(track.scrollLeft / step)));
  }, [jerseys.length]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    track.addEventListener('scroll', syncIndex, { passive: true });
    return () => track.removeEventListener('scroll', syncIndex);
  }, [syncIndex]);

  const scrollBy = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const item = track.firstElementChild as HTMLElement | null;
    track.scrollBy({ left: direction * ((item?.offsetWidth ?? 280) + 24), behavior: 'smooth' });
  };

  if (jerseys.length === 0) return null;

  return (
    <section className="px-5 py-10 sm:px-8" aria-labelledby="destaques-titulo">
      <div className="section-grid">
        <div>
          <p className="text-sm text-muted tabular-nums">
            {index + 1} / {jerseys.length}
          </p>
          <h2
            id="destaques-titulo"
            className="section-title mt-2"
          >
            Destaques
          </h2>

          <div className="mt-5 flex gap-4">
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
