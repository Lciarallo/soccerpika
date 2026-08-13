import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { FREE_SHIPPING_THRESHOLD_CENTS, isValidCEP } from './domain.js';

export interface ShippingOption {
  id: 'pac' | 'sedex' | 'free';
  name: string;
  priceInCents: number;
  deliveryDays: number;
  description: string;
}

export function computeShippingOptions(
  cep: string,
  subtotalInCents: number,
): ShippingOption[] {
  const cleanCep = cep.replace(/\D/g, '');
  if (!isValidCEP(cleanCep)) {
    throw new HttpsError('invalid-argument', 'CEP inválido.');
  }

  const statePrefix = cleanCep.substring(0, 2);
  const prefixNum = parseInt(statePrefix, 10);

  // Estimativa regional baseada no CEP
  let pacBase = 2890; // R$ 28.90
  let sedexBase = 4990; // R$ 49.90
  let pacDays = 7;
  let sedexDays = 3;

  if (prefixNum >= 90 && prefixNum <= 99) {
    // Rio Grande do Sul (Origem)
    pacBase = 1890;
    sedexBase = 2990;
    pacDays = 3;
    sedexDays = 1;
  } else if (prefixNum >= 80 && prefixNum <= 89) {
    // Sul (PR / SC)
    pacBase = 2390;
    sedexBase = 3890;
    pacDays = 5;
    sedexDays = 2;
  } else if (prefixNum >= 1 && prefixNum <= 39) {
    // Sudeste (SP / RJ / MG / ES)
    pacBase = 2690;
    sedexBase = 4490;
    pacDays = 6;
    sedexDays = 2;
  } else if (prefixNum >= 40 && prefixNum <= 79) {
    // Centro-Oeste / Nordeste
    pacBase = 3690;
    sedexBase = 6290;
    pacDays = 9;
    sedexDays = 3;
  } else {
    // Norte
    pacBase = 4890;
    sedexBase = 7990;
    pacDays = 12;
    sedexDays = 4;
  }

  const options: ShippingOption[] = [];

  if (subtotalInCents >= FREE_SHIPPING_THRESHOLD_CENTS) {
    options.push({
      id: 'free',
      name: 'Frete Grátis (PAC)',
      priceInCents: 0,
      deliveryDays: pacDays,
      description: `Entrega em até ${pacDays} dias úteis`,
    });
  } else {
    options.push({
      id: 'pac',
      name: 'Correios PAC',
      priceInCents: pacBase,
      deliveryDays: pacDays,
      description: `Entrega em até ${pacDays} dias úteis`,
    });
  }

  options.push({
    id: 'sedex',
    name: 'Correios SEDEX',
    priceInCents: sedexBase,
    deliveryDays: sedexDays,
    description: `Entrega em até ${sedexDays} dias úteis`,
  });

  return options;
}

export const calculateShipping = onCall({ cors: true }, (request) => {
  const { cep, subtotalInCents = 0 } = request.data ?? {};
  if (!cep) {
    throw new HttpsError('invalid-argument', 'O CEP é obrigatório.');
  }

  return {
    options: computeShippingOptions(cep, Number(subtotalInCents)),
  };
});
