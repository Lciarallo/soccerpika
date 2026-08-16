/** Agregações para o painel administrativo — só leitura, tudo calculado no banco. */

import { sql, toReais } from './db.js';

/** Pedidos nesses status contam como venda; `pending`/`cancelled`/`oversold` não. */
const PAID_STATUSES = ['paid', 'shipped', 'delivered'];

export interface PeriodStats {
  revenue: number;
  orderCount: number;
  averageTicket: number;
  unitsSold: number;
}

async function periodStats(startDaysAgo: number, endDaysAgo: number): Promise<PeriodStats> {
  const [row] = await sql<{ order_count: string; revenue_cents: string; units: string }[]>`
    WITH period_orders AS (
      SELECT id, total_cents FROM orders
      WHERE status = ANY(${PAID_STATUSES})
        AND created_at >= now() - (${startDaysAgo} * interval '1 day')
        AND created_at < now() - (${endDaysAgo} * interval '1 day')
    )
    SELECT
      (SELECT COUNT(*) FROM period_orders) AS order_count,
      (SELECT COALESCE(SUM(total_cents), 0) FROM period_orders) AS revenue_cents,
      (
        SELECT COALESCE(SUM(oi.quantity), 0)
        FROM order_items oi
        JOIN period_orders po ON po.id = oi.order_id
      ) AS units
  `;
  const orderCount = Number(row?.order_count ?? 0);
  const revenue = toReais(Number(row?.revenue_cents ?? 0));
  return {
    revenue,
    orderCount,
    averageTicket: orderCount > 0 ? revenue / orderCount : 0,
    unitsSold: Number(row?.units ?? 0),
  };
}

export interface DailyPoint {
  label: string;
  value: number;
}

async function dailyRevenue(days: number): Promise<DailyPoint[]> {
  const rows = await sql<{ label: string; revenue_cents: string }[]>`
    SELECT
      to_char(day, 'DD/MM') AS label,
      COALESCE(SUM(o.total_cents), 0) AS revenue_cents
    FROM generate_series(
      date_trunc('day', now() - (${days - 1} * interval '1 day')),
      date_trunc('day', now()),
      interval '1 day'
    ) AS day
    LEFT JOIN orders o
      ON date_trunc('day', o.created_at) = day AND o.status = ANY(${PAID_STATUSES})
    GROUP BY day
    ORDER BY day
  `;
  return rows.map((r) => ({ label: r.label, value: toReais(Number(r.revenue_cents)) }));
}

export interface RankedDatum {
  label: string;
  value: number;
}

async function topProducts(days: number, limit = 6): Promise<RankedDatum[]> {
  const rows = await sql<{ name: string; revenue_cents: string }[]>`
    SELECT oi.name, SUM(oi.unit_price_cents * oi.quantity) AS revenue_cents
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.status = ANY(${PAID_STATUSES})
      AND o.created_at >= now() - (${days} * interval '1 day')
    GROUP BY oi.name
    ORDER BY revenue_cents DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => ({ label: r.name, value: toReais(Number(r.revenue_cents)) }));
}

async function statusCounts(): Promise<Record<string, number>> {
  const rows = await sql<{ status: string; count: string }[]>`
    SELECT status, COUNT(*) AS count FROM orders GROUP BY status
  `;
  return Object.fromEntries(rows.map((r) => [r.status, Number(r.count)]));
}

export interface LowStockProduct {
  id: string;
  name: string;
  stockQty: number;
}

async function lowStock(threshold = 2, limit = 10): Promise<LowStockProduct[]> {
  const rows = await sql<{ id: string; name: string; stock_qty: number }[]>`
    SELECT id, name, stock_qty FROM products
    WHERE is_published AND stock_qty <= ${threshold}
    ORDER BY stock_qty ASC, name ASC
    LIMIT ${limit}
  `;
  return rows.map((r) => ({ id: r.id, name: r.name, stockQty: r.stock_qty }));
}

export interface RecentOrder {
  id: string;
  customerName: string | null;
  email: string;
  itemCount: number;
  total: number;
  status: string;
  createdAt: string;
}

async function recentOrders(limit = 6): Promise<RecentOrder[]> {
  const rows = await sql<
    {
      id: string;
      customer_name: string | null;
      email: string;
      item_count: string;
      total_cents: number;
      status: string;
      created_at: Date;
    }[]
  >`
    SELECT o.id, u.name AS customer_name, o.email, o.total_cents, o.status, o.created_at,
      COALESCE((SELECT SUM(oi.quantity) FROM order_items oi WHERE oi.order_id = o.id), 0) AS item_count
    FROM orders o
    LEFT JOIN users u ON u.id = o.user_id
    ORDER BY o.created_at DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => ({
    id: r.id,
    customerName: r.customer_name,
    email: r.email,
    itemCount: Number(r.item_count),
    total: toReais(r.total_cents),
    status: r.status,
    createdAt: new Date(r.created_at).toISOString(),
  }));
}

export interface DashboardData {
  days: number;
  current: PeriodStats;
  previous: PeriodStats;
  daily: DailyPoint[];
  topProducts: RankedDatum[];
  statusCounts: Record<string, number>;
  lowStock: LowStockProduct[];
  recentOrders: RecentOrder[];
}

export async function buildDashboard(days: number): Promise<DashboardData> {
  const [current, previous, daily, top, statuses, low, recent] = await Promise.all([
    periodStats(days, 0),
    periodStats(days * 2, days),
    dailyRevenue(days),
    topProducts(days),
    statusCounts(),
    lowStock(),
    recentOrders(),
  ]);

  return { days, current, previous, daily, topProducts: top, statusCounts: statuses, lowStock: low, recentOrders: recent };
}
