import { useEffect, useMemo, useState } from 'react';
import { Loader2, Package, Search, Truck, X } from 'lucide-react';
import * as api from '../../lib/api';
import { formatPrice } from '../../lib/format';
import { STATUS_LABEL } from '../../lib/checkout';

const FILTERS = ['todos', 'pending', 'paid', 'shipped', 'delivered', 'cancelled', 'oversold'] as const;

/** Próximo passo possível na esteira, a partir do status atual. */
const NEXT_STATUS: Record<string, string | null> = {
  pending: 'paid',
  paid: 'shipped',
  shipped: 'delivered',
  delivered: null,
  cancelled: null,
  oversold: null,
};

const normalize = (value: string) => value.trim().toLowerCase();

export function StatusPill({ status }: { status: string }) {
  const tone =
    status === 'cancelled' || status === 'oversold'
      ? 'border-muted text-muted'
      : status === 'delivered'
        ? 'border-success text-success'
        : status === 'pending'
          ? 'border-line text-muted'
          : 'border-brand text-brand';

  return (
    <span className={`inline-block border px-2 py-0.5 text-[11px] font-bold uppercase ${tone}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function OrdersAdmin() {
  const [orders, setOrders] = useState<api.AdminOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('todos');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<api.AdminOrder | null>(null);

  const reload = () =>
    api
      .fetchAdminOrders()
      .then(setOrders)
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao carregar pedidos.'));

  useEffect(() => {
    void reload();
  }, []);

  const visible = useMemo(() => {
    if (!orders) return [];
    const term = normalize(search);
    return orders.filter((order) => {
      if (filter !== 'todos' && order.status !== filter) return false;
      if (!term) return true;
      return [order.id, order.customerName ?? '', order.email]
        .map(normalize)
        .some((field) => field.includes(term));
    });
  }, [orders, filter, search]);

  const current = selected ? (orders?.find((o) => o.id === selected.id) ?? null) : null;

  const advance = async (order: api.AdminOrder) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    try {
      await api.updateAdminOrder(order.id, { status: next });
      void reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao atualizar pedido.');
    }
  };

  if (!orders) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted">
        <Loader2 size={15} className="animate-spin" /> Carregando pedidos…
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-3xl font-900 uppercase">Pedidos</h1>
        <p className="mt-1 text-xs text-muted">
          {visible.length} de {orders.length} pedidos
        </p>
      </header>

      {error && (
        <p className="flex items-center justify-between bg-surface p-3 text-sm text-danger">
          {error}
          <button type="button" onClick={() => setError(null)} aria-label="Dispensar">
            <X size={15} />
          </button>
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por pedido, cliente ou e-mail"
            className="w-full border-b border-ink bg-transparent py-2.5 pl-8 text-sm focus:outline-none"
          />
        </div>
        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value as (typeof FILTERS)[number])}
          className="border-b border-ink bg-transparent py-2.5 text-sm focus:outline-none sm:w-56"
          aria-label="Filtrar por status"
        >
          {FILTERS.map((option) => (
            <option key={option} value={option}>
              {option === 'todos' ? 'Todos os status' : (STATUS_LABEL[option] ?? option)}
            </option>
          ))}
        </select>
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 border border-line py-16 text-center">
          <Package className="h-10 w-10 text-line" />
          <p className="text-sm text-muted">Nenhum pedido com esses filtros.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-line">
          <table className="w-full min-w-3xl text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs tracking-widest text-muted uppercase">
                {['Pedido', 'Cliente', 'Itens', 'Status', 'Total', ''].map((header) => (
                  <th key={header} className="px-4 py-3 font-semibold">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((order) => (
                <tr key={order.id} className="border-b border-line hover:bg-surface">
                  <td className="px-4 py-3">
                    <p className="font-display text-xs font-900 tabular-nums">{order.id.slice(0, 8)}</p>
                    <p className="text-[0.65rem] text-muted">
                      {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs">{order.customerName ?? '—'}</p>
                    <p className="text-[0.65rem] text-muted">{order.email}</p>
                  </td>
                  <td className="px-4 py-3 text-xs tabular-nums text-muted">
                    {order.items.reduce((sum, i) => sum + i.quantity, 0)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={order.status} />
                  </td>
                  <td className="px-4 py-3 font-display text-xs font-900 tabular-nums">
                    {formatPrice(order.total)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelected(order)}
                      className="text-xs text-muted hover:text-brand"
                    >
                      detalhes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {current && (
        <OrderDetail
          order={current}
          onClose={() => setSelected(null)}
          onAdvance={() => advance(current)}
          onTracking={async (code) => {
            try {
              await api.updateAdminOrder(current.id, { trackingCode: code });
              void reload();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Erro ao salvar rastreio.');
            }
          }}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function OrderDetail({
  order,
  onClose,
  onAdvance,
  onTracking,
}: {
  order: api.AdminOrder;
  onClose: () => void;
  onAdvance: () => void;
  onTracking: (code: string) => void;
}) {
  const [tracking, setTracking] = useState(order.trackingCode ?? '');
  const next = NEXT_STATUS[order.status];

  return (
    <div
      className="fixed inset-0 z-70 flex justify-end bg-ink/70 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Detalhes do pedido ${order.id}`}
    >
      <aside
        className="flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-line bg-paper"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-paper px-5 py-4">
          <div>
            <p className="font-display text-lg font-900 tabular-nums">{order.id.slice(0, 8)}</p>
            <p className="text-xs text-muted">
              {new Date(order.createdAt).toLocaleString('pt-BR')}
            </p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-6 p-5">
          <section>
            <p className="text-xs tracking-widest text-muted uppercase">Status do pedido</p>
            <div className="mt-2 flex items-center gap-3">
              <StatusPill status={order.status} />
              {next && (
                <button
                  onClick={onAdvance}
                  className="btn btn-primary px-3 py-1.5 text-xs uppercase"
                >
                  Marcar como {STATUS_LABEL[next] ?? next}
                </button>
              )}
            </div>
          </section>

          <section>
            <p className="text-xs tracking-widest text-muted uppercase">Código de rastreio</p>
            <div className="mt-1.5 flex gap-2">
              <input
                value={tracking}
                onChange={(event) => setTracking(event.target.value.toUpperCase())}
                placeholder="BR000000000BR"
                className="flex-1 border-b border-ink bg-transparent py-2 font-mono text-xs focus:outline-none"
              />
              <button
                onClick={() => onTracking(tracking)}
                disabled={!tracking.trim()}
                className="btn btn-outline shrink-0 px-3 text-xs uppercase disabled:opacity-40"
              >
                <Truck className="h-3.5 w-3.5" />
                Salvar
              </button>
            </div>
          </section>

          <section>
            <p className="text-xs tracking-widest text-muted uppercase">Itens</p>
            <ul className="mt-2 divide-y divide-line border border-line">
              {order.items.map((item, index) => (
                <li key={`${item.name}-${item.size}-${index}`} className="flex gap-3 p-3">
                  <div className="h-12 w-12 shrink-0 bg-surface">
                    {item.image && (
                      <img src={item.image} alt="" className="h-full w-full object-contain" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-ink">{item.name}</p>
                    <p className="text-[0.65rem] text-muted">
                      {item.size} · {item.quantity}un
                    </p>
                  </div>
                  <p className="shrink-0 font-display text-xs font-900 tabular-nums">
                    {formatPrice(item.unitPrice * item.quantity)}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <p className="text-xs tracking-widest text-muted uppercase">Cliente</p>
            <div className="mt-2 space-y-1 border border-line p-3 text-xs">
              <p className="text-ink">{order.customerName ?? 'Compra sem conta'}</p>
              <p className="text-muted">{order.email}</p>
            </div>
          </section>

          <div className="flex justify-between border-t border-line pt-4 text-sm">
            <span className="font-display font-900 uppercase">Total</span>
            <span className="font-display text-lg font-900 tabular-nums">
              {formatPrice(order.total)}
            </span>
          </div>
        </div>
      </aside>
    </div>
  );
}
