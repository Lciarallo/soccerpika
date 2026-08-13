import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { SessionUser } from '../lib/api';
import { SessionContext, type SessionValue } from './session-context';

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/auth/session', { credentials: 'same-origin' })
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((data) => {
        if (isMounted) {
          setUser(data.user || null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setUser(null);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo<SessionValue>(
    () => ({
      user,
      loading,
      isAdmin: user?.role === 'admin',
      login: async (email, password) => {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ email: email.trim(), password }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Não foi possível entrar. Verifique seu e-mail e senha.');
        }
        setUser(data.user);
      },
      register: async (name, email, password) => {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Não foi possível cadastrar.');
        }
        setUser(data.user);
      },
      logout: async () => {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
        setUser(null);
      },
    }),
    [user, loading],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
