import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Check, Copy, ExternalLink, Loader2, X } from 'lucide-react';
import type { CartItem } from '../types/jersey';
import {
  CheckoutError,
  createPayment,
  fetchPaymentStatus,
  isApproved,
  STATUS_LABEL,
  fetchShipping,
  type PaymentMethod,
  type PaymentResult,
  type ShippingOption,
} from '../lib/checkout';
import { useMercadoPago } from '../hooks/useMercadoPago';
import { formatPrice } from '../lib/format';

interface CheckoutModalProps {
  open: boolean;
  items: CartItem[];
  onClose: () => void;
  onPaid: () => void;
}

const METHODS: { id: PaymentMethod; label: string; hint: string }[] = [
  { id: 'pix', label: 'Pix', hint: 'Aprovação na hora' },
  { id: 'card', label: 'Cartão', hint: 'Até 12x sem juros' },
  { id: 'boleto', label: 'Boleto', hint: 'Compensa em 1–3 dias úteis' },
];

export function CheckoutModal({ open, items, onClose, onPaid }: CheckoutModalProps) {
  const [method, setMethod] = useState<PaymentMethod>('pix');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [installments, setInstallments] = useState(1);
  
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
    const opt = shippingOptions.find(o => o.method === selectedShippingMethod);
    return opt ? opt.priceCents / 100 : 0;
  }, [selectedShippingMethod, shippingOptions]);

  const total = itemsTotal + shippingCost;

  const mp = useMercadoPago({ enabled: open && method === 'card' && !result, amount: total });

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

  // Pix e boleto são assíncronos: consulta o estado até aprovar.
  useEffect(() => {
    if (!result || isApproved(result.status)) return;
    if (result.method === 'card') return;

    let stop = false;
    const tick = async () => {
      try {
        const next = await fetchPaymentStatus(result.id);
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
    const cepDigits = shippingCep.replace(/\\D/g, '');
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
      } catch (e) {
        if (!active) return;
        setShippingError('Erro ao calcular o frete.');
        setShippingOptions(null);
      } finally {
        if (active) setLoadingShipping(false);
      }
    };
    
    // Pequeno debounce
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
      cpf: String(form.get('cpf') ?? ''),
      ...(method === 'boleto'
        ? {
            address: {
              zipCode: String(form.get('zipCode') ?? ''),
              street: String(form.get('street') ?? ''),
              number: String(form.get('number') ?? ''),
              neighborhood: String(form.get('neighborhood') ?? ''),
              city: String(form.get('city') ?? ''),
              state: String(form.get('state') ?? ''),
            },
          }
        : {}),
    };

    try {
      let token: string | undefined;
      if (method === 'card') {
        token = await mp.createCardToken(
          `${payer.firstName} ${payer.lastName}`.trim(),
          payer.cpf,
        );
      }

      const payment = await createPayment({
        method,
        items,
        payer,
        token,
        installments: method === 'card' ? installments : undefined,
        paymentMethodId: mp.paymentMethodId ?? undefined,
        issuerId: mp.issuerId ?? undefined,
        shippingMethod: selectedShippingMethod ?? undefined,
        shippingCep: shippingCep.replace(/\\D/g, '') || undefined,
      });

      setResult(payment);
      setStatus(payment.status);
      if (isApproved(payment.status)) onPaid();
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

  const copyPix = async () => {
    if (!result?.pix) return;
    await navigator.clipboard.writeText(result.pix.qrCode);
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
              ) : result.pix ? (
                <div className="text-center">
                  {result.pix.qrCodeBase64 && (
                    <img
                      src={`data:image/png;base64,${result.pix.qrCodeBase64}`}
                      alt="QR code do Pix"
                      className="mx-auto h-56 w-56"
                    />
                  )}
                  <p className="mt-4 text-sm text-muted">
                    Escaneie o QR code no app do banco, ou copie o código abaixo.
                  </p>

                  <div className="mt-4 flex items-center gap-2 bg-surface p-3">
                    <code className="min-w-0 flex-1 truncate text-left text-xs">
                      {result.pix.qrCode}
                    </code>
                    <button
                      type="button"
                      onClick={copyPix}
                      className="btn btn-dark shrink-0 px-3 py-2 text-xs uppercase"
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>

                  <p className="mt-5 flex items-center justify-center gap-2 text-sm text-muted">
                    <Loader2 size={15} className="animate-spin" />
                    {STATUS_LABEL[currentStatus] ?? 'Aguardando pagamento'}…
                  </p>
                </div>
              ) : result.boleto ? (
                <div className="text-center">
                  <p className="text-sm">
                    Boleto gerado. Ele compensa em até 3 dias úteis.
                  </p>
                  {result.boleto.barcode && (
                    <code className="mt-4 block bg-surface p-3 text-xs break-all">
                      {result.boleto.barcode}
                    </code>
                  )}
                  {result.boleto.url && (
                    <a
                      href={result.boleto.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary mt-5 w-full py-4 text-sm tracking-wide uppercase"
                    >
                      Abrir boleto <ExternalLink size={15} />
                    </a>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <p className="font-display text-lg font-800 uppercase">
                    {STATUS_LABEL[currentStatus] ?? 'Pagamento em análise'}
                  </p>
                  <p className="mt-2 text-sm text-muted">{result.statusDetail}</p>
                  <button
                    type="button"
                    onClick={reset}
                    className="btn btn-outline mt-6 w-full py-3.5 text-sm tracking-wide uppercase"
                  >
                    Tentar outro método
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* ---------- formulário ---------- */
            <form onSubmit={submit} className="mt-6">
              <div className="grid grid-cols-3 gap-2">
                {METHODS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.id)}
                    aria-pressed={method === m.id}
                    className={`border px-2 py-3 text-center transition-colors ${
                      method === m.id
                        ? 'border-ink bg-ink text-paper'
                        : 'border-line hover:border-ink'
                    }`}
                  >
                    <span className="block text-sm font-bold uppercase">{m.label}</span>
                    <span
                      className={`mt-0.5 block text-[10px] ${
                        method === m.id ? 'text-paper/70' : 'text-muted'
                      }`}
                    >
                      {m.hint}
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
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
                  name="cpf"
                  label="CPF"
                  required
                  inputMode="numeric"
                  placeholder="000.000.000-00"
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
                  {/* Se método não for boleto, a gente ainda precisa coletar endereço de entrega. Para simplificar, num e-commerce real coletaríamos todo o endereço aqui. Por hora, coletamos Rua, Nº etc se tiver CEP. */}
                  {shippingCep.replace(/\\D/g, '').length === 8 && (
                    <>
                      <Field name="street" label="Rua" required className="sm:col-span-3" />
                      <Field name="number" label="Nº" required className="sm:col-span-1" />
                      <Field name="neighborhood" label="Bairro" required className="sm:col-span-2" />
                      <Field name="city" label="Cidade" required className="sm:col-span-3" />
                      <Field name="state" label="UF" required maxLength={2} className="sm:col-span-1" />
                    </>
                  )}
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
                    {shippingOptions.map(opt => {
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

              {method === 'card' && (
                <div className="mt-6">
                  {mp.error ? (
                    <p className="bg-surface p-3 text-sm text-danger">{mp.error}</p>
                  ) : (
                    <>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <SecureField id="mp-card-number" label="Número do cartão" className="sm:col-span-2" />
                        <SecureField id="mp-card-expiry" label="Validade" />
                        <SecureField id="mp-card-cvv" label="CVV" />
                      </div>

                      <label className="mt-5 block">
                        <span className="text-xs tracking-widest text-muted uppercase">
                          Parcelas
                        </span>
                        <select
                          value={installments}
                          onChange={(e) => setInstallments(Number(e.target.value))}
                          className="mt-1.5 w-full border-b border-ink bg-transparent py-2.5 text-sm"
                        >
                          {mp.installmentOptions.length > 0 ? (
                            mp.installmentOptions.map((p) => (
                              <option key={p.installments} value={p.installments}>
                                {p.recommended_message}
                              </option>
                            ))
                          ) : (
                            <option value={1}>1x de {formatPrice(total)}</option>
                          )}
                        </select>
                      </label>

                      {!mp.ready && (
                        <p className="mt-3 flex items-center gap-2 text-xs text-muted">
                          <Loader2 size={13} className="animate-spin" />
                          Carregando campos seguros do Mercado Pago…
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

              {method === 'boleto' && (
                <div className="mt-6 border-t border-line pt-6">
                  <p className="text-xs tracking-widest text-muted uppercase">Informações do Boleto</p>
                  <p className="text-[11px] text-muted mt-1">
                    Os dados de endereço acima já serão utilizados para a emissão do boleto.
                  </p>
                </div>
              )}

              {error && <p className="mt-5 bg-surface p-3 text-sm text-danger">{error}</p>}

              <button
                type="submit"
                disabled={submitting || (method === 'card' && !mp.ready) || !selectedShippingMethod}
                className="btn btn-primary mt-7 w-full py-4 text-sm tracking-wide uppercase disabled:opacity-50"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {submitting ? 'Processando…' : `Pagar ${formatPrice(total)}`}
              </button>

              <p className="mt-3 text-center text-[11px] text-muted">
                Pagamento processado pelo Mercado Pago. Não guardamos dados do
                seu cartão.
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
  inputMode?: 'text' | 'numeric';
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

/** Contêiner do iframe do Mercado Pago — o SDK monta o campo aqui dentro. */
function SecureField({
  id,
  label,
  className = '',
}: {
  id: string;
  label: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <span className="text-xs tracking-widest text-muted uppercase">{label}</span>
      <div id={id} className="mt-1.5 h-10 border-b border-ink" />
    </div>
  );
}
