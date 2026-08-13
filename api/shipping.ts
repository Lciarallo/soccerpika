import type { VercelRequest, VercelResponse } from '@vercel/node';
import { calculateShipping } from './_lib/shipping.js';
import { clientIp, enforceRateLimit } from './_lib/rateLimit.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  try {
    // Evita abuso da API de cálculo de frete
    await enforceRateLimit(`shipping:ip:${clientIp(req)}`, { max: 30, windowSeconds: 60 });

    const cep = String(req.query.cep ?? '');
    const itemsParam = String(req.query.items ?? '');

    if (!cep || cep.replace(/\D/g, '').length !== 8) {
      return res.status(400).json({ error: 'CEP inválido.' });
    }

    const items = itemsParam.split(',').map(i => {
      const [id, qty] = i.split(':');
      return { id, quantity: Number(qty) };
    }).filter(i => i.id && !isNaN(i.quantity) && i.quantity > 0);

    if (items.length === 0) {
      return res.status(400).json({ error: 'Nenhum item válido informado.' });
    }

    const options = await calculateShipping(cep, items);
    
    return res.status(200).json(options);
  } catch (error) {
    console.error('Erro ao calcular frete:', error);
    return res.status(500).json({ error: 'Erro ao calcular o frete.' });
  }
}
