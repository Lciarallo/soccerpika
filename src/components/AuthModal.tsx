import { useEffect, useState, type FormEvent } from 'react';
import { Loader2, X } from 'lucide-react';
import { useSession } from '../hooks/session-context';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

export function AuthModal({ open, onClose }: AuthModalProps) {
  const { login, register } = useSession();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const form = new FormData(event.currentTarget);

    try {
      if (mode === 'login') {
        await login(String(form.get('email')), String(form.get('password')));
      } else {
        await register(
          String(form.get('name')),
          String(form.get('email')),
          String(form.get('password')),
        );
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível continuar.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/60 p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'login' ? 'Entrar' : 'Criar conta'}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-md bg-paper p-6 sm:p-10">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 hover:text-brand"
        >
          <X size={24} strokeWidth={1.5} />
        </button>

        <h2 className="font-display text-3xl font-900 uppercase">
          {mode === 'login' ? 'Entrar' : 'Criar conta'}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {mode === 'login'
            ? 'Acompanhe seus pedidos e compre mais rápido.'
            : 'Leva 30 segundos. Só precisamos de nome, e-mail e senha.'}
        </p>

        <form onSubmit={submit} className="mt-6 grid gap-5">
          {mode === 'register' && (
            <Field name="name" label="Nome" required autoComplete="name" />
          )}
          <Field
            name="email"
            label="E-mail"
            type="email"
            required
            autoComplete="email"
          />
          <Field
            name="password"
            label="Senha"
            type="password"
            required
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            hint={mode === 'register' ? 'Mínimo de 8 caracteres.' : undefined}
          />

          {error && <p className="bg-surface p-3 text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="btn btn-primary w-full py-4 text-sm tracking-wide uppercase"
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            {mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError(null);
          }}
          className="link-underline mt-5 w-full text-center text-sm hover:text-brand"
        >
          {mode === 'login' ? 'Não tenho conta — criar agora' : 'Já tenho conta — entrar'}
        </button>
      </div>
    </div>
  );
}

interface FieldProps {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  hint?: string;
}

function Field({ name, label, hint, ...rest }: FieldProps) {
  return (
    <div>
      <label htmlFor={name} className="text-xs tracking-widest text-muted uppercase">
        {label}
      </label>
      <input
        id={name}
        name={name}
        {...rest}
        className="mt-1.5 w-full border-b border-ink bg-transparent py-2.5 text-sm focus:outline-none"
      />
      {hint && <p className="mt-1 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}
