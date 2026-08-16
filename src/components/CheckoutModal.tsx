import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Check, Copy, ExternalLink, Loader2, ShieldCheck, X, Zap } from 'lucide-react';
import type { CartItem } from '../types/jersey';
import {
  CheckoutError,
  createPayment,
  fetchPaymentStatus,
  isApproved,
  STATUS_LABEL,
  fetchShipping,
  type PaymentResult,
  type ShippingOption,
} from '../lib/checkout';
import { formatPrice } from '../lib/format';

interface CheckoutModalProps {
  open: boolean;
  items: CartItem[];
  onClose: () => void;
  onPaid: () => void;
}

export function CheckoutModal({ open, items, onClose, onPaid }: CheckoutModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Shipping states
  const [shippingCep, setShippingCep] = useState('');
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[] | null>(null);
  const [selectedShippingMethod, setSelectedShippingMethod] = useState<string | null>(null);
  const [loadingShipping, setLoadingShipping] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const closeActionRef = useRef<() => void>(() => undefined);

  const itemsTotal = useMemo(
    () => items.reduce((sum, i) => sum + i.jersey.price * i.quantity, 0),
    [items],
  );

  const itemCount = useMemo(() => items.reduce((s, i) => s + i.quantity, 0), [items]);

  const shippingCost = useMemo(() => {
    if (!selectedShippingMethod || !shippingOptions) return 0;
    const opt = shippingOptions.find((o) => o.method === selectedShippingMethod);
    return opt ? opt.priceCents / 100 : 0;
  }, [selectedShippingMethod, shippingOptions]);

  const total = itemsTotal + shippingCost;

  const reset = () => {
    setResult(null);
    setStatus(null);
    setError(null);
    setCopied(false);
  };

  const close = () => {
    reset();
    onClose();
  };
  closeActionRef.current = close;

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    const frame = window.requestAnimationFrame(() =>
      modalRef.current?.querySelector<HTMLElement>('button')?.focus(),
    );
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeActionRef.current();
        return;
      }
      if (event.key !== 'Tab' || !modalRef.current) return;
      const focusable = [
        ...modalRef.current.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href]',
        ),
      ].filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable.at(-1)!;
      if (!modalRef.current.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open]);

  // O Pix é assíncrono: consulta o estado do pedido até aprovar.
  useEffect(() => {
    if (!result || isApproved(result.status)) return;

    let stop = false;
    const tick = async () => {
      try {
        const next = await fetchPaymentStatus(result.orderId);
        if (stop) return;
        setStatus(next.status);
        if (isApproved(next.status)) {
          onPaid();
          return;
        }
      } catch {
        /* uma consulta que falha não derruba o fluxo; tenta na próxima */
      }
      if (!stop) timer = window.setTimeout(tick, 5000);
    };

    let timer = window.setTimeout(tick, 5000);
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [result, onPaid]);

  // Calcula frete quando o CEP tiver 8 dígitos
  useEffect(() => {
    const cepDigits = shippingCep.replace(/\D/g, '');
    if (cepDigits.length !== 8) {
      setShippingOptions(null);
      setSelectedShippingMethod(null);
      setShippingError(null);
      return;
    }
    let active = true;
    const loadShipping = async () => {
      setLoadingShipping(true);
      setShippingError(null);
      try {
        const options = await fetchShipping(cepDigits, items);
        if (!active) return;
        setShippingOptions(options);
        if (options.length > 0) {
          setSelectedShippingMethod(options[0].method);
        }
      } catch {
        if (!active) return;
        setShippingError('Erro ao calcular o frete.');
        setShippingOptions(null);
      } finally {
        if (active) setLoadingShipping(false);
      }
    };

    const timeout = setTimeout(loadShipping, 500);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [shippingCep, items]);

  if (!open) return null;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const payer = {
      firstName: String(form.get('firstName') ?? ''),
      lastName: String(form.get('lastName') ?? ''),
      email: String(form.get('email') ?? ''),
      phone: String(form.get('phone') ?? ''),
    };

    try {
      const payment = await createPayment({
        items,
        payer,
        shippingMethod: selectedShippingMethod ?? undefined,
        shippingCep: shippingCep.replace(/\D/g, '') || undefined,
      });

      setResult(payment);
      setStatus(payment.status);
    } catch (e) {
      setError(
        e instanceof CheckoutError || e instanceof Error
          ? e.message
          : 'Não foi possível processar o pagamento.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = async () => {
    if (!result?.checkoutUrl) return;
    await navigator.clipboard.writeText(result.checkoutUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentStatus = status ?? result?.status ?? '';
  const approved = isApproved(currentStatus);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Pagamento"
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <div ref={modalRef} className="relative w-full max-w-2xl bg-white shadow-2xl">
        <button
          type="button"
          onClick={close}
          aria-label="Fechar"
          className="absolute top-4 right-4 z-10 hover:text-brand"
        >
          <X size={24} strokeWidth={1.5} />
        </button>

        <div className="p-5 sm:p-10">
          <h2 className="font-display text-3xl font-900 uppercase">
            {approved ? 'Pagamento aprovado' : 'Pagamento'}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {itemCount} item(s) ·{' '}
            <strong className="text-ink">{formatPrice(total)}</strong>
          </p>

          {/* ---------- resultado ---------- */}
          {result ? (
            <div className="mt-8">
              {approved ? (
                <div className="text-center">
                  <Check size={48} className="mx-auto text-success" strokeWidth={1.5} />
                  <p className="mt-4 text-sm">
                    Recebemos seu pagamento. Enviamos os detalhes do envio por e-mail.
                  </p>
                  <button
                    type="button"
                    onClick={close}
                    className="btn btn-dark mt-6 w-full py-4 text-sm tracking-wide uppercase"
                  >
                    Concluir
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col items-center gap-4 border border-line bg-surface p-6 sm:flex-row sm:items-start">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center border border-line bg-white text-brand">
                      <Zap className="h-9 w-9 animate-pulse" />
                    </div>

                    <div className="flex-1 space-y-3 text-center sm:text-left">
                      <div>
                        <p className="text-[0.65rem] font-bold tracking-widest text-brand uppercase">
                          Pague com Pix via InfinitePay
                        </p>
                        <p className="mt-1 font-display text-2xl font-900 tabular-nums">
                          {formatPrice(result.amount)}
                        </p>
                      </div>

                      <ol className="space-y-1 text-xs text-muted">
                        <li>1. Clique no botão para abrir o pagamento seguro da InfinitePay</li>
                        <li>2. Escaneie o QR Code do Pix ou use o Copia e Cola no app do banco</li>
                        <li>3. A confirmação é automática — esta tela atualiza sozinha</li>
                      </ol>

                      <div className="pt-2">
                        <a
                          href={result.checkoutUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-primary inline-flex items-center gap-2 px-5 py-3 text-xs uppercase tracking-wide"
                        >
                          <span>Pagar com Pix na InfinitePay</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>

                      <div className="flex items-center gap-1.5 border-t border-line pt-2 text-[0.65rem] text-muted">
                        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-success" />
                        <span>Pagamento seguro intermediado pela InfinitePay.</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={result.checkoutUrl}
                      onFocus={(event) => event.target.select()}
                      className="flex-1 border-b border-ink bg-transparent py-2.5 font-mono text-[0.65rem]"
                      aria-label="Link de pagamento InfinitePay"
                    />
                    <button
                      type="button"
                      onClick={copyLink}
                      className="btn btn-outline shrink-0 px-3 text-xs uppercase"
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>

                  <p className="flex items-center justify-center gap-2 text-sm text-muted">
                    <Loader2 size={15} className="animate-spin" />
                    {STATUS_LABEL[currentStatus] ?? 'Aguardando pagamento'}…
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* ---------- formulário ---------- */
            <form onSubmit={submit} className="mt-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field name="firstName" label="Nome" required autoComplete="given-name" />
                <Field name="lastName" label="Sobrenome" required autoComplete="family-name" />
                <Field
                  name="email"
                  label="E-mail"
                  type="email"
                  required
                  autoComplete="email"
                  className="sm:col-span-2"
                />
                <Field
                  name="phone"
                  label="Celular"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="(00) 00000-0000"
                />
              </div>

              {/* Seção de Frete (Obrigatório) */}
              <div className="mt-6 border-t border-line pt-6">
                <h3 className="text-xs font-bold uppercase tracking-widest mb-3">Entrega</h3>

                <div className="grid gap-5 sm:grid-cols-6">
                  <div className="sm:col-span-2">
                    <label htmlFor="shippingCep" className="text-xs tracking-widest text-muted uppercase">
                      CEP
                    </label>
                    <input
                      id="shippingCep"
                      name="zipCode"
                      required
                      inputMode="numeric"
                      maxLength={9}
                      value={shippingCep}
                      onChange={(e) => setShippingCep(e.target.value)}
                      placeholder="00000-000"
                      className="mt-1.5 w-full border-b border-ink bg-transparent py-2.5 text-sm placeholder:text-muted"
                    />
                  </div>
                </div>

                {loadingShipping && (
                  <p className="mt-3 flex items-center gap-2 text-xs text-muted">
                    <Loader2 size={13} className="animate-spin" />
                    Calculando frete…
                  </p>
                )}
                {shippingError && <p className="mt-3 text-xs text-danger">{shippingError}</p>}

                {shippingOptions && shippingOptions.length > 0 && (
                  <div className="mt-4 grid gap-2">
                    {shippingOptions.map((opt) => {
                      const isFree = opt.priceCents === 0;
                      return (
                        <button
                          key={opt.method}
                          type="button"
                          onClick={() => setSelectedShippingMethod(opt.method)}
                          className={`flex items-center justify-between border p-3 transition-colors ${
                            selectedShippingMethod === opt.method
                              ? 'border-ink bg-ink/5'
                              : 'border-line hover:border-ink/50'
                          }`}
                        >
                          <div className="text-left">
                            <span className="block text-sm font-bold uppercase">{opt.method}</span>
                            <span className="text-[10px] text-muted">Em até {opt.deliveryDays} dias úteis</span>
                          </div>
                          <span className="text-sm font-bold">
                            {isFree ? 'Grátis' : formatPrice(opt.priceCents / 100)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {error && <p className="mt-5 bg-surface p-3 text-sm text-danger">{error}</p>}

              <button
                type="submit"
                disabled={submitting || !selectedShippingMethod}
                className="btn btn-primary mt-7 w-full py-4 text-sm tracking-wide uppercase disabled:opacity-50"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {submitting ? 'Gerando cobrança…' : `Pagar ${formatPrice(total)} com Pix`}
              </button>

              <p className="mt-3 text-center text-[11px] text-muted">
                Pagamento processado pela InfinitePay. Não guardamos dados do
                seu Pix.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

interface FieldProps {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: 'text' | 'numeric' | 'tel';
  maxLength?: number;
  className?: string;
}

function Field({ name, label, className = '', ...rest }: FieldProps) {
  return (
    <div className={className}>
      <label htmlFor={name} className="text-xs tracking-widest text-muted uppercase">
        {label}
      </label>
      <input
        id={name}
        name={name}
        {...rest}
        className="mt-1.5 w-full border-b border-ink bg-transparent py-2.5 text-sm
                   placeholder:text-muted"
      />
    </div>
  );
}
