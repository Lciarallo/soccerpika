import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { SessionUser } from '../lib/api';
import { SessionContext, type SessionValue } from './session-context';

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading] = useState(false);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let isMounted = true;

    Promise.all([
      import('../lib/firebase'),
      import('firebase/auth'),
      import('firebase/firestore'),
    ]).then(([{ auth, db }, { onAuthStateChanged }, { doc, getDoc }]) => {
      if (!isMounted) return;
      unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
        if (!fbUser) {
          if (isMounted) setUser(null);
          return;
        }

        try {
          const tokenResult = await fbUser.getIdTokenResult();
          const isAdmin = tokenResult.claims.admin === true;

          let userDocData: Record<string, unknown> = {};
          try {
            const userSnap = await getDoc(doc(db, 'users', fbUser.uid));
            if (userSnap.exists()) {
              userDocData = userSnap.data();
            }
          } catch {
            // fallback
          }

          if (isMounted) {
            setUser({
              id: fbUser.uid,
              email: fbUser.email || '',
              name:
                fbUser.displayName ||
                (userDocData.name as string) ||
                fbUser.email?.split('@')[0] ||
                'Cliente',
              role: isAdmin || userDocData.role === 'admin' ? 'admin' : 'user',
              cpf: (userDocData.cpf as string) || null,
              phone: (userDocData.phone as string) || null,
            });
          }
        } catch {
          if (isMounted) {
            setUser({
              id: fbUser.uid,
              email: fbUser.email || '',
              name: fbUser.displayName || 'Cliente',
              role: 'user',
            });
          }
        }
      });
    });

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const value = useMemo<SessionValue>(
    () => ({
      user,
      loading,
      isAdmin: user?.role === 'admin',
      login: async (email, password) => {
        const [{ auth }, { signInWithEmailAndPassword }] = await Promise.all([
          import('../lib/firebase'),
          import('firebase/auth'),
        ]);
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        const tokenResult = await cred.user.getIdTokenResult(true);
        const isAdmin = tokenResult.claims.admin === true;

        setUser({
          id: cred.user.uid,
          email: cred.user.email || '',
          name: cred.user.displayName || 'Cliente',
          role: isAdmin ? 'admin' : 'user',
        });
      },
      register: async (name, email, password) => {
        const [{ auth, db }, { createUserWithEmailAndPassword, updateProfile }, { doc, setDoc }] =
          await Promise.all([
            import('../lib/firebase'),
            import('firebase/auth'),
            import('firebase/firestore'),
          ]);

        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(cred.user, { displayName: name.trim() });

        try {
          await setDoc(
            doc(db, 'users', cred.user.uid),
            {
              id: cred.user.uid,
              name: name.trim(),
              email: email.trim().toLowerCase(),
              role: 'user',
              createdAt: new Date().toISOString(),
            },
            { merge: true },
          );
        } catch {
          // fallback
        }

        setUser({
          id: cred.user.uid,
          email: cred.user.email || '',
          name: name.trim(),
          role: 'user',
        });
      },
      logout: async () => {
        const [{ auth }, { signOut }] = await Promise.all([
          import('../lib/firebase'),
          import('firebase/auth'),
        ]);
        await signOut(auth);
        setUser(null);
      },
    }),
    [user, loading],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
