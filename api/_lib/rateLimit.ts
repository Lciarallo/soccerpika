/**
 * Limite de taxa em janela deslizante, guardado no Postgres.
 *
 * Sem estado local: em serverless cada invocação pode cair numa instância
 * fria diferente, então um contador em memória não protegeria nada. O banco
 * já está aberto para cada request, então uma linha por chave resolve sem
 * infraestrutura extra.
 */

import type { VercelRequest } from '@vercel/node';
import { AuthError } from './auth.js';
import { sql } from './db.js';

/** IP do cliente, considerando o proxy da Vercel. */
export function clientIp(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const fromHeader = first?.split(',')[0]?.trim();
  return fromHeader || req.socket?.remoteAddress || 'desconhecido';
}

/**
 * Incrementa a contagem de `key` e recusa quando `max` é ultrapassado dentro
 * de `windowSeconds`. Uma única instrução UPSERT: a linha por chave evita
 * corrida entre invocações concorrentes.
 */
export async function enforceRateLimit(
  key: string,
  { max, windowSeconds }: { max: number; windowSeconds: number },
): Promise<void> {
  const [row] = await sql<{ count: number }[]>`
    INSERT INTO rate_limits (key, count, window_start)
    VALUES (${key}, 1, now())
    ON CONFLICT (key) DO UPDATE SET
      count = CASE
        WHEN rate_limits.window_start < now() - (${windowSeconds} * interval '1 second')
        THEN 1 ELSE rate_limits.count + 1
      END,
      window_start = CASE
        WHEN rate_limits.window_start < now() - (${windowSeconds} * interval '1 second')
        THEN now() ELSE rate_limits.window_start
      END
    RETURNING count
  `;

  // Limpeza oportunista: sem cron dedicado, uma fração dos requests varre o
  // que já expirou há muito para a tabela não crescer para sempre.
  if (Math.random() < 0.01) {
    await sql`DELETE FROM rate_limits WHERE window_start < now() - interval '1 day'`;
  }

  if (row.count > max) {
    throw new AuthError('Muitas tentativas. Aguarde um pouco antes de tentar de novo.', 429);
  }
}
