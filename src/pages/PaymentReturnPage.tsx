import { useEffect, useState } from 'react';
import { Check, Loader2, ShoppingBag, TriangleAlert } from 'lucide-react';
import { syncPayment, fetchPaymentStatus, isApproved, STATUS_LABEL } from '../lib/checkout';

/**
 * `/pagamento/retorno` — para onde a InfinitePay manda o cliente depois do
 * Pix. A confirmação de verdade já pode ter chegado pelo webhook nesse meio
 * tempo; aqui só tentamos acelerar isso e mostrar o resultado.
 */
export function PaymentReturnPage({ onExit }: { onExit: () => void }) {
  const [status, setStatus] = useState<string>('pending');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('orderId') ?? params.get('order_nsu') ?? '';
    if (!orderId) {
      setChecking(false);
      return;
    }

    let stop = false;
    let attempts = 0;

    const tick = async () => {
      attempts += 1;
      try {
        const coords = {
          transactionNsu: params.get('transaction_nsu') ?? undefined,
          slug: params.get('slug') ?? undefined,
        };
        const synced = await syncPayment(orderId, coords);
        if (stop) return;
        setStatus(synced.status);
        if (synced.paid || attempts >= 6) {
          setChecking(false);
          return;
        }
      } catch {
        // segue tentando
      }
      if (!stop) window.setTimeout(tick, 4000);
    };

    // Primeira leitura imediata do status atual, enquanto a confirmação roda.
    fetchPaymentStatus(orderId).then((s) => !stop && setStatus(s.status));
    void tick();

    return () => {
      stop = true;
    };
  }, []);

  const approved = isApproved(status);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      {checking && !approved ? (
        <>
          <Loader2 size={40} className="animate-spin text-brand" strokeWidth={1.5} />
          <div>
            <h1 className="font-display text-2xl font-900 uppercase">Confirmando pagamento</h1>
            <p className="mt-2 max-w-sm text-sm text-muted">
              Estamos verificando o Pix na InfinitePay. Isso leva só alguns segundos.
            </p>
          </div>
        </>
      ) : approved ? (
        <>
          <Check size={48} className="text-success" strokeWidth={1.5} />
          <div>
            <h1 className="font-display text-2xl font-900 uppercase">Pagamento aprovado</h1>
            <p className="mt-2 max-w-sm text-sm text-muted">
              Recebemos seu Pix. Enviamos os detalhes do envio por e-mail.
            </p>
          </div>
        </>
      ) : (
        <>
          <TriangleAlert size={40} className="text-brand" strokeWidth={1.5} />
          <div>
            <h1 className="font-display text-2xl font-900 uppercase">
              {STATUS_LABEL[status] ?? 'Pagamento pendente'}
            </h1>
            <p className="mt-2 max-w-sm text-sm text-muted">
              Se você concluiu o Pix, a confirmação pode levar mais alguns instantes.
              Acompanhe pela sua Área do Cliente.
            </p>
          </div>
        </>
      )}

      <button onClick={onExit} className="btn btn-primary mt-4 inline-flex items-center gap-2 px-6 py-3 text-sm uppercase tracking-wide">
        <ShoppingBag size={16} />
        Voltar à loja
      </button>
    </div>
  );
}
