/**
 * Popula o banco com o catálogo capturado da loja e cria o admin inicial.
 *
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run db:seed
 *
 * Idempotente: produtos são inseridos por slug (upsert) e o admin só é criado
 * se ainda não existir. Rodar de novo não duplica nada.
 */

import { randomBytes, scrypt as scryptCb } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import postgres from 'postgres';

const scrypt = promisify(scryptCb);
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');

const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
if (!url) {
  console.error('DATABASE_URL não definida.');
  process.exit(1);
}

// Mesmo formato de api/_lib/auth.ts — mantenha os dois em sincronia.
async function hashPassword(password) {
  const N = 32768;
  const r = 8;
  const p = 1;
  const salt = randomBytes(16);
  // 128 * N * r = 32 MB, exatamente o teto padrão do Node — precisa ser elevado.
  const derived = await scrypt(password, salt, 64, { N, r, p, maxmem: 64 * 1024 * 1024 });
  return ['scrypt', N, r, p, salt.toString('base64'), derived.toString('base64')].join('$');
}

/** Lê o catálogo do arquivo gerado pelo scraper. */
function readCatalog() {
  const src = readFileSync(join(ROOT, 'src/data/jerseys.ts'), 'utf8');
  return JSON.parse(src.slice(src.indexOf('= [') + 2, src.lastIndexOf(']') + 1));
}

const sql = postgres(url, { max: 1, onnotice: () => {} });

try {
  // ---------------------------------------------------------- produtos ---
  const catalog = readCatalog();

  for (const j of catalog) {
    const [row] = await sql`
      INSERT INTO products (
        slug, name, club, season, era, category, subcategory, brand, description,
        price_cents, stock_qty, sizes, is_match_worn, is_autographed,
        is_published, source_url
      ) VALUES (
        ${j.id}, ${j.name}, ${j.club ?? ''}, ${j.season ?? ''},
        ${j.era ?? 'Sem data'}, ${j.category ?? 'Outros'}, ${j.subcategory ?? ''},
        ${j.brand ?? ''},
        ${j.description ?? ''}, ${Math.round(j.price * 100)},
        ${j.stockQty ?? 0}, ${j.sizes ?? []},
        ${Boolean(j.isMatchWorn)}, ${Boolean(j.isAutographed)},
        true, ${j.sourceUrl ?? null}
      )
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name, price_cents = EXCLUDED.price_cents,
        category = EXCLUDED.category, subcategory = EXCLUDED.subcategory,
        stock_qty = EXCLUDED.stock_qty, description = EXCLUDED.description,
        brand = EXCLUDED.brand, sizes = EXCLUDED.sizes
      RETURNING id
    `;

    await sql`DELETE FROM product_images WHERE product_id = ${row.id}`;
    const images = j.images ?? [];
    if (images.length) {
      await sql`
        INSERT INTO product_images ${sql(
          images.map((url, position) => ({ product_id: row.id, url, position })),
          'product_id',
          'url',
          'position',
        )}
      `;
    }
  }
  console.log(`${catalog.length} produtos no catálogo`);

  // ------------------------------------------------------------- admin ---
  const email = (process.env.ADMIN_EMAIL ?? '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? '';

  if (!email || !password) {
    console.log('ADMIN_EMAIL/ADMIN_PASSWORD não definidos — admin não criado.');
  } else if (password.length < 8) {
    console.error('ADMIN_PASSWORD precisa de pelo menos 8 caracteres.');
    process.exitCode = 1;
  } else {
    const [existing] = await sql`SELECT id, role FROM users WHERE lower(email) = ${email}`;
    if (existing) {
      // Não sobrescreve senha de conta existente; só garante o papel.
      await sql`UPDATE users SET role = 'admin' WHERE id = ${existing.id}`;
      console.log(`admin: ${email} (já existia, papel garantido)`);
    } else {
      await sql`
        INSERT INTO users (email, password_hash, name, role)
        VALUES (${email}, ${await hashPassword(password)}, 'Administração', 'admin')
      `;
      console.log(`admin criado: ${email}`);
    }
  }
} catch (error) {
  console.error('falha no seed:', error.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
