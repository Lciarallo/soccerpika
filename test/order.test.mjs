/**
 * Testes da validação de pedido — a camada que decide quanto cobrar.
 *
 * Compila api/_lib/order.ts com esbuild na hora, porque o projeto não tem
 * runner de TS. Rode com `npm test`.
 */

import { build } from 'esbuild';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const bundle = await build({
  entryPoints: [join(ROOT, 'api/_lib/order.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  logLevel: 'silent',
});

const file = join(mkdtempSync(join(tmpdir(), 'spk-test-')), 'order.mjs');
writeFileSync(file, bundle.outputFiles[0].text);

const { buildOrder, normalizeCpf, requireEmail, OrderError } = await import(
  pathToFileURL(file).href
);

let pass = 0;
let fail = 0;

const ok = (label, fn) => {
  try {
    fn();
    pass++;
    console.log('  ok  ', label);
  } catch (e) {
    fail++;
    console.log('  FAIL', label, '->', e.message);
  }
};

const throws = (label, fn, match) => {
  try {
    fn();
    fail++;
    console.log('  FAIL', label, '-> não lançou erro');
  } catch (e) {
    if (!(e instanceof OrderError)) {
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

const IN_STOCK = 'camisa-brasil-1995-96-n-17-de-jogo-fvbca';
const IN_STOCK_PRICE = 3249.99;
const SOLD_OUT = 'jaqueta-mundial-gremio-ajax-1995';

console.log('\nbuildOrder');
ok('calcula o total a partir do catálogo', () => {
  const { total, lines } = buildOrder([{ id: IN_STOCK, size: 'Único', quantity: 1 }]);
  if (total !== IN_STOCK_PRICE) throw new Error(`total ${total} != ${IN_STOCK_PRICE}`);
  if (lines[0].unitPrice !== IN_STOCK_PRICE) throw new Error('unitPrice errado');
});

ok('ignora o preço enviado pelo cliente', () => {
  const { total } = buildOrder([
    { id: IN_STOCK, size: 'Único', quantity: 1, price: 1, unitPrice: 1, total: 1 },
  ]);
  if (total !== IN_STOCK_PRICE) throw new Error(`cliente forjou o preço: ${total}`);
});

throws('rejeita carrinho vazio', () => buildOrder([]), 'vazio');
throws('rejeita id desconhecido', () => buildOrder([{ id: 'nao-existe', quantity: 1 }]));
throws('rejeita produto esgotado', () => buildOrder([{ id: SOLD_OUT, quantity: 1 }]), 'esgotado');
throws(
  'rejeita quantidade acima do estoque',
  () => buildOrder([{ id: IN_STOCK, quantity: 99 }]),
  'unidade',
);
throws('rejeita quantidade zero', () => buildOrder([{ id: IN_STOCK, quantity: 0 }]));
throws('rejeita quantidade negativa', () => buildOrder([{ id: IN_STOCK, quantity: -5 }]));
throws('rejeita quantidade fracionada', () => buildOrder([{ id: IN_STOCK, quantity: 1.5 }]));
throws('rejeita itens demais', () =>
  buildOrder(Array.from({ length: 51 }, () => ({ id: IN_STOCK, quantity: 1 }))),
);

console.log('\nnormalizeCpf');
ok('aceita CPF válido', () => {
  if (normalizeCpf('529.982.247-25') !== '52998224725') throw new Error('não normalizou');
});
throws('rejeita dígito verificador errado', () => normalizeCpf('529.982.247-26'));
throws('rejeita dígitos repetidos', () => normalizeCpf('111.111.111-11'));
throws('rejeita tamanho errado', () => normalizeCpf('123'));

console.log('\nrequireEmail');
ok('normaliza e-mail válido', () => {
  if (requireEmail(' Luiz@Exemplo.COM ') !== 'luiz@exemplo.com') throw new Error('não normalizou');
});
throws('rejeita e-mail sem @', () => requireEmail('invalido'));
throws('rejeita e-mail vazio', () => requireEmail(''));

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail ? 1 : 0);
