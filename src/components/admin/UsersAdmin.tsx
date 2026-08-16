import { useEffect, useState } from 'react';
import { Loader2, ShieldCheck, X } from 'lucide-react';
import * as api from '../../lib/api';
import { useSession } from '../../hooks/session-context';

export function UsersAdmin() {
  const { user: me } = useSession();
  const [users, setUsers] = useState<api.AdminUserRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const reload = () =>
    api
      .fetchAdminUsers()
      .then(setUsers)
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao carregar usuários.'));

  useEffect(() => {
    void reload();
  }, []);

  const toggleRole = async (target: api.AdminUserRow) => {
    const nextRole = target.role === 'admin' ? 'user' : 'admin';
    if (
      nextRole === 'user' &&
      target.id === me?.id &&
      !confirm('Remover seu próprio acesso de administrador?')
    ) {
      return;
    }
    setPending(target.id);
    setError(null);
    try {
      await api.updateAdminUserRole(target.id, nextRole);
      void reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao atualizar usuário.');
    } finally {
      setPending(null);
    }
  };

  if (!users) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted">
        <Loader2 size={15} className="animate-spin" /> Carregando usuários…
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-3xl font-900 uppercase">Usuários</h1>
        <p className="mt-1 text-xs text-muted">{users.length} contas cadastradas</p>
      </header>

      {error && (
        <p className="flex items-center justify-between bg-surface p-3 text-sm text-danger">
          {error}
          <button type="button" onClick={() => setError(null)} aria-label="Dispensar">
            <X size={15} />
          </button>
        </p>
      )}

      <div className="overflow-x-auto border border-line">
        <table className="w-full min-w-2xl text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs tracking-widest text-muted uppercase">
              {['Nome', 'Papel', 'Pedidos', 'Desde', ''].map((header) => (
                <th key={header} className="px-4 py-3 font-semibold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isMe = user.id === me?.id;
              return (
                <tr key={user.id} className="border-b border-line hover:bg-surface">
                  <td className="px-4 py-3">
                    <p className="text-xs text-ink">
                      {user.name}
                      {isMe && <span className="ml-1.5 text-[0.65rem] text-brand">você</span>}
                    </p>
                    <p className="text-[0.65rem] text-muted">{user.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 border px-2 py-0.5 text-[11px] font-bold uppercase ${
                        user.role === 'admin' ? 'border-brand text-brand' : 'border-line text-muted'
                      }`}
                    >
                      {user.role === 'admin' && <ShieldCheck className="h-3 w-3" />}
                      {user.role === 'admin' ? 'Administrador' : 'Cliente'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs tabular-nums text-muted">{user.orderCount}</td>
                  <td className="px-4 py-3 text-[0.65rem] text-muted">
                    {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggleRole(user)}
                      disabled={pending === user.id}
                      className="text-xs text-muted hover:text-brand disabled:opacity-40"
                    >
                      {pending === user.id
                        ? 'salvando…'
                        : user.role === 'admin'
                          ? 'remover admin'
                          : 'tornar admin'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
