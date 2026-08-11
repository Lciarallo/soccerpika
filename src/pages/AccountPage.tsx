import { useEffect, useState, type FormEvent } from 'react';
import { Heart, Loader2, Package, User } from 'lucide-react';
import * as api from '../lib/api';
import type { Address, Order } from '../lib/api';
import type { Jersey } from '../types/jersey';
import { formatPrice } from '../lib/format';
import { useSession } from '../hooks/session-context';

type Tab = 'pedidos' | 'dados' | 'desejos';

const TABS: { id: Tab; label: string; icon: typeof Package }[] = [
  { id: 'pedidos', label: 'Meus pedidos', icon: Package },
  { id: 'dados', label: 'Meus dados', icon: User },
  { id: 'desejos', label: 'Lista de desejos', icon: Heart },
];

const STATUS: Record<string, string> = {
  approved: 'Pago',
  pending: 'Aguardando pagamento',
  in_process: 'Em análise',
  rejected: 'Recusado',
  cancelled: 'Cancelado',
  oversold: 'Em conferência',
};

export function AccountPage({ onExit }: { onExit: () => void }) {
  const { user, loading, logout } = useSession();
  const [tab, setTab] = useState<Tab>('pedidos');

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-3xl font-900 uppercase">Entre na sua conta</h1>
        <p className="mt-2 text-sm text-muted">
          Faça login pelo cabeçalho da loja para ver seus pedidos.
        </p>
        <button type="button" onClick={onExit} className="btn btn-dark mt-6 px-6 py-3 text-sm uppercase">
          Voltar à loja
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-5 py-4 sm:px-8">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="" width={40} height={40} className="h-10 w-10" />
          <div>
            <h1 className="font-display text-xl font-900 uppercase">Minha conta</h1>
            <p className="text-xs text-muted">{user.email}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onExit} className="btn btn-outline px-4 py-2.5 text-xs uppercase">
            Voltar à loja
          </button>
          <button
            type="button"
            onClick={() => {
              void logout();
              onExit();
            }}
            className="btn btn-dark px-4 py-2.5 text-xs uppercase"
          >
            Sair
          </button>
        </div>
      </header>

      <div className="grid gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
        <nav aria-label="Seções da conta">
          <ul className="space-y-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => setTab(id)}
                  aria-current={tab === id ? 'true' : undefined}
                  className={`flex w-full items-center gap-2 py-2 text-left text-sm tracking-wide uppercase transition-colors ${
                    tab === id ? 'font-bold text-brand' : 'text-muted hover:text-ink'
                  }`}
                >
                  <Icon size={15} /> {label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          {tab === 'pedidos' && <OrdersTab />}
          {tab === 'dados' && <ProfileTab />}
          {tab === 'desejos' && <WishlistTab />}
        </div>
      </div>
    </div>
  );
}

