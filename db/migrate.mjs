/**
 * Aplica db/schema.sql no banco de DATABASE_URL.
 * O schema é idempotente, então rodar de novo é seguro.
 *
 *   npm run db:migrate
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const HERE = dirname(fileURLToPath(import.meta.url));
const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

if (!url) {
  console.error('DATABASE_URL não definida.');
  process.exit(1);
}

const sql = postgres(url, { max: 1, onnotice: () => {} });

try {
  await sql.unsafe(readFileSync(join(HERE, 'schema.sql'), 'utf8'));
  const [{ count }] = await sql`
    SELECT count(*)::int FROM information_schema.tables WHERE table_schema = 'public'
  `;
  console.log(`schema aplicado — ${count} tabelas em public`);
} catch (error) {
  console.error('falha ao migrar:', error.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
