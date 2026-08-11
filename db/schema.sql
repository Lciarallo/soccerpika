-- Schema da Soccer Pika. Idempotente: pode rodar de novo sem quebrar.
-- Aplique com `npm run db:migrate`.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------- contas ---

CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL,
  password_hash text NOT NULL,
  name          text NOT NULL,
  role          text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  cpf           text,
  phone         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Login é sempre em minúsculas; o índice garante unicidade real.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users (lower(email));

CREATE TABLE IF NOT EXISTS addresses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  zip_code     text NOT NULL,
  street       text NOT NULL,
  number       text NOT NULL,
  complement   text,
  neighborhood text NOT NULL,
  city         text NOT NULL,
  state        char(2) NOT NULL,
  is_default   boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS addresses_user_idx ON addresses (user_id);

-- Um endereço padrão por pessoa.
CREATE UNIQUE INDEX IF NOT EXISTS addresses_one_default
  ON addresses (user_id) WHERE is_default;

-- -------------------------------------------------------------- catálogo ---

CREATE TABLE IF NOT EXISTS products (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text NOT NULL UNIQUE,
  name            text NOT NULL,
  club            text NOT NULL DEFAULT '',
  season          text NOT NULL DEFAULT '',
  era             text NOT NULL DEFAULT 'Sem data',
  category        text NOT NULL DEFAULT 'Outros',
  brand           text NOT NULL DEFAULT '',
  description     text NOT NULL DEFAULT '',
  -- Centavos: dinheiro em float acumula erro de arredondamento.
  price_cents     integer NOT NULL CHECK (price_cents >= 0),
  stock_qty       integer NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
  sizes           text[] NOT NULL DEFAULT '{}',
  is_match_worn   boolean NOT NULL DEFAULT false,
  is_autographed  boolean NOT NULL DEFAULT false,
  is_published    boolean NOT NULL DEFAULT true,
  source_url      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS products_category_idx ON products (category);
CREATE INDEX IF NOT EXISTS products_published_idx ON products (is_published, stock_qty);

CREATE TABLE IF NOT EXISTS product_images (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  url        text NOT NULL,
  position   integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS product_images_product_idx
  ON product_images (product_id, position);

-- --------------------------------------------------------------- pedidos ---

CREATE TABLE IF NOT EXISTS orders (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid REFERENCES users (id) ON DELETE SET NULL,
  email          text NOT NULL,
  total_cents    integer NOT NULL CHECK (total_cents >= 0),
  status         text NOT NULL DEFAULT 'pending',
  payment_id     text,
  payment_method text,
  tracking_code  text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_user_idx ON orders (user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS orders_payment_id_key
  ON orders (payment_id) WHERE payment_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS order_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        uuid NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  product_id      uuid REFERENCES products (id) ON DELETE SET NULL,
  -- Nome e preço são copiados: o pedido não pode mudar se o produto mudar.
  name            text NOT NULL,
  size            text NOT NULL DEFAULT 'Único',
  quantity        integer NOT NULL CHECK (quantity > 0),
  unit_price_cents integer NOT NULL CHECK (unit_price_cents >= 0)
);

CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items (order_id);

-- ------------------------------------------------------- lista de desejos ---

CREATE TABLE IF NOT EXISTS wishlist (
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);

-- ---------------------------------------------------------------- gatilho ---

CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_touch ON products;
CREATE TRIGGER products_touch BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS orders_touch ON orders;
CREATE TRIGGER orders_touch BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
