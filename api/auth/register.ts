/** POST /api/auth/register — cria uma conta de cliente e já autentica. */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  assertStrongPassword,
  AuthError,
  hashPassword,
  sendAuthError,
  setSessionCookie,
} from '../_lib/auth';
import { sql } from '../_lib/db';
import { OrderError, requireEmail, requireName } from '../_lib/order';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const email = requireEmail(body.email);
    const name = requireName(body.name, 'Nome');
    const password = assertStrongPassword(body.password);

    const [existing] = await sql`SELECT 1 FROM users WHERE lower(email) = ${email}`;
    if (existing) {
      throw new AuthError('Já existe uma conta com esse e-mail.', 409);
    }

    const passwordHash = await hashPassword(password);

    // O papel nunca vem do cliente: conta nova é sempre 'user'.
    const [user] = await sql<{ id: string; role: 'user' | 'admin' }[]>`
      INSERT INTO users (email, password_hash, name, role)
      VALUES (${email}, ${passwordHash}, ${name}, 'user')
      RETURNING id, role
    `;

    setSessionCookie(res, user);
    return res.status(201).json({ user: { id: user.id, email, name, role: user.role } });
  } catch (error) {
    if (sendAuthError(res, error)) return;
    if (error instanceof OrderError) {
      return res.status(400).json({ error: error.message });
    }
    console.error('register', error);
    return res.status(500).json({ error: 'Não foi possível criar a conta.' });
  }
}
