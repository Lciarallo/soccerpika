import { useEffect, useMemo, useState, type ReactNode } from 'react';
import * as api from '../lib/api';
import type { SessionUser } from '../lib/api';
import { SessionContext, type SessionValue } from './session-context';

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .getSession()
      // Sem API disponível a sessão fica anônima — não é erro de tela.
      .catch(() => null)
      .then((u) => {
        if (!cancelled) {
          setUser(u);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<SessionValue>(
    () => ({
      user,
      loading,
      isAdmin: user?.role === 'admin',
      login: async (email, password) => setUser(await api.login(email, password)),
      register: async (name, email, password) =>
        setUser(await api.register(name, email, password)),
      logout: async () => {
        await api.logout();
        setUser(null);
      },
    }),
    [user, loading],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
