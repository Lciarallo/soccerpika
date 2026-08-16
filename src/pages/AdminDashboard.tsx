import { useState } from 'react';
import {
  Boxes,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Package,
  Store,
  Users,
  X,
} from 'lucide-react';
import { useSession } from '../hooks/session-context';
import { Dashboard } from '../components/admin/Dashboard';
import { OrdersAdmin } from '../components/admin/OrdersAdmin';
import { ProductsAdmin } from '../components/admin/ProductsAdmin';
import { StockAdmin } from '../components/admin/StockAdmin';
import { UsersAdmin } from '../components/admin/UsersAdmin';

interface Tab {
  key: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const TABS: Tab[] = [
  { key: 'painel', label: 'Painel', icon: LayoutDashboard },
  { key: 'pedidos', label: 'Pedidos', icon: Package },
  { key: 'estoque', label: 'Estoque', icon: Boxes },
  { key: 'catalogo', label: 'Catálogo', icon: Store },
  { key: 'usuarios', label: 'Usuários', icon: Users },
];

export function AdminDashboard({ onExit }: { onExit: () => void }) {
  const { user, isAdmin, loading, logout } = useSession();
  const [tab, setTab] = useState('painel');
  const [menuOpen, setMenuOpen] = useState(false);

  if (loading) {
    return (
      <Centered>
        <Loader2 className="animate-spin" />
      </Centered>
    );
  }

  if (!isAdmin) {
    return (
      <Centered>
        <h1 className="font-display text-3xl font-900 uppercase">Acesso restrito</h1>
        <p className="mt-2 text-sm text-muted">
          {user
            ? 'Esta conta não é de administrador.'
            : 'Entre com uma conta de administrador para ver o painel.'}
        </p>
        <button type="button" onClick={onExit} className="btn btn-dark mt-6 px-6 py-3 text-sm uppercase">
          Voltar à loja
        </button>
      </Centered>
    );
  }

  const navigate = (next: string) => {
    setTab(next);
    setMenuOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-paper">
      {/* Barra lateral */}
      <aside
        className={`fixed inset-y-0 left-0 z-60 flex w-60 flex-col border-r border-line bg-paper transition-transform lg:static lg:translate-x-0 ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-2.5 border-b border-line px-5 py-4">
          <img src="/logo.png" alt="" width={36} height={36} className="h-9 w-9" />
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-900 uppercase">Soccer Pika</p>
            <p className="text-[0.65rem] tracking-widest text-muted uppercase">Painel</p>
          </div>
          <button
            onClick={() => setMenuOpen(false)}
            className="ml-auto text-muted lg:hidden"
            aria-label="Fechar menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 p-3" aria-label="Seções do painel">
          <ul className="space-y-1">
            {TABS.map((item) => {
              const Icon = item.icon;
              const active = tab === item.key;
              return (
                <li key={item.key}>
                  <button
                    onClick={() => navigate(item.key)}
                    aria-current={active ? 'page' : undefined}
                    className={`flex w-full items-center gap-2.5 border-l-2 px-3 py-2.5 text-left transition-colors ${
                      active
                        ? 'border-brand bg-brand/5 text-ink'
                        : 'border-transparent text-muted hover:text-ink'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="text-xs font-bold tracking-wide uppercase">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-line p-3">
          <div className="px-2 py-2">
            <p className="truncate text-xs text-ink">{user?.name}</p>
            <p className="text-[0.65rem] text-muted">{user?.email}</p>
          </div>

          <button
            onClick={onExit}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-muted transition-colors hover:text-ink"
          >
            <Store className="h-3.5 w-3.5" />
            <span className="text-xs">Ver a loja</span>
          </button>
          <button
            onClick={() => void logout()}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-muted transition-colors hover:text-brand"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="text-xs">Sair</span>
          </button>
        </div>
      </aside>

      {menuOpen && (
        <button
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-50 bg-ink/60 lg:hidden"
          aria-label="Fechar menu"
        />
      )}

      {/* Conteúdo */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-line bg-paper px-4 py-3 lg:hidden">
          <button onClick={() => setMenuOpen(true)} className="text-ink" aria-label="Abrir menu">
            <Menu className="h-5 w-5" />
          </button>
          <img src="/logo.png" alt="Soccer Pika" width={28} height={28} className="h-7 w-7" />
        </header>

        <main className="flex-1 p-4 md:p-8">
          {tab === 'painel' && <Dashboard onNavigate={navigate} />}
          {tab === 'pedidos' && <OrdersAdmin />}
          {tab === 'estoque' && <StockAdmin />}
          {tab === 'catalogo' && <ProductsAdmin />}
          {tab === 'usuarios' && <UsersAdmin />}
        </main>
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      {children}
    </div>
  );
}
