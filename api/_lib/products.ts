/**
 * Repositório de produtos. Toda leitura e escrita do catálogo passa por aqui,
 * para que preço e estoque tenham uma fonte única.
 */

import { sql, toCents, toReais } from './db.js';

export interface ProductRow {
  id: string;
  slug: string;
  name: string;
  club: string;
  season: string;
  era: string;
  category: string;
  subcategory: string;
  brand: string;
  description: string;
  price_cents: number;
  stock_qty: number;
  sizes: string[];
  is_match_worn: boolean;
  is_autographed: boolean;
  is_published: boolean;
  source_url: string | null;
  created_at: Date;
  images: string[];
}

/** Formato que o front consome — preço em reais, estoque já resolvido. */
export interface Product {
  id: string;
  slug: string;
  name: string;
  club: string;
  season: string;
  era: string;
  category: string;
  subcategory: string;
  brand: string;
  description: string;
  price: number;
  stockQty: number;
  inStock: boolean;
  sizes: string[];
  images: string[];
  isMatchWorn: boolean;
  isAutographed: boolean;
  isPublished: boolean;
  sourceUrl: string | null;
  createdAt: string;
}

export const toProduct = (r: ProductRow): Product => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  club: r.club,
  season: r.season,
  era: r.era,
  category: r.category,
  subcategory: r.subcategory ?? '',
  brand: r.brand,
  description: r.description,
  price: toReais(r.price_cents),
  stockQty: r.stock_qty,
  inStock: r.stock_qty > 0,
  sizes: r.sizes ?? [],
  images: r.images?.filter(Boolean) ?? [],
  isMatchWorn: r.is_match_worn,
  isAutographed: r.is_autographed,
  isPublished: r.is_published,
  sourceUrl: r.source_url,
  createdAt: new Date(r.created_at).toISOString(),
});

/** Imagens agregadas na ordem de exibição, em uma consulta só. */
const SELECT = sql`
  SELECT p.*,
         COALESCE(
           ARRAY(
             SELECT i.url FROM product_images i
             WHERE i.product_id = p.id
             ORDER BY i.position, i.id
           ),
           '{}'
         ) AS images
  FROM products p
`;

export async function listProducts(
  { includeUnpublished = false } = {},
): Promise<Product[]> {
  const rows = await sql<ProductRow[]>`
    ${SELECT}
    WHERE ${includeUnpublished ? sql`TRUE` : sql`p.is_published`}
    ORDER BY (p.stock_qty > 0) DESC, p.price_cents DESC
  `;
  return rows.map(toProduct);
}

export async function getProduct(id: string): Promise<Product | null> {
  const [row] = await sql<ProductRow[]>`${SELECT} WHERE p.id = ${id}`;
  return row ? toProduct(row) : null;
}

export interface ProductInput {
  slug: string;
  name: string;
  club?: string;
  season?: string;
  era?: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  description?: string;
  price: number;
  stockQty?: number;
  sizes?: string[];
  images?: string[];
  isMatchWorn?: boolean;
  isAutographed?: boolean;
  isPublished?: boolean;
  sourceUrl?: string | null;
}

/** Cria ou atualiza pelo slug, reescrevendo a galeria. */
export async function upsertProduct(input: ProductInput): Promise<Product> {
  return sql.begin(async (tx) => {
    const [row] = await tx<{ id: string }[]>`
      INSERT INTO products (
        slug, name, club, season, era, category, subcategory, brand, description,
        price_cents, stock_qty, sizes, is_match_worn, is_autographed,
        is_published, source_url
      ) VALUES (
        ${input.slug},
        ${input.name},
        ${input.club ?? ''},
        ${input.season ?? ''},
        ${input.era ?? 'Sem data'},
        ${input.category ?? 'Outros'},
        ${input.subcategory ?? ''},
        ${input.brand ?? ''},
        ${input.description ?? ''},
        ${toCents(input.price)},
        ${input.stockQty ?? 0},
        ${input.sizes ?? []},
        ${input.isMatchWorn ?? false},
        ${input.isAutographed ?? false},
        ${input.isPublished ?? true},
        ${input.sourceUrl ?? null}
      )
      ON CONFLICT (slug) DO UPDATE SET
        name           = EXCLUDED.name,
        club           = EXCLUDED.club,
        season         = EXCLUDED.season,
        era            = EXCLUDED.era,
        category       = EXCLUDED.category,
        subcategory    = EXCLUDED.subcategory,
        brand          = EXCLUDED.brand,
        description    = EXCLUDED.description,
        price_cents    = EXCLUDED.price_cents,
        stock_qty      = EXCLUDED.stock_qty,
        sizes          = EXCLUDED.sizes,
        is_match_worn  = EXCLUDED.is_match_worn,
        is_autographed = EXCLUDED.is_autographed,
        is_published   = EXCLUDED.is_published,
        source_url     = EXCLUDED.source_url
      RETURNING id
    `;

    await tx`DELETE FROM product_images WHERE product_id = ${row.id}`;
    const images = input.images ?? [];
    if (images.length > 0) {
      await tx`
        INSERT INTO product_images ${tx(
          images.map((url, position) => ({ product_id: row.id, url, position })),
          'product_id',
          'url',
          'position',
        )}
      `;
    }

    const [full] = await tx<ProductRow[]>`
      SELECT p.*,
             COALESCE(ARRAY(
               SELECT i.url FROM product_images i
               WHERE i.product_id = p.id ORDER BY i.position, i.id
             ), '{}') AS images
      FROM products p WHERE p.id = ${row.id}
    `;
    return toProduct(full);
  });
}

export async function updateProduct(
  id: string,
  input: ProductInput,
): Promise<Product | null> {
  const existing = await getProduct(id);
  if (!existing) return null;
  return upsertProduct({ ...input, slug: input.slug || existing.slug });
}

export async function deleteProduct(id: string): Promise<boolean> {
  const rows = await sql`DELETE FROM products WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

/**
 * Baixa o estoque das linhas de um pedido pago.
 *
 * O UPDATE condicional evita venda dupla: se duas compras concorrerem pela
 * última peça, só a primeira encontra `stock_qty >= quantity`.
 */
export async function decrementStock(
  lines: { productId: string; quantity: number }[],
): Promise<boolean> {
  return sql.begin(async (tx) => {
    for (const line of lines) {
      const rows = await tx`
        UPDATE products
        SET stock_qty = stock_qty - ${line.quantity}
        WHERE id = ${line.productId} AND stock_qty >= ${line.quantity}
        RETURNING id
      `;
      if (rows.length === 0) return false;
    }
    return true;
  });
}
