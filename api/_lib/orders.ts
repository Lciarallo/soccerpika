/** Repositório de pedidos. */

import { sql, toCents, toReais } from './db.js';
import type { Line } from './order.js';

export interface OrderItem {
  name: string;
  size: string;
  quantity: number;
  unitPrice: number;
  image: string | null;
}

export interface Order {
  id: string;
  email: string;
  total: number;
  status: string;
  paymentId: string | null;
  paymentMethod: string | null;
  trackingCode: string | null;
  createdAt: string;
  items: OrderItem[];
}

/** Cria o pedido junto com suas linhas, numa transação só. */
export async function createOrder(input: {
  userId: string | null;
  email: string;
  total: number;
  paymentId: string;
  paymentMethod: string;
  status: string;
  lines: Line[];
}): Promise<string> {
  return sql.begin(async (tx) => {
    const [order] = await tx<{ id: string }[]>`
      INSERT INTO orders (user_id, email, total_cents, status, payment_id, payment_method)
      VALUES (
        ${input.userId},
        ${input.email},
        ${toCents(input.total)},
        ${input.status},
        ${input.paymentId},
        ${input.paymentMethod}
      )
      RETURNING id
    `;

    await tx`
      INSERT INTO order_items ${tx(
        input.lines.map((l) => ({
          order_id: order.id,
          product_id: l.id,
          name: l.name,
          size: l.size,
          quantity: l.quantity,
          unit_price_cents: toCents(l.unitPrice),
        })),
        'order_id',
        'product_id',
        'name',
        'size',
        'quantity',
        'unit_price_cents',
      )}
    `;

    return order.id;
  });
}

interface OrderRow {
  id: string;
  email: string;
  total_cents: number;
  status: string;
  payment_id: string | null;
  payment_method: string | null;
  tracking_code: string | null;
  created_at: Date;
  items: {
    name: string;
    size: string;
    quantity: number;
    unit_price_cents: number;
    image: string | null;
  }[];
}

const toOrder = (r: OrderRow): Order => ({
  id: r.id,
  email: r.email,
  total: toReais(r.total_cents),
  status: r.status,
  paymentId: r.payment_id,
  paymentMethod: r.payment_method,
  trackingCode: r.tracking_code,
  createdAt: r.created_at.toISOString(),
  items: (r.items ?? []).map((i) => ({
    name: i.name,
    size: i.size,
    quantity: i.quantity,
    unitPrice: toReais(i.unit_price_cents),
    image: i.image,
  })),
});

/** Pedidos de uma pessoa, com itens e a foto de capa de cada produto. */
export async function listOrdersForUser(userId: string): Promise<Order[]> {
  const rows = await sql<OrderRow[]>`
    SELECT o.*,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'name', oi.name,
              'size', oi.size,
              'quantity', oi.quantity,
              'unit_price_cents', oi.unit_price_cents,
              'image', (
                SELECT pi.url FROM product_images pi
                WHERE pi.product_id = oi.product_id
                ORDER BY pi.position, pi.id LIMIT 1
              )
            )
            ORDER BY oi.id
          )
          FROM order_items oi WHERE oi.order_id = o.id
        ),
        '[]'::json
      ) AS items
    FROM orders o
    WHERE o.user_id = ${userId}
    ORDER BY o.created_at DESC
    LIMIT 100
  `;
  return rows.map(toOrder);
}

export async function updateOrderStatus(paymentId: string, status: string): Promise<void> {
  await sql`UPDATE orders SET status = ${status} WHERE payment_id = ${paymentId}`;
}

export async function getOrderByPaymentId(paymentId: string) {
  const [row] = await sql<{ id: string; status: string; user_id: string | null }[]>`
    SELECT id, status, user_id FROM orders WHERE payment_id = ${paymentId}
  `;
  return row ?? null;
}
