/** POST /api/auth/login — troca e-mail e senha por um cookie de sessão. */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  AuthError,
  sendAuthError,
  setSessionCookie,
  verifyPassword,
} from '../_lib/auth.js';
import { sql } from '../_lib/db.js';

/**
 * Hash descartável usado quando o e-mail não existe. Mantém o tempo de
 * resposta parecido com o de uma senha errada, então a latência não revela
 * quais e-mails têm conta.
 */
const DUMMY_HASH =
  'scrypt$32768$8$1$YWFhYWFhYWFhYWFhYWFhYQ==$' +
  'Y2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2M=';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');

    if (!email || !password) {
      throw new AuthError('Informe e-mail e senha.', 400);
    }

    const [user] = await sql<
      { id: string; email: string; name: string; role: 'user' | 'admin'; password_hash: string }[]
    >`
      SELECT id, email, name, role, password_hash
      FROM users WHERE lower(email) = ${email}
    `;

    const valid = await verifyPassword(password, user?.password_hash ?? DUMMY_HASH);

    // Mesma mensagem para e-mail inexistente e senha errada.
    if (!user || !valid) {
      throw new AuthError('E-mail ou senha incorretos.');
    }

    setSessionCookie(res, user);
    return res.status(200).json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (error) {
    if (sendAuthError(res, error)) return;
    console.error('login', error);
    return res.status(500).json({ error: 'Não foi possível entrar.' });
  }
}
