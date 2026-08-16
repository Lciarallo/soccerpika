import { useId, useState } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';

/** Gráficos do painel, em SVG puro — sem dependência de lib de gráficos. */
export const SERIES = {
  primary: '#d90429', // brand
  secondary: '#111111', // ink
  tertiary: '#737373', // muted
} as const;

const AXIS = '#e5e5e5';
const INK_MUTED = '#737373';

/* -------------------------------------------------------------------------- */
/* Cartão de indicador                                                        */
/* -------------------------------------------------------------------------- */

export function StatTile({
  label,
  value,
  hint,
  delta,
  spark,
}: {
  label: string;
  value: string;
  hint?: string;
  /** Variação percentual contra o período anterior. */
  delta?: number;
  spark?: number[];
}) {
  const up = (delta ?? 0) >= 0;
  const Icon = up ? TrendingUp : TrendingDown;

  return (
    <div className="flex flex-col gap-2 border border-line bg-paper p-4">
      <p className="text-[0.65rem] tracking-widest text-muted uppercase">{label}</p>

      <p className="font-display text-2xl leading-none font-900 text-ink tabular-nums">
        {value}
      </p>

      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          {delta !== undefined && (
            <span
              className={`flex items-center gap-1 text-xs tabular-nums ${
                up ? 'text-success' : 'text-danger'
              }`}
            >
              <Icon className="h-3 w-3" />
              {up ? '+' : ''}
              {delta.toFixed(1).replace('.', ',')}%
            </span>
          )}
          {hint && <p className="mt-0.5 truncate text-[0.65rem] text-muted">{hint}</p>}
        </div>

        {spark && spark.length > 1 && <Sparkline values={spark} />}
      </div>
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const width = 72;
  const height = 24;
  const max = Math.max(...values, 1);
  const step = width / (values.length - 1);

  const points = values.map((value, index) => [
    index * step,
    height - (value / max) * (height - 2) - 1,
  ]);
  const path = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' ');

  return (
    <svg width={width} height={height} className="shrink-0" aria-hidden="true">
      <path d={path} fill="none" stroke={SERIES.primary} strokeWidth={2} />
      <circle
        cx={points[points.length - 1][0]}
        cy={points[points.length - 1][1]}
        r={2.5}
        fill={SERIES.primary}
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Área — faturamento no tempo                                                */
/* -------------------------------------------------------------------------- */

export interface TimePoint {
  label: string;
  value: number;
}

export function RevenueArea({
  data,
  formatValue,
  height = 220,
}: {
  data: TimePoint[];
  formatValue: (value: number) => string;
  height?: number;
}) {
  const gradientId = useId();
  const [hover, setHover] = useState<number | null>(null);

  const padding = { top: 16, right: 12, bottom: 26, left: 52 };
  const width = 720;
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const max = Math.max(...data.map((d) => d.value), 1);
  const ceiling = Math.ceil(max / 500) * 500 || 500;

  const x = (index: number) =>
    padding.left + (index / Math.max(1, data.length - 1)) * plotWidth;
  const y = (value: number) => padding.top + plotHeight - (value / ceiling) * plotHeight;

  const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i)} ${y(d.value)}`).join(' ');
  const area = `${line} L${x(data.length - 1)} ${padding.top + plotHeight} L${x(0)} ${padding.top + plotHeight} Z`;

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => fraction * ceiling);
  const labelEvery = Math.max(1, Math.floor(data.length / 6));

  const active = hover !== null ? data[hover] : null;

  return (
    <figure className="border border-line bg-paper p-4">
      <figcaption className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="text-[0.7rem] font-bold tracking-widest text-ink uppercase">
          Faturamento por dia
        </h3>
        <span className="text-[0.65rem] text-muted">últimos {data.length} dias</span>
      </figcaption>

      <div className="relative overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full min-w-[520px]"
          role="img"
          aria-label={`Faturamento diário dos últimos ${data.length} dias`}
          onMouseLeave={() => setHover(null)}
          onMouseMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const relative = ((event.clientX - rect.left) / rect.width) * width;
            const index = Math.round(
              ((relative - padding.left) / plotWidth) * (data.length - 1),
            );
            setHover(index >= 0 && index < data.length ? index : null);
          }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SERIES.primary} stopOpacity="0.25" />
              <stop offset="100%" stopColor={SERIES.primary} stopOpacity="0" />
            </linearGradient>
          </defs>

          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={y(tick)}
                y2={y(tick)}
                stroke={AXIS}
                strokeWidth={1}
              />
              <text
                x={padding.left - 8}
                y={y(tick) + 3}
                textAnchor="end"
                fill={INK_MUTED}
                fontSize={9}
              >
                {formatValue(tick)}
              </text>
            </g>
          ))}

          <path d={area} fill={`url(#${gradientId})`} />
          <path d={line} fill="none" stroke={SERIES.primary} strokeWidth={2} />

          {data.map((point, index) =>
            index % labelEvery === 0 ? (
              <text
                key={point.label}
                x={x(index)}
                y={height - 8}
                textAnchor="middle"
                fill={INK_MUTED}
                fontSize={9}
              >
                {point.label}
              </text>
            ) : null,
          )}

          {hover !== null && active && (
            <g>
              <line
                x1={x(hover)}
                x2={x(hover)}
                y1={padding.top}
                y2={padding.top + plotHeight}
                stroke={SERIES.primary}
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <circle cx={x(hover)} cy={y(active.value)} r={5} fill="#ffffff" />
              <circle cx={x(hover)} cy={y(active.value)} r={4} fill={SERIES.primary} />
            </g>
          )}
        </svg>

        {hover !== null && active && (
          <div
            className="pointer-events-none absolute top-2 border border-line bg-paper px-2.5 py-1.5 shadow-lg"
            style={{
              left: `${(x(hover) / width) * 100}%`,
              transform: `translateX(${hover > data.length / 2 ? '-110%' : '10%'})`,
            }}
          >
            <p className="text-[0.65rem] text-muted">{active.label}</p>
            <p className="font-display text-xs font-900 text-ink tabular-nums">
              {formatValue(active.value)}
            </p>
          </div>
        )}
      </div>
    </figure>
  );
}

/* -------------------------------------------------------------------------- */
/* Barras horizontais — ranking                                               */
/* -------------------------------------------------------------------------- */

export interface BarDatum {
  label: string;
  sublabel?: string;
  value: number;
}

export function BarList({
  title,
  data,
  formatValue,
  emptyText = 'Sem dados no período.',
}: {
  title: string;
  data: BarDatum[];
  formatValue: (value: number) => string;
  emptyText?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <figure className="border border-line bg-paper p-4">
      <figcaption className="mb-4">
        <h3 className="text-[0.7rem] font-bold tracking-widest text-ink uppercase">{title}</h3>
      </figcaption>

      {data.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted">{emptyText}</p>
      ) : (
        <ol className="space-y-3">
          {data.map((datum, index) => (
            <li key={datum.label}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="font-display text-[0.65rem] text-muted tabular-nums">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs text-ink">{datum.label}</span>
                    {datum.sublabel && (
                      <span className="block truncate text-[0.65rem] text-muted">
                        {datum.sublabel}
                      </span>
                    )}
                  </span>
                </span>
                <span className="shrink-0 font-display text-xs font-900 text-ink tabular-nums">
                  {formatValue(datum.value)}
                </span>
              </div>
              <div className="h-1.5 w-full bg-surface">
                <div
                  className="h-full"
                  style={{
                    width: `${(datum.value / max) * 100}%`,
                    backgroundColor: SERIES.primary,
                  }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </figure>
  );
}
