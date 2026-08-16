/** GET /api/admin/users — contas cadastradas, para o painel administrativo. */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin, sendAuthError } from '../_lib/auth.js';
import { listUsersAdmin } from '../_lib/users.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  try {
    await requireAdmin(req);
    const users = await listUsersAdmin();
    return res.status(200).json({ users });
  } catch (error) {
    if (sendAuthError(res, error)) return;
    console.error('admin/users', error);
    return res.status(500).json({ error: 'Não foi possível carregar os usuários.' });
  }
}
