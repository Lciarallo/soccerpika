/**
 * Validação do pedido no servidor.
 *
 * O valor cobrado é sempre recalculado a partir do catálogo no banco — o
 * cliente envia apenas ids, tamanhos e quantidades. Preço vindo do navegador
 * nunca é confiável.
 */

import { sql, toReais } from './db';

/** Teto de segurança: um pedido acima disso é erro ou abuso, não venda. */
const MAX_ORDER_TOTAL = 100_000;
const MAX_LINES = 50;

export interface Line {
  id: string;
  name: string;
  size: string;
  quantity: number;
  unitPrice: number;
}

export class OrderError extends Error {}

interface CatalogRow {
  id: string;
  name: string;
  price_cents: number;
  stock_qty: number;
  sizes: string[];
  is_published: boolean;
}

export async function buildOrder(
  rawItems: unknown,
): Promise<{ lines: Line[]; total: number; title: string }> {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new OrderError('Carrinho vazio.');
  }
  if (rawItems.length > MAX_LINES) {
    throw new OrderError('Pedido com itens demais.');
  }

  const ids = rawItems.map((i) => String((i as { id?: unknown })?.id ?? ''));
  if (ids.some((id) => !id)) {
    throw new OrderError('Item sem identificação.');
  }

  const rows = await sql<CatalogRow[]>`
    SELECT id, name, price_cents, stock_qty, sizes, is_published
    FROM products WHERE id = ANY(${ids}::uuid[])
  `;
  const catalog = new Map(rows.map((r) => [r.id, r]));

  const lines: Line[] = [];

  for (const raw of rawItems as { id: string; size?: unknown; quantity?: unknown }[]) {
    const product = catalog.get(String(raw.id));
    if (!product || !product.is_published) {
      throw new OrderError(`Produto não encontrado: ${String(raw.id)}`);
    }
    if (product.stock_qty <= 0) {
      throw new OrderError(`"${product.name}" está esgotado.`);
    }

    const quantity = Number(raw.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new OrderError(`Quantidade inválida para "${product.name}".`);
    }
    if (quantity > product.stock_qty) {
      throw new OrderError(
        `Só temos ${product.stock_qty} unidade(s) de "${product.name}".`,
      );
    }

    const size = typeof raw.size === 'string' && raw.size ? raw.size : 'Único';
    const sizes = product.sizes ?? [];
    if (sizes.length > 0 && !sizes.includes(size)) {
      throw new OrderError(`Tamanho indisponível para "${product.name}".`);
    }

    lines.push({
      id: product.id,
      name: product.name,
      size,
      quantity,
      unitPrice: toReais(product.price_cents),
    });
  }

  const total = Number(
    lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0).toFixed(2),
  );

  if (total <= 0 || total > MAX_ORDER_TOTAL) {
    throw new OrderError('Valor do pedido fora do intervalo aceito.');
  }

  const title = lines.length === 1 ? lines[0].name : `Soccer Pika — ${lines.length} peças`;

  return { lines, total, title };
}

/** CPF com validação de dígitos verificadores. */
export function normalizeCpf(value: unknown): string {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) {
    throw new OrderError('CPF inválido.');
  }

  const check = (upTo: number) => {
    let sum = 0;
    for (let i = 0; i < upTo; i++) {
      sum += Number(digits[i]) * (upTo + 1 - i);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  if (check(9) !== Number(digits[9]) || check(10) !== Number(digits[10])) {
    throw new OrderError('CPF inválido.');
  }
  return digits;
}

export function requireEmail(value: unknown): string {
  const email = String(value ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) {
    throw new OrderError('E-mail inválido.');
  }
  return email;
}

export function requireName(value: unknown, field: string): string {
  const name = String(value ?? '').trim();
  if (name.length < 2 || name.length > 60) {
    throw new OrderError(`${field} inválido.`);
  }
  return name;
}
