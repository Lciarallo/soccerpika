/**
 * Validação do pedido no servidor.
 *
 * O valor cobrado é sempre recalculado a partir do catálogo daqui — o cliente
 * envia apenas ids e quantidades. Preço vindo do navegador nunca é confiável.
 */

import { jerseys } from '../../src/data/jerseys';

const CATALOG = new Map(jerseys.map((j) => [j.id, j]));

/** Teto de segurança: um pedido acima disso é erro ou abuso, não venda. */
const MAX_ORDER_TOTAL = 100_000;

export interface LineInput {
  id: unknown;
  size: unknown;
  quantity: unknown;
}

export interface Line {
  id: string;
  name: string;
  size: string;
  quantity: number;
  unitPrice: number;
}

export class OrderError extends Error {}

export function buildOrder(rawItems: unknown): { lines: Line[]; total: number; title: string } {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new OrderError('Carrinho vazio.');
  }
  if (rawItems.length > 50) {
    throw new OrderError('Pedido com itens demais.');
  }

  const lines: Line[] = [];

  for (const raw of rawItems as LineInput[]) {
    const jersey = typeof raw?.id === 'string' ? CATALOG.get(raw.id) : undefined;
    if (!jersey) {
      throw new OrderError(`Produto não encontrado: ${String(raw?.id)}`);
    }
    if (!jersey.inStock) {
      throw new OrderError(`"${jersey.name}" está esgotado.`);
    }

    const quantity = Number(raw.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new OrderError(`Quantidade inválida para "${jersey.name}".`);
    }
    if (quantity > jersey.stockQty) {
      throw new OrderError(
        `Só temos ${jersey.stockQty} unidade(s) de "${jersey.name}".`,
      );
    }

    const size = typeof raw.size === 'string' ? raw.size : 'Único';
    if (jersey.sizes.length > 0 && !jersey.sizes.includes(size)) {
      throw new OrderError(`Tamanho indisponível para "${jersey.name}".`);
    }

    lines.push({
      id: jersey.id,
      name: jersey.name,
      size,
      quantity,
      unitPrice: jersey.price,
    });
  }

  const total = Number(
    lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0).toFixed(2),
  );

  if (total <= 0 || total > MAX_ORDER_TOTAL) {
    throw new OrderError('Valor do pedido fora do intervalo aceito.');
  }

  const title =
    lines.length === 1
      ? lines[0].name
      : `Soccer Pika — ${lines.length} peças`;

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
