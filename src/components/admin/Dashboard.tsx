import { useEffect, useState } from 'react';
import { Loader2, Package, TriangleAlert } from 'lucide-react';
import * as api from '../../lib/api';
import { formatPrice } from '../../lib/format';
import { STATUS_LABEL } from '../../lib/checkout';
import { BarList, RevenueArea, StatTile } from './charts';

const RANGES = [7, 30, 90] as const;

const STATUS_ORDER = ['pending', 'paid', 'shipped', 'delivered', 'cancelled', 'oversold'] as const;

function variation(current: number, previous: number): number | undefined {
  if (previous === 0) return current > 0 ? 100 : undefined;
  return ((current - previous) / previous) * 100;
}

export function Dashboard({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const [data, setData] = useState<api.DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setData(null);
    api
      .fetchAdminDashboard(days)
      .then((d) => active && setData(d))
      .catch((e) => active && setError(e instanceof Error ? e.message : 'Erro ao carregar.'));
    return () => {
      active = false;
    };
  }, [days]);

  if (error) {
    return <p className="border border-line bg-surface p-4 text-sm text-danger">{error}</p>;
  }

  if (!data) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted">
        <Loader2 size={15} className="animate-spin" /> Carregando painel…
      </p>
    );
  }

  const maxStatus = Math.max(...Object.values(data.statusCounts), 1);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-900 uppercase">Painel</h1>
          <p className="mt-1 text-xs text-muted">Visão geral da loja nos últimos {days} dias</p>
        </div>

        <div className="flex border border-line" role="group" aria-label="Período de análise">
          {RANGES.map((range) => (
            <button
              key={range}
              onClick={() => setDays(range)}
              aria-pressed={days === range}
              className={`px-4 py-2 text-xs font-bold uppercase transition-colors ${
                days === range ? 'bg-ink text-paper' : 'text-muted hover:text-ink'
              }`}
            >
              {range}d
            </button>
          ))}
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Faturamento"
          value={formatPrice(data.current.revenue)}
          delta={variation(data.current.revenue, data.previous.revenue)}
          hint={`${formatPrice(data.previous.revenue)} no período anterior`}
          spark={data.daily.map((d) => d.value)}
        />
        <StatTile
          label="Pedidos"
          value={String(data.current.orderCount)}
          delta={variation(data.current.orderCount, data.previous.orderCount)}
          hint={`${data.previous.orderCount} no período anterior`}
        />
        <StatTile
          label="Ticket médio"
          value={formatPrice(data.current.averageTicket)}
          delta={variation(data.current.averageTicket, data.previous.averageTicket)}
        />
        <StatTile
          label="Peças vendidas"
          value={String(data.current.unitsSold)}
          delta={variation(data.current.unitsSold, data.previous.unitsSold)}
        />
      </div>

      {data.lowStock.length > 0 && (
        <button
          onClick={() => onNavigate('estoque')}
          className="flex w-full items-start gap-3 border border-line bg-paper p-4 text-left transition-colors hover:border-brand/60 sm:max-w-md"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-ink">
              {data.lowStock.length} {data.lowStock.length === 1 ? 'peça no limite' : 'peças no limite'} de
              estoque
            </p>
            <p className="mt-1 truncate text-[0.7rem] text-muted">
              {data.lowStock
                .slice(0, 3)
                .map((p) => `${p.name} (${p.stockQty})`)
                .join(' · ')}
              {data.lowStock.length > 3 && ` +${data.lowStock.length - 3}`}
            </p>
          </div>
        </button>
      )}

      <RevenueArea data={data.daily} formatValue={(v) => formatPrice(v)} />

      <BarList title="Peças mais vendidas" data={data.topProducts} formatValue={formatPrice} />

      <figure className="border border-line bg-paper p-4">
        <figcaption className="mb-4 flex items-baseline justify-between">
          <h3 className="text-[0.7rem] font-bold tracking-widest text-ink uppercase">
            Pedidos por status
          </h3>
          <span className="text-[0.65rem] text-muted">todo o histórico</span>
        </figcaption>

        <ul className="space-y-2.5">
          {STATUS_ORDER.map((status) => {
            const count = data.statusCounts[status] ?? 0;
            return (
              <li key={status} className="flex items-center gap-3">
                <span className="w-36 shrink-0 truncate text-xs text-ink">
                  {STATUS_LABEL[status] ?? status}
                </span>
                <span className="h-1.5 flex-1 bg-surface">
                  <span
                    className="block h-full"
                    style={{
                      width: `${(count / maxStatus) * 100}%`,
                      backgroundColor: status === 'cancelled' ? '#737373' : '#d90429',
                    }}
                  />
                </span>
                <span className="w-8 shrink-0 text-right font-display text-xs font-900 text-ink tabular-nums">
                  {count}
                </span>
              </li>
            );
          })}
        </ul>
      </figure>

      <section className="border border-line bg-paper">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h3 className="text-[0.7rem] font-bold tracking-widest text-ink uppercase">
            Últimos pedidos
          </h3>
          <button onClick={() => onNavigate('pedidos')} className="text-xs text-muted hover:text-brand">
            ver todos
          </button>
        </div>
        <ul className="divide-y divide-line">
          {data.recentOrders.map((order) => (
            <li key={order.id} className="flex items-center gap-3 px-4 py-3">
              <Package className="h-3.5 w-3.5 shrink-0 text-muted" />
              <span className="font-display text-xs font-900 text-ink tabular-nums">
                {order.id.slice(0, 8)}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs text-muted">
                {order.customerName ?? order.email} · {order.itemCount}{' '}
                {order.itemCount === 1 ? 'item' : 'itens'}
              </span>
              <span className="shrink-0 font-display text-xs font-900 text-ink tabular-nums">
                {formatPrice(order.total)}
              </span>
            </li>
          ))}
          {data.recentOrders.length === 0 && (
            <li className="px-4 py-6 text-center text-xs text-muted">Nenhum pedido ainda.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
