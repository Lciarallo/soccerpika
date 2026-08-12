import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { Jersey } from '../types/jersey';
import { JerseyCard } from './JerseyCard';

interface FeaturedCarouselProps {
  jerseys: Jersey[];
  onSelect: (jersey: Jersey) => void;
}

const SLIDE_GAP = 15;

export function FeaturedCarousel({ jerseys, onSelect }: FeaturedCarouselProps) {
  const trackRef = useRef<HTMLUListElement>(null);
  const headingId = useId();
  const [index, setIndex] = useState(0);

  const getStep = useCallback(() => {
    const firstSlide = trackRef.current?.firstElementChild as HTMLElement | null;
    return (firstSlide?.offsetWidth ?? 280) + SLIDE_GAP;
  }, []);

  const getMaxIndex = useCallback(() => {
    const track = trackRef.current;
    if (!track) return Math.max(0, jerseys.length - 1);
    return Math.max(0, Math.round((track.scrollWidth - track.clientWidth) / getStep()));
  }, [getStep, jerseys.length]);

  const syncIndex = useCallback(() => {
    const track = trackRef.current;
    if (!track || jerseys.length === 0) return;
    setIndex(
      Math.min(getMaxIndex(), Math.max(0, Math.round(track.scrollLeft / getStep()))),
    );
  }, [getMaxIndex, getStep, jerseys.length]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    track.addEventListener('scroll', syncIndex, { passive: true });
    return () => track.removeEventListener('scroll', syncIndex);
  }, [syncIndex]);

  const move = (direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track || jerseys.length === 0) return;
    const positions = getMaxIndex() + 1;
    const next = (index + direction + positions) % positions;
    track.scrollTo({ left: next * getStep(), behavior: 'smooth' });
    setIndex(next);
  };

  if (jerseys.length === 0) return null;

  return (
    <section className="store-featured" aria-labelledby={headingId}>
      <div className="store-container">
        <div className="store-featured-layout">
          <div className="store-featured-heading">
            <p className="store-featured-count">
              {index + 1} / {jerseys.length}
            </p>
            <h2 id={headingId}>Destaques</h2>
            <div className="store-featured-arrows">
              <button type="button" onClick={() => move(-1)} aria-label="Produto anterior">
                <ArrowLeft size={24} strokeWidth={1.25} />
              </button>
              <button type="button" onClick={() => move(1)} aria-label="Próximo produto">
                <ArrowRight size={24} strokeWidth={1.25} />
              </button>
            </div>
          </div>

          <ul ref={trackRef} className="store-featured-track">
            {jerseys.map((jersey) => (
              <li key={jersey.id} className="store-featured-slide">
                <JerseyCard jersey={jersey} onSelect={onSelect} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
