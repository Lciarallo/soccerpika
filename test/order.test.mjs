/**
 * Testes da camada de servidor contra um Postgres de verdade.
 *
 * Cobre o que erra caro: quanto se cobra, quem pode o quê, e se o estoque
 * aguenta duas compras simultâneas da mesma peça única.
 *
 *   DATABASE_URL=postgres://... npm test
 *
 * Sem DATABASE_URL, os testes são pulados (não falham) — assim o CI de front
 * não quebra por falta de banco.
 */

import { build } from 'esbuild';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Dentro do projeto: os módulos externos (postgres) precisam resolver a
// partir de node_modules, o que não acontece se o bundle for para /tmp.
const OUT = join(ROOT, 'node_modules/.cache/spk-test');
mkdirSync(OUT, { recursive: true });

if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
  console.log('DATABASE_URL não definida — testes de banco pulados.');
  process.exit(0);
}

process.env.SESSION_SECRET ??= 'segredo-de-teste-com-mais-de-32-caracteres';

/** Compila um módulo TS do projeto e importa o resultado. */
async function load(entry) {
  const out = await build({
    entryPoints: [join(ROOT, entry)],
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
    logLevel: 'silent',
    external: ['postgres', '@vercel/blob'],
  });
  const file = join(OUT, `${entry.replace(/[^a-z0-9]+/gi, '-')}.mjs`);
  writeFileSync(file, out.outputFiles[0].text);
  return import(pathToFileURL(file).href);
}

const { buildOrder, normalizeCpf, requireEmail, OrderError } = await load('api/_lib/order.ts');
const { hashPassword, verifyPassword, assertStrongPassword, AuthError } =
  await load('api/_lib/auth.ts');
const { sql } = await load('api/_lib/db.ts');
const { decrementStock } = await load('api/_lib/products.ts');

let pass = 0;
let fail = 0;

const ok = async (label, fn) => {
  try {
    await fn();
    pass++;
    console.log('  ok  ', label);
  } catch (e) {
    fail++;
    console.log('  FAIL', label, '->', e.message);
  }
};

const rejects = async (label, fn, match) => {
  try {
    await fn();
    fail++;
    console.log('  FAIL', label, '-> não lançou erro');
  } catch (e) {
    if (!(e instanceof OrderError) && !(e instanceof AuthError)) {
      fail++;
      console.log('  FAIL', label, '-> erro inesperado:', e.message);
    } else if (match && !e.message.includes(match)) {
      fail++;
      console.log('  FAIL', label, `-> "${e.message}" não contém "${match}"`);
    } else {
      pass++;
      console.log('  ok  ', label);
    }
  }
};

// Pega produtos reais do banco em vez de fixar ids no teste.
const [inStock] = await sql`
  SELECT id, name, price_cents, stock_qty, sizes FROM products
  WHERE stock_qty > 0 ORDER BY price_cents DESC LIMIT 1
`;
const [soldOut] = await sql`
  SELECT id, name FROM products WHERE stock_qty = 0 LIMIT 1
`;

if (!inStock || !soldOut) {
  console.error('banco sem dados — rode `npm run db:seed` antes.');
  process.exit(1);
}

const expectedPrice = inStock.price_cents / 100;

console.log('\nbuildOrder');
await ok('calcula o total a partir do banco', async () => {
  const { total } = await buildOrder([{ id: inStock.id, quantity: 1 }]);
  if (total !== expectedPrice) throw new Error(`total ${total} != ${expectedPrice}`);
});

await ok('ignora o preço enviado pelo cliente', async () => {
  const { total } = await buildOrder([
    { id: inStock.id, quantity: 1, price: 1, unitPrice: 1, total: 1 },
  ]);
  if (total !== expectedPrice) throw new Error(`cliente forjou o preço: ${total}`);
});

await rejects('rejeita carrinho vazio', () => buildOrder([]), 'vazio');
await rejects('rejeita id inexistente', () =>
  buildOrder([{ id: '00000000-0000-0000-0000-000000000000', quantity: 1 }]),
);
await rejects('rejeita produto esgotado', () =>
  buildOrder([{ id: soldOut.id, quantity: 1 }]), 'esgotado',
);
await rejects('rejeita quantidade acima do estoque', () =>
  buildOrder([{ id: inStock.id, quantity: 999 }]), 'unidade',
);
await rejects('rejeita quantidade zero', () => buildOrder([{ id: inStock.id, quantity: 0 }]));
await rejects('rejeita quantidade fracionada', () =>
  buildOrder([{ id: inStock.id, quantity: 1.5 }]),
);
await rejects('rejeita itens demais', () =>
  buildOrder(Array.from({ length: 51 }, () => ({ id: inStock.id, quantity: 1 }))),
);

if (inStock.sizes?.length) {
  await rejects('rejeita tamanho indisponível', () =>
    buildOrder([{ id: inStock.id, quantity: 1, size: 'XPTO' }]), 'Tamanho',
  );
}

console.log('\nestoque');
await ok('não vende a mesma peça única duas vezes', async () => {
  const [p] = await sql`
    INSERT INTO products (slug, name, price_cents, stock_qty)
    VALUES (${'teste-corrida-' + Date.now()}, 'Peça de teste', 10000, 1)
    RETURNING id
  `;
  const line = [{ productId: p.id, quantity: 1 }];
  const [a, b] = await Promise.all([decrementStock(line), decrementStock(line)]);

  const [{ stock_qty }] = await sql`SELECT stock_qty FROM products WHERE id = ${p.id}`;
  await sql`DELETE FROM products WHERE id = ${p.id}`;

  if (a && b) throw new Error('as duas compras passaram — houve venda dupla');
  if (stock_qty !== 0) throw new Error(`estoque final ${stock_qty}, esperado 0`);
});

console.log('\nsenha');
await ok('hash confere com a senha certa', async () => {
  const h = await hashPassword('uma-senha-boa-123');
  if (!(await verifyPassword('uma-senha-boa-123', h))) throw new Error('não conferiu');
});
await ok('hash rejeita senha errada', async () => {
  const h = await hashPassword('uma-senha-boa-123');
  if (await verifyPassword('outra-senha', h)) throw new Error('aceitou senha errada');
});
await ok('sal é aleatório: mesma senha, hashes diferentes', async () => {
  const [a, b] = [await hashPassword('mesma-senha-1'), await hashPassword('mesma-senha-1')];
  if (a === b) throw new Error('hashes idênticos — sal não está variando');
});
await rejects('rejeita senha curta', () => assertStrongPassword('curta'));
await rejects('rejeita senha óbvia', () => assertStrongPassword('12345678'));

console.log('\nCPF e e-mail');
await ok('aceita CPF válido', () => {
  if (normalizeCpf('529.982.247-25') !== '52998224725') throw new Error('não normalizou');
});
await rejects('rejeita dígito verificador errado', () => normalizeCpf('529.982.247-26'));
await rejects('rejeita dígitos repetidos', () => normalizeCpf('111.111.111-11'));
await ok('normaliza e-mail', () => {
  if (requireEmail(' Luiz@Exemplo.COM ') !== 'luiz@exemplo.com') throw new Error('não normalizou');
});
await rejects('rejeita e-mail sem @', () => requireEmail('invalido'));

await sql.end();

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail ? 1 : 0);
