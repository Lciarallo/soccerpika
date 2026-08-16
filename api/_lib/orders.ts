/** Repositório de pedidos. */

import { sql, toCents, toReais } from './db.js';
import { OrderError, type Line } from './order.js';

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
  /** Nulo na criação: a InfinitePay só entrega o id da transação após o pagamento. */
  paymentId: string | null;
  paymentMethod: string;
  status: string;
  lines: Line[];
  shippingCents: number;
  shippingMethod: string;
  shippingCep: string;
}): Promise<string> {
  return sql.begin(async (tx) => {
    const [order] = await tx<{ id: string }[]>`
      INSERT INTO orders (user_id, email, total_cents, status, payment_id, payment_method, shipping_cents, shipping_method, shipping_cep)
      VALUES (
        ${input.userId},
        ${input.email},
        ${toCents(input.total)},
        ${input.status},
        ${input.paymentId},
        ${input.paymentMethod},
        ${input.shippingCents},
        ${input.shippingMethod},
        ${input.shippingCep}
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

export type ConfirmResult = 'paid' | 'already-paid' | 'mismatch' | 'not-found' | 'oversold';

/**
 * Confirma o pagamento Pix de um pedido e baixa o estoque, na mesma transação.
 *
 * `orderId` é o próprio `order_nsu` mandado à InfinitePay, então a busca é
 * direta pela chave primária — sem indireção por `payment_id` como no fluxo
 * antigo do Mercado Pago (lá o id do pedido só existia depois do gateway
 * responder; aqui é o contrário, o pedido nasce primeiro).
 */
export async function markOrderPaid(
  orderId: string,
  providerRef: string,
  amountCents: number,
): Promise<ConfirmResult> {
  return sql.begin(async (tx) => {
    const [order] = await tx<
      { id: string; status: string; total_cents: number; payment_method: string | null }[]
    >`
      SELECT id, status, total_cents, payment_method FROM orders
      WHERE id = ${orderId}
      FOR UPDATE
    `;
    if (!order) return 'not-found';
    if (order.payment_method !== 'pix') return 'mismatch';
    if (order.total_cents !== amountCents) return 'mismatch';
    if (order.status === 'paid') return 'already-paid';
    if (order.status !== 'pending') return 'mismatch';

    const lines = await tx<{ product_id: string; quantity: number }[]>`
      SELECT product_id, quantity FROM order_items
      WHERE order_id = ${orderId} AND product_id IS NOT NULL
    `;

    for (const line of lines) {
      const rows = await tx`
        UPDATE products
        SET stock_qty = stock_qty - ${line.quantity}
        WHERE id = ${line.product_id} AND stock_qty >= ${line.quantity}
        RETURNING id
      `;
      if (rows.length === 0) {
        // Peça única já vendida entre a criação do pedido e a confirmação:
        // marca para conferência manual em vez de baixar estoque negativo.
        await tx`UPDATE orders SET status = 'oversold', payment_id = ${providerRef} WHERE id = ${orderId}`;
        return 'oversold';
      }
    }

    await tx`UPDATE orders SET status = 'paid', payment_id = ${providerRef} WHERE id = ${orderId}`;
    return 'paid';
  });
}

export async function getOrderStatus(orderId: string) {
  const [row] = await sql<{ id: string; status: string; total_cents: number }[]>`
    SELECT id, status, total_cents FROM orders WHERE id = ${orderId}
  `;
  return row ?? null;
}

/* ------------------------------------------------------------- painel admin --- */

export interface AdminOrder extends Order {
  customerName: string | null;
}

interface AdminOrderRow extends OrderRow {
  customer_name: string | null;
}

const toAdminOrder = (r: AdminOrderRow): AdminOrder => ({
  ...toOrder(r),
  customerName: r.customer_name,
});

/** Todos os pedidos, mais recentes primeiro — para o painel administrativo. */
export async function listAllOrders(): Promise<AdminOrder[]> {
  const rows = await sql<AdminOrderRow[]>`
    SELECT o.*, u.name AS customer_name,
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
    LEFT JOIN users u ON u.id = o.user_id
    ORDER BY o.created_at DESC
    LIMIT 500
  `;
  return rows.map(toAdminOrder);
}

const ADMIN_STATUSES = new Set([
  'pending',
  'paid',
  'shipped',
  'delivered',
  'cancelled',
  'oversold',
]);

/** Atualização manual pelo painel: status na esteira e/ou código de rastreio. */
export async function updateOrderAdmin(
  orderId: string,
  input: { status?: string; trackingCode?: string },
): Promise<boolean> {
  if (input.status !== undefined && !ADMIN_STATUSES.has(input.status)) {
    throw new OrderError('Status inválido.');
  }

  const rows = await sql`
    UPDATE orders SET
      status = COALESCE(${input.status ?? null}, status),
      tracking_code = COALESCE(${input.trackingCode ?? null}, tracking_code)
    WHERE id = ${orderId}
    RETURNING id
  `;
  return rows.length > 0;
}