function OrdersTab() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.fetchOrders().then(setOrders).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="bg-surface p-3 text-sm text-danger">{error}</p>;
  if (!orders) return <Loading />;

  if (orders.length === 0) {
    return (
      <p className="text-sm text-muted">
        Você ainda não fez nenhum pedido. Quando comprar, ele aparece aqui com o
        status do pagamento e o rastreio.
      </p>
    );
  }

  return (
    <ul className="space-y-8">
      {orders.map((order) => (
        <li key={order.id} className="border-b border-line pb-8 last:border-b-0">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <p className="font-display text-lg font-800">
                {new Date(order.createdAt).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
              <p className="text-xs text-muted">
                {STATUS[order.status] ?? order.status}
                {order.paymentMethod && ` · ${order.paymentMethod}`}
                {order.trackingCode && ` · rastreio ${order.trackingCode}`}
              </p>
            </div>
            <p className="font-display text-xl font-900">{formatPrice(order.total)}</p>
          </div>

          <ul className="mt-4 space-y-3">
            {order.items.map((item, i) => (
              <li key={`${order.id}-${i}`} className="flex items-center gap-3">
                <div className="h-14 w-14 shrink-0 bg-surface">
                  {item.image && (
                    <img src={item.image} alt="" className="h-full w-full object-contain" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{item.name}</p>
                  <p className="text-xs text-muted">
                    Tamanho {item.size} · {item.quantity}x
                  </p>
                </div>
                <p className="text-sm tabular-nums">
                  {formatPrice(item.unitPrice * item.quantity)}
                </p>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

function ProfileTab() {
  const [data, setData] = useState<{ name: string; address: Address | null } | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    api
      .fetchProfile()
      .then((r) => {
        setData({ name: r.profile.name, address: r.address });
        setCpf(r.profile.cpf ?? '');
        setPhone(r.profile.phone ?? '');
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error && !data) return <p className="bg-surface p-3 text-sm text-danger">{error}</p>;
  if (!data) return <Loading />;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const f = new FormData(event.currentTarget);

    try {
      await api.saveProfile({
        name: String(f.get('name')),
        cpf: String(f.get('cpf')),
        phone: String(f.get('phone')),
        address: {
          zipCode: String(f.get('zipCode')),
          street: String(f.get('street')),
          number: String(f.get('number')),
          complement: String(f.get('complement')),
          neighborhood: String(f.get('neighborhood')),
          city: String(f.get('city')),
          state: String(f.get('state')),
        },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao salvar.');
    } finally {
      setBusy(false);
    }
  };

  const a = data.address;

  return (
    <form onSubmit={submit} className="max-w-2xl">
      <p className="text-sm text-muted">
        Preenchendo isto, o checkout já vem pronto na próxima compra.
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-6">
        <F name="name" label="Nome completo" defaultValue={data.name} required span={3} />
        <F name="cpf" label="CPF" value={cpf} onChange={setCpf} span={3} />
        <F name="phone" label="Telefone" value={phone} onChange={setPhone} span={3} />

        <F name="zipCode" label="CEP" defaultValue={a?.zipCode ?? ''} span={2} />
        <F name="street" label="Rua" defaultValue={a?.street ?? ''} span={3} />
        <F name="number" label="Nº" defaultValue={a?.number ?? ''} span={1} />
        <F name="complement" label="Complemento" defaultValue={a?.complement ?? ''} span={2} />
        <F name="neighborhood" label="Bairro" defaultValue={a?.neighborhood ?? ''} span={2} />
        <F name="city" label="Cidade" defaultValue={a?.city ?? ''} span={1} />
        <F name="state" label="UF" defaultValue={a?.state ?? ''} maxLength={2} span={1} />
      </div>

      {error && <p className="mt-5 bg-surface p-3 text-sm text-danger">{error}</p>}

      <button type="submit" disabled={busy} className="btn btn-primary mt-7 px-8 py-3.5 text-sm uppercase">
        {busy && <Loader2 size={15} className="animate-spin" />}
        {saved ? 'Salvo' : 'Salvar'}
      </button>
    </form>
  );
}

function WishlistTab() {
  const [items, setItems] = useState<Jersey[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.fetchWishlist().then(setItems).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="bg-surface p-3 text-sm text-danger">{error}</p>;
  if (!items) return <Loading />;

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted">
        Nada favoritado ainda. Toque no coração de uma peça para guardá-la aqui.
      </p>
    );
  }

  const remove = async (id: string) => {
    await api.removeFromWishlist(id);
    setItems((prev) => prev?.filter((p) => p.id !== id) ?? null);
  };

  return (
    <ul className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3">
      {items.map((p) => (
        <li key={p.id}>
          <div className="aspect-square bg-surface">
            {p.images[0] && (
              <img src={p.images[0]} alt={p.name} className="h-full w-full object-contain" />
            )}
          </div>
          <p className="mt-2 text-xs font-bold uppercase">{p.name}</p>
          <p className="text-sm">{formatPrice(p.price)}</p>
          <button
            type="button"
            onClick={() => remove(p.id)}
            className="link-underline mt-1 text-xs text-muted hover:text-brand"
          >
            Remover
          </button>
        </li>
      ))}
    </ul>
  );
}

const Loading = () => (
  <p className="flex items-center gap-2 text-sm text-muted">
    <Loader2 size={15} className="animate-spin" /> Carregando…
  </p>
);

function F({
  name,
  label,
  span,
  value,
  onChange,
  ...rest
}: {
  name: string;
  label: string;
  span: number;
  value?: string;
  onChange?: (v: string) => void;
  defaultValue?: string;
  required?: boolean;
  maxLength?: number;
}) {
  return (
    <div style={{ gridColumn: `span ${span}` }}>
      <label htmlFor={name} className="text-xs tracking-widest text-muted uppercase">
        {label}
      </label>
      <input
        id={name}
        name={name}
        {...(onChange ? { value, onChange: (e) => onChange(e.target.value) } : rest)}
        className="mt-1.5 w-full border-b border-ink bg-transparent py-2.5 text-sm focus:outline-none"
      />
    </div>
  );
}
