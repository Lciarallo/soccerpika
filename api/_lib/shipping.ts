import { calcularPrecoPrazo } from 'correios-brasil';
import { sql } from './db.js';

export interface ShippingOption {
  method: string;
  priceCents: number;
  deliveryDays: number;
}

export async function calculateShipping(
  cepDestino: string, 
  items: { id: string; quantity: number }[]
): Promise<ShippingOption[]> {
  const originCep = process.env.CORREIOS_ORIGIN_CEP || '01001000'; // Default Sé, SP se não definido
  
  // Buscar os produtos no banco para somar os pesos e verificar frete grátis
  const itemIds = items.map(i => i.id);
  const products = await sql<{ id: string, weight_grams: number, is_free_shipping: boolean }[]>`
    SELECT id, weight_grams, is_free_shipping FROM products WHERE id = ANY(${itemIds})
  `;

  let totalWeightGrams = 0;
  let hasFreeShippingItem = false;

  for (const item of items) {
    const product = products.find(p => p.id === item.id);
    if (product) {
      totalWeightGrams += (product.weight_grams ?? 300) * item.quantity;
      if (product.is_free_shipping) {
        hasFreeShippingItem = true;
      }
    }
  }

  // O peso no Correios é em kg.
  const totalWeightKg = Math.max(0.3, totalWeightGrams / 1000);

  const cleanCep = cepDestino.replace(/\D/g, '');
  // Regra SP: CEP iniciando em 0 ou 1 é do estado de São Paulo
  const isSp = cleanCep.startsWith('0') || cleanCep.startsWith('1');
  
  const isFree = isSp || hasFreeShippingItem;

  try {
    const fetchCorreios = calcularPrecoPrazo({
      sCepOrigem: originCep,
      sCepDestino: cleanCep,
      nVlPeso: totalWeightKg.toString(),
      nCdFormato: '1', // 1: caixa/pacote
      nVlComprimento: '20', // mínimo
      nVlAltura: '15', // mínimo
      nVlLargura: '20', // mínimo
      nCdServico: ['03298', '03220'], // PAC (03298) e SEDEX (03220)
      nVlDiametro: '0',
    });

    // Timeout de 4 segundos
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Correios timeout')), 4000)
    );

    const results = await Promise.race([fetchCorreios, timeoutPromise]) as any[];

    const options: ShippingOption[] = [];

    for (const res of results) {
      if (res.Erro !== '0' && res.Erro !== '') {
        console.warn(`Erro nos Correios (Serviço ${res.Codigo}):`, res.MsgErro);
        continue;
      }
      
      const isSedex = res.Codigo === '03220';
      const isPac = res.Codigo === '03298';
      
      let priceCents = 0;
      let methodLabel = '';

      if (isPac) {
        methodLabel = isFree ? 'pac (Grátis)' : 'pac';
        if (!isFree) {
          const priceRaw = res.Valor.replace('.', '').replace(',', '.');
          priceCents = Math.round(parseFloat(priceRaw) * 100);
        }
      } else if (isSedex) {
        methodLabel = 'sedex';
        const priceRaw = res.Valor.replace('.', '').replace(',', '.');
        priceCents = Math.round(parseFloat(priceRaw) * 100);
      } else {
        continue;
      }
      
      const deliveryDays = parseInt(res.PrazoEntrega, 10);

      options.push({
        method: methodLabel,
        priceCents,
        deliveryDays,
      });
    }
    
    // Fallback caso a API dos Correios não retorne nada válido
    if (options.length === 0) {
      return getFallbackShippingOptions(isFree);
    }

    return options;
  } catch (error) {
    console.error('Falha ao consultar API dos Correios:', error);
    // Retorna fallback se a API estiver fora do ar ou der timeout
    return getFallbackShippingOptions(isFree);
  }
}

function getFallbackShippingOptions(isFree: boolean): ShippingOption[] {
  return [
    { method: isFree ? 'pac (Grátis)' : 'pac', priceCents: isFree ? 0 : 2500, deliveryDays: 10 },
    { method: 'sedex', priceCents: 4500, deliveryDays: 4 }
  ];
}
