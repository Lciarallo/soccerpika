import { ArrowRight, BadgeCheck, Package, ShieldCheck } from 'lucide-react';
import type { Jersey } from '../types/jersey';
import { formatPrice } from '../lib/format';

interface HeroProps {
  featured: Jersey[];
  total: number;
  onSelect: (jersey: Jersey) => void;
}

export function Hero({ featured, total, onSelect }: HeroProps) {
  const [lead, ...rest] = featured;

  return (
    <section id="topo" className="border-b-2 border-ink">
      <div className="mx-auto grid max-w-7xl gap-0 lg:grid-cols-2">
        {/* Coluna de texto */}
        <div className="flex flex-col justify-center border-ink px-4 py-12 lg:border-r-2 lg:py-20 lg:pr-12">
          <p className="mb-4 inline-flex w-fit items-center gap-2 bg-brand px-3 py-1.5 text-xs font-bold tracking-wider text-paper uppercase">
            <BadgeCheck size={14} />
            Acervo original · {total} peças catalogadas
          </p>

          <h1 className="font-display text-4xl leading-[0.95] font-900 uppercase sm:text-5xl lg:text-6xl">
            Camisas que
            <br />
            <span className="text-brand">contam</span> a
            <br />
            <span className="text-navy">história</span> do jogo
          </h1>

          <p className="mt-5 max-w-md text-base leading-relaxed text-muted">
            Camisas de jogo, retrô e autografadas — garimpadas peça por peça. Cada
            manto do acervo é único: quando sai, não volta.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#catalogo" className="btn btn-primary px-6 py-3.5 text-sm uppercase">
              Ver acervo completo
              <ArrowRight size={16} />
            </a>
            <a href="#autenticidade" className="btn btn-outline px-6 py-3.5 text-sm uppercase">
              Como garantimos
            </a>
          </div>

          <ul className="mt-10 grid grid-cols-3 gap-4 border-t-2 border-ink pt-6">
            {[
              { icon: ShieldCheck, label: 'Peça única', sub: 'Sem reposição' },
              { icon: BadgeCheck, label: 'Original', sub: 'Conferida' },
              { icon: Package, label: 'Envio', sub: 'Todo o Brasil' },
            ].map(({ icon: Icon, label, sub }) => (
              <li key={label}>
                <Icon size={20} className="mb-2 text-brand" />
                <p className="text-sm font-bold">{label}</p>
                <p className="text-xs text-muted">{sub}</p>
              </li>
            ))}
          </ul>
        </div>

        {/* Coluna de destaque */}
        <div className="grid grid-cols-2 grid-rows-[auto_auto]">
          {lead && (
            <button
              type="button"
              onClick={() => onSelect(lead)}
              className="group col-span-2 border-b-2 border-ink text-left"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-surface">
                <img
                  src={lead.images[0]}
                  alt={lead.name}
                  className="h-full w-full object-contain p-6 transition-transform duration-300 group-hover:scale-[1.03]"
                  loading="eager"
                />
                <span className="absolute top-4 left-4 bg-ink px-2.5 py-1 text-[11px] font-bold tracking-wider text-paper uppercase">
                  Destaque
                </span>
              </div>
              <div className="flex items-end justify-between gap-4 border-t-2 border-ink px-5 py-4">
                <div>
                  <p className="font-display text-sm font-800 uppercase">{lead.name}</p>
                  <p className="mt-1 text-xs text-muted">
                    {lead.brand || 'Sem marca'} · {lead.category}
                  </p>
                </div>
                <p className="shrink-0 font-display text-lg font-900 text-brand">
                  {formatPrice(lead.price)}
                </p>
              </div>
            </button>
          )}

          {rest.slice(0, 2).map((jersey, index) => (
            <button
              key={jersey.id}
              type="button"
              onClick={() => onSelect(jersey)}
              className={`group text-left ${index === 0 ? 'border-r-2 border-ink' : ''}`}
            >
              <div className="relative aspect-square overflow-hidden bg-surface">
                <img
                  src={jersey.images[0]}
                  alt={jersey.name}
                  className="h-full w-full object-contain p-5 transition-transform duration-300 group-hover:scale-[1.03]"
                  loading="lazy"
                />
              </div>
              <div className="border-t-2 border-ink px-4 py-3">
                <p className="line-clamp-2 text-xs font-bold uppercase">{jersey.name}</p>
                <p className="mt-1 font-display text-sm font-900 text-brand">
                  {formatPrice(jersey.price)}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
