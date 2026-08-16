/** GET /api/admin/dashboard?days=7|30|90 — indicadores do painel administrativo. */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin, sendAuthError } from '../_lib/auth.js';
import { buildDashboard } from '../_lib/adminStats.js';

const RANGES = new Set([7, 30, 90]);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  try {
    await requireAdmin(req);
    const days = Number(req.query.days ?? 30);
    const data = await buildDashboard(RANGES.has(days) ? days : 30);
    return res.status(200).json(data);
  } catch (error) {
    if (sendAuthError(res, error)) return;
    console.error('admin/dashboard', error);
    return res.status(500).json({ error: 'Não foi possível carregar o painel.' });
  }
}
