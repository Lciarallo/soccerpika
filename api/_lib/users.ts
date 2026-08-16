/** Repositório de contas — só o que o painel administrativo precisa. */

import { sql } from './db.js';

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: string;
  orderCount: number;
}

export async function listUsersAdmin(): Promise<AdminUserRow[]> {
  const rows = await sql<
    { id: string; name: string; email: string; role: 'user' | 'admin'; created_at: Date; order_count: string }[]
  >`
    SELECT u.id, u.name, u.email, u.role, u.created_at,
      COALESCE((SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id), 0) AS order_count
    FROM users u
    ORDER BY u.created_at DESC
    LIMIT 500
  `;
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    role: r.role,
    createdAt: new Date(r.created_at).toISOString(),
    orderCount: Number(r.order_count),
  }));
}

/**
 * Promove ou rebaixa uma conta. Recusa deixar a loja sem nenhum admin — sem
 * isso, um rebaixamento acidental do último trancaria o próprio painel.
 */
export async function updateUserRole(
  userId: string,
  role: 'user' | 'admin',
): Promise<'ok' | 'not-found' | 'last-admin'> {
  if (role === 'user') {
    const [{ count }] = await sql<{ count: string }[]>`
      SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND id != ${userId}
    `;
    if (Number(count) === 0) {
      const [target] = await sql<{ role: string }[]>`SELECT role FROM users WHERE id = ${userId}`;
      if (target?.role === 'admin') return 'last-admin';
    }
  }

  const rows = await sql`UPDATE users SET role = ${role} WHERE id = ${userId} RETURNING id`;
  return rows.length > 0 ? 'ok' : 'not-found';
}
