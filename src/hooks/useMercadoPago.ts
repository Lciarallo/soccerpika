import { useEffect, useRef, useState } from 'react';

/**
 * Carrega o SDK v2 do Mercado Pago e monta os Secure Fields do cartão.
 *
 * Os dados do cartão ficam em iframes servidos pelo Mercado Pago — nunca
 * tocam no nosso JS nem no nosso servidor. O que sai daqui é um token de uso
 * único, que o backend usa para cobrar.
 */

const SDK_URL = 'https://sdk.mercadopago.com/js/v2';
const PUBLIC_KEY = import.meta.env.VITE_MP_PUBLIC_KEY as string | undefined;

interface SecureField {
  mount: (elementId: string) => SecureField;
  unmount: () => void;
  on: (event: string, handler: (data: { bin?: string }) => void) => SecureField;
}

interface MercadoPagoInstance {
  fields: {
    create: (type: string, options?: Record<string, unknown>) => SecureField;
    createCardToken: (data: Record<string, unknown>) => Promise<{ id: string }>;
  };
  getPaymentMethods: (opts: { bin: string }) => Promise<{
    results: { id: string; issuer?: { id: number }; payer_costs?: PayerCost[] }[];
  }>;
  getInstallments: (opts: {
    amount: string;
    bin: string;
    paymentTypeId: string;
  }) => Promise<{ payer_costs: PayerCost[] }[]>;
}

export interface PayerCost {
  installments: number;
  recommended_message: string;
  total_amount: number;
}

declare global {
  interface Window {
    MercadoPago?: new (key: string, opts?: { locale?: string }) => MercadoPagoInstance;
  }
}

let sdkPromise: Promise<void> | null = null;

function loadSdk(): Promise<void> {
  if (window.MercadoPago) return Promise.resolve();
  sdkPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      sdkPromise = null;
      reject(new Error('Não foi possível carregar o Mercado Pago.'));
    };
    document.head.appendChild(script);
  });
  return sdkPromise;
}

export interface UseMercadoPagoOptions {
  /** Só monta os campos quando a aba do cartão está aberta. */
  enabled: boolean;
  amount: number;
}

export function useMercadoPago({ enabled, amount }: UseMercadoPagoOptions) {
  const mpRef = useRef<MercadoPagoInstance | null>(null);
  const fieldsRef = useRef<SecureField[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [installmentOptions, setInstallmentOptions] = useState<PayerCost[]>([]);
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(null);
  const [issuerId, setIssuerId] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    if (!PUBLIC_KEY) {
      setError(
        'Pagamento com cartão indisponível: falta configurar VITE_MP_PUBLIC_KEY.',
      );
      return;
    }

    let cancelled = false;

    loadSdk()
      .then(() => {
        if (cancelled || !window.MercadoPago) return;

        const mp = new window.MercadoPago(PUBLIC_KEY, { locale: 'pt-BR' });
        mpRef.current = mp;

        const style = {
          height: '100%',
          fontSize: '14px',
          placeholderColor: '#6b6b73',
        };

        const number = mp.fields
          .create('cardNumber', { placeholder: '0000 0000 0000 0000', style })
          .mount('mp-card-number');
        const expiry = mp.fields
          .create('expirationDate', { placeholder: 'MM/AA', style })
          .mount('mp-card-expiry');
        const cvv = mp.fields
          .create('securityCode', { placeholder: 'CVV', style })
          .mount('mp-card-cvv');

        fieldsRef.current = [number, expiry, cvv];

        // O BIN (6 primeiros dígitos) revela bandeira, emissor e parcelamento.
        number.on('binChange', async ({ bin }) => {
          if (!bin || bin.length < 6) {
            setInstallmentOptions([]);
            setPaymentMethodId(null);
            return;
          }
          try {
            const methods = await mp.getPaymentMethods({ bin });
            const first = methods.results[0];
            if (!first) return;
            setPaymentMethodId(first.id);
            setIssuerId(first.issuer?.id ? String(first.issuer.id) : null);

            const plans = await mp.getInstallments({
              amount: String(amount),
              bin,
              paymentTypeId: 'credit_card',
            });
            setInstallmentOptions(plans[0]?.payer_costs ?? []);
          } catch {
            // Sem opções de parcelamento a UI cai para 1x, sem quebrar.
            setInstallmentOptions([]);
          }
        });

        setReady(true);
        setError(null);
      })
      .catch((e: Error) => !cancelled && setError(e.message));

    return () => {
      cancelled = true;
      fieldsRef.current.forEach((f) => {
        try {
          f.unmount();
        } catch {
          /* o campo já pode ter saído do DOM */
        }
      });
      fieldsRef.current = [];
      setReady(false);
    };
  }, [enabled, amount]);

  const createCardToken = async (cardholderName: string, cpf: string) => {
    if (!mpRef.current) throw new Error('Mercado Pago ainda não está pronto.');
    const { id } = await mpRef.current.fields.createCardToken({
      cardholderName,
      identificationType: 'CPF',
      identificationNumber: cpf.replace(/\D/g, ''),
    });
    return id;
  };

  return {
    ready,
    error,
    installmentOptions,
    paymentMethodId,
    issuerId,
    createCardToken,
    configured: Boolean(PUBLIC_KEY),
  };
}
