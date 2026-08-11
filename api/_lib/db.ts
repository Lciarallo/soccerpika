/**
 * Conexão com o Postgres (Neon em produção, container local em dev).
 *
 * Usamos `postgres` com template tags: tudo interpolado vira parâmetro
 * preparado, então concatenar valor em SQL por acidente deixa de ser possível.
 */

import postgres from 'postgres';

declare global {
  // eslint-disable-next-line no-var
  var __spkSql: ReturnType<typeof postgres> | undefined;
}

function connectionString(): string {
  const url =
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.NEON_DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL não configurada.');
  }
  return url;
}

/**
 * Uma instância por processo. Em serverless o módulo é reaproveitado entre
 * invocações, então guardamos no global para não abrir pool a cada request.
 */
export const sql =
  globalThis.__spkSql ??
  (globalThis.__spkSql = postgres(connectionString(), {
    // O pooler do Neon já multiplexa; poucas conexões por instância bastam.
    max: 3,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  }));

/** Converte centavos do banco para reais na borda da aplicação. */
export const toReais = (cents: number) => cents / 100;

/** Converte reais para centavos, arredondando de forma previsível. */
export const toCents = (reais: number) => Math.round(reais * 100);
