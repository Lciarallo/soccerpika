# SoccerPika

Vitrine de camisas de futebol raras — camisas de jogo, retrô, autografadas e de
seleção. Catálogo, dados e identidade visual reproduzidos a partir da loja
oficial [soccerpika.com](https://soccerpika.com/).

## Stack

- React 19 + TypeScript
- Vite 8
- Tailwind CSS v4 (`@tailwindcss/vite`)
- oxlint

## Rodando

```bash
npm install
cp .env.example .env             # preencha as credenciais

# Postgres local para desenvolver
podman run -d --name spk-pg -p 5433:5432 \
  -e POSTGRES_USER=spk -e POSTGRES_PASSWORD=spk -e POSTGRES_DB=soccerpika \
  docker.io/library/postgres:17-alpine

npm run db:migrate               # cria o schema (idempotente)
ADMIN_EMAIL=voce@exemplo.com ADMIN_PASSWORD=uma-senha-boa npm run db:seed

npm run dev                      # site + rotas /api juntos
npm run build                    # typecheck (app + api) + build
npm run lint
npm test                         # validação de pedido, senha e concorrência
npm run test:e2e                 # fluxo de conta, papéis e CRUD (dev rodando)
```

`npm run dev` serve a pasta `api/` como middleware do Vite (veja
`dev-api-plugin.ts`), então o site roda inteiro em local — sem `vercel dev`.
Em produção quem serve essas rotas é a Vercel.

## Identidade visual

A paleta vem das CSS custom properties da loja oficial, não de aproximação:

| Token          | Cor       | Uso                              |
| -------------- | --------- | -------------------------------- |
| `--color-paper`| `#ffffff` | fundo                            |
| `--color-ink`  | `#000000` | texto, bordas, contornos         |
| `--color-brand`| `#ff0300` | destaque, CTAs, preços           |
| `--color-navy` | `#020094` | footer, selos "de jogo"          |
| `--color-success` / `--color-danger` / `--color-warning` | `#4bb98c` / `#dd7774` / `#dc8f38` | estados |

O logo (`public/logo.png`) é o original da loja.

Decisão de design: **nenhum blur em lugar nenhum**. Overlays de modal e carrinho
usam cor sólida com opacidade (`bg-ink/70`); profundidade vem de bordas de 2px,
contraste e um deslocamento sólido no hover dos cards — não de desfoque.

## Dados

O catálogo vive no Postgres e é servido por `GET /api/products`.

`src/data/jerseys.ts` é a **semente**: gerado pelo scraper e consumido por
`db/seed.mjs` na primeira carga. Depois disso, quem manda é o banco — editar
esse arquivo não muda a loja.

O scraper extrai, para cada produto:

- preço e disponibilidade reais (via JSON-LD `schema.org/Product`)
- estoque por variante (via `LS.variants` da Nuvemshop)
- descrição real e categoria (via JSON-LD `WebPage` + breadcrumb)
- galeria de fotos própria do produto (links `data-fancybox="product-gallery"`,
  isolando as fotos dos produtos relacionados)

```bash
python3 tools/scrape_soccerpika.py    # regrava tools/products.json
```

As imagens ficam versionadas em `public/products/` (96 arquivos `.webp`), então
o site não depende do CDN da loja original em runtime.

## Feed do Instagram

A home consulta `GET /api/instagram`, que busca no servidor as três publicações
mais recentes da conta profissional. O navegador nunca chama a Graph API e
nunca recebe o token. A resposta pública é reduzida a id, permalink, imagem e
texto alternativo, com URLs validadas e cache de 15 minutos. Se a Meta estiver
fora do ar ou o token expirar, as três imagens locais continuam aparecendo.

Configure `INSTAGRAM_USER_ID` apenas como variável server-side e cadastre
`INSTAGRAM_ACCESS_TOKEN` como **Sensitive** no Vercel; em local, ambos ficam em
`.env.local`. Jamais use prefixo `VITE_`. A integração usa Business Login for
Instagram, Graph API v26.0 e a permissão mínima `instagram_business_basic`.
Tokens de longa duração valem 60 dias e devem ser renovados antes de expirar.

## Pagamento

Checkout só por **Pix via InfinitePay** — 0% de taxa para MEI (contra 0,99%
do Mercado Pago, que este projeto usava antes). O checkout é hospedado: o
cliente é redirecionado para o domínio da InfinitePay para pagar, e volta
para `/pagamento/retorno`.

| Rota                          | O que faz                                                        |
| ------------------------------ | ----------------------------------------------------------------- |
| `POST /api/payments`           | cria o pedido e o link de cobrança Pix                            |
| `GET /api/payment-status`      | consulta o estado no nosso banco (a tela consulta até aprovar)    |
| `POST /api/payment-sync`       | confirma na hora, a partir do retorno do cliente                  |
| `POST /api/webhooks/infinitepay` | recebe as notificações do gateway                               |

Três decisões que sustentam o fluxo:

- **O preço é do servidor.** O navegador manda só `{id, size, quantity}`;
  `api/_lib/order.ts` recalcula o total pelo catálogo, confere estoque e
  tamanho. `npm test` cobre isso, incluindo a tentativa de forjar o preço.
- **Webhook não é fonte de verdade.** A notificação da InfinitePay traz só
  coordenadas (`order_nsu`, `transaction_nsu`, `slug`); o pagamento é sempre
  reconferido em `POST /payment_check` antes de marcar o pedido como pago —
  um POST forjado não confirma nada sozinho.
- **Duas vias convergem no mesmo lugar.** Webhook (assíncrono) e retorno do
  cliente (`/api/payment-sync`, mais rápido) chamam a mesma
  `markOrderPaid`, que baixa estoque numa transação e é idempotente — a
  segunda confirmação de um pedido já pago não faz nada.

Variável em `.env.example`: `INFINITEPAY_HANDLE` é a InfiniteTag da conta, só
no servidor.

## Deploy

O projeto já está linkado em `brdtbrasil-5736s-projects/soccerpika`, conectado
ao GitHub, com o Blob criado e o `SESSION_SECRET` configurado nos três
ambientes. Falta o banco e as credenciais do gateway:

```bash
# 1. Aceitar os termos do Neon (exige navegador — é aceite legal, tem que ser você)
#    https://vercel.com/brdtbrasil-5736s-projects/~/integrations/accept-terms/neon
vercel integration add neon --json          # cria e conecta o banco

# 2. Trazer a DATABASE_URL e preparar o schema
vercel env pull .env.production --environment production
DATABASE_URL="$(grep -oP '(?<=^DATABASE_URL=").*(?=")' .env.production)" \
  npm run db:migrate
DATABASE_URL="..." ADMIN_EMAIL=voce@exemplo.com ADMIN_PASSWORD='…' npm run db:seed

# 3. InfiniteTag da conta InfinitePay (painel da sua conta MEI)
vercel env add INFINITEPAY_HANDLE production

# 4. Publicar
vercel deploy --prod
```

Depois do deploy, cadastre o webhook da InfinitePay apontando para
`https://<seu-domínio>/api/webhooks/infinitepay` (a URL também é enviada
automaticamente a cada cobrança, via `webhook_url`).

Sem `DATABASE_URL` o site sobe, mas o catálogo responde erro — ele vem todo do
banco.

## Contas e painel

Duas telas além da loja, ambas atrás de sessão:

- `/conta` — pedidos com status de pagamento, dados salvos para checkout
  rápido e lista de desejos.
- `/admin` — painel do administrador, com cinco abas: **Painel** (faturamento,
  ticket médio, peças vendidas, gráfico diário e ranking, tudo calculado no
  banco em `_lib/adminStats.ts`), **Pedidos** (esteira de status e código de
  rastreio), **Estoque** (ajuste rápido por peça), **Catálogo** (cadastra,
  edita, publica/oculta e remove produtos, com upload de fotos) e **Usuários**
  (promove/rebaixa entre `user` e `admin` — a loja sempre recusa ficar sem
  nenhum admin).

O primeiro admin sai do `db:seed`. Contas criadas pelo site são sempre
`user` — o papel nunca vem do cliente; para promover alguém, rode
`UPDATE users SET role = 'admin' WHERE email = '…'` ou o seed com esse e-mail.

Como a autenticação é feita:

- **Senha** com `scrypt` do `node:crypto` (N=2^15), sal por usuário guardado
  junto do hash no formato `scrypt$N$r$p$sal$derivado` — dá para trocar os
  parâmetros sem invalidar senha antiga. Sem dependência de terceiros.
- **Sessão** em cookie httpOnly + SameSite=Lax, assinado com HMAC-SHA256 e
  comparado em tempo constante. Sem estado no servidor; o papel é relido do
  banco a cada request, então revogar admin tem efeito imediato.
- **Login não revela quem tem conta**: e-mail inexistente compara contra um
  hash descartável, para o tempo de resposta não vazar a diferença.

## Estrutura

```
api/
  _lib/           db, auth, produtos, pedidos, usuários, validação,
                  InfinitePay, agregações do painel (adminStats)
  auth/           register, login, session
  account/        orders, wishlist, profile
  admin/          upload de fotos, dashboard, pedidos/[id], usuários/[id]
                  (tudo atrás de requireAdmin)
  products.ts     lista e cria           products/[id].ts  detalhe, edita, remove
  payments.ts     cria o pedido e o Pix  payment-status.ts  consulta
  payment-sync.ts confirma no retorno do cliente
  webhooks/       notificações do gateway
db/
  schema.sql      tabelas (idempotente)
  migrate.mjs     aplica o schema        seed.mjs  catálogo + admin inicial
src/
  components/     Header, Hero, FeaturedCarousel, Catalog, JerseyCard,
                  ProductModal, CartDrawer, CheckoutModal, AuthModal,
                  AuthenticityChecker, InstagramSection, SellJerseyForm, Footer
  components/admin/ Dashboard, OrdersAdmin, StockAdmin, ProductsAdmin,
                  UsersAdmin, charts (SVG puro)
  pages/          AccountPage, AdminDashboard, PaymentReturnPage
  hooks/          sessão e rota
  lib/            api (chamadas), checkout, format (BRL)
  data/           jerseys.ts (semente gerada)
  types/          modelo de domínio
test/             order.test.mjs (banco) e e2e.sh (HTTP)
tools/            scraper + JSON de origem
dev-api-plugin.ts serve api/ no `npm run dev`
```
