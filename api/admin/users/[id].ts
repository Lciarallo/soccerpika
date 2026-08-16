/** PUT /api/admin/users/:id — promove ou rebaixa uma conta entre `user` e `admin`. */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin, sendAuthError } from '../../_lib/auth.js';
import { updateUserRole } from '../../_lib/users.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', 'PUT');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const id = String(req.query.id ?? '');
  if (!UUID.test(id)) {
    return res.status(400).json({ error: 'Id de usuário inválido.' });
  }

  try {
    const admin = await requireAdmin(req);
    const body = (req.body ?? {}) as { role?: string };
    if (body.role !== 'user' && body.role !== 'admin') {
      return res.status(400).json({ error: 'Papel inválido.' });
    }
    if (id === admin.id && body.role === 'user') {
      return res.status(400).json({ error: 'Você não pode rebaixar a própria conta.' });
    }

    const result = await updateUserRole(id, body.role);
    if (result === 'not-found') return res.status(404).json({ error: 'Usuário não encontrado.' });
    if (result === 'last-admin') {
      return res.status(409).json({ error: 'A loja precisa de pelo menos um administrador.' });
    }
    return res.status(200).json({ ok: true });
  } catch (error) {
    if (sendAuthError(res, error)) return;
    console.error('admin/users/[id]', error);
    return res.status(500).json({ error: 'Não foi possível atualizar o usuário.' });
  }
}
