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
cp .env.example .env   # preencha as credenciais do Mercado Pago
npm run dev            # front-end
npm run build          # typecheck (app + api) + build de produção
npm run preview        # serve o build
npm run lint
npm test               # validação de pedido
```

As rotas `/api/*` são Vercel Functions e não sobem no `vite dev`. Para exercitar
o checkout ponta a ponta, use `vercel dev`.

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

`src/data/jerseys.ts` é **gerado**, não editado à mão. Vem de
`tools/products.json`, produzido por `tools/scrape_soccerpika.py`.

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

## Pagamento

Checkout com **Mercado Pago**, cobrindo Pix, cartão (até 12x) e boleto.

| Rota                        | O que faz                                                     |
| --------------------------- | ------------------------------------------------------------- |
| `POST /api/payments`        | cria a cobrança nos três métodos                                |
| `GET /api/payment-status`   | consulta o estado (a tela do Pix consulta até aprovar)          |
| `POST /api/webhooks/mercadopago` | recebe as notificações do gateway                          |

Três decisões que sustentam o fluxo:

- **O preço é do servidor.** O navegador manda só `{id, size, quantity}`;
  `api/_lib/order.ts` recalcula o total pelo catálogo, confere estoque e
  tamanho. `npm test` cobre isso, incluindo a tentativa de forjar o preço.
- **Dado de cartão não passa por nós.** Os campos ficam em iframes do Mercado
  Pago (Secure Fields); o navegador troca por um token de uso único e o
  servidor cobra com o token.
- **Webhook não é fonte de verdade.** A notificação traz só o id; o status é
  sempre relido da API, então um POST forjado não marca pedido como pago.
  Com `MP_WEBHOOK_SECRET` configurado, a assinatura `x-signature` é conferida
  antes disso.

Variáveis em `.env.example`. `MP_ACCESS_TOKEN` é secreto e nunca leva o prefixo
`VITE_` — só `VITE_MP_PUBLIC_KEY` chega ao navegador.

O `notification_url` é montado a partir do host do deploy, então o webhook só
funciona depois de publicado (em local, use um túnel).

## Estrutura

```
api/
  _lib/           cliente do Mercado Pago + validação de pedido
  payments.ts     cria a cobrança
  payment-status.ts
  webhooks/
src/
  components/     Header, Hero, FeaturedCarousel, Catalog, JerseyCard,
                  ProductModal, CartDrawer, CheckoutModal,
                  AuthenticityChecker, InstagramSection, SellJerseyForm, Footer
  data/           jerseys.ts (gerado)
  hooks/          useMercadoPago (Secure Fields do cartão)
  lib/            format (BRL) e checkout (chamadas à API)
  types/          modelo de domínio
test/             testes da validação de pedido
tools/            scraper + JSON de origem
```
