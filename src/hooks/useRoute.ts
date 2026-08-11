import { useCallback, useEffect, useState } from 'react';

/**
 * Rota atual com navegação por History API.
 *
 * São três telas (loja, conta, painel) — um router completo não se paga aqui.
 * O `vercel.json` reescreve tudo que não é /api para o index.html, então
 * recarregar em /admin funciona.
 */
export function useRoute() {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((to: string) => {
    window.history.pushState({}, '', to);
    setPath(to);
    window.scrollTo(0, 0);
  }, []);

  return { path, navigate };
}
