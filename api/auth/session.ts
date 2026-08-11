/**
 * GET  /api/auth/session — quem está logado (null se ninguém).
 * DELETE /api/auth/session — sai da conta.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { clearSessionCookie, currentUser, sendAuthError } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'DELETE') {
      clearSessionCookie(res);
      return res.status(200).json({ user: null });
    }

    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET, DELETE');
      return res.status(405).json({ error: 'Método não permitido.' });
    }

    const user = await currentUser(req);
    return res.status(200).json({ user });
  } catch (error) {
    if (sendAuthError(res, error)) return;
    console.error('session', error);
    return res.status(500).json({ error: 'Não foi possível ler a sessão.' });
  }
}
