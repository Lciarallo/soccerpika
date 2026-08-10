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
npm run dev        # servidor de desenvolvimento
npm run build      # typecheck + build de produção
npm run preview    # serve o build
npm run lint
```

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

## Estrutura

```
src/
  components/     Header, Hero, Catalog, JerseyCard, ProductModal,
                  CartDrawer, AuthenticityChecker, SellJerseyForm, Footer
  data/           jerseys.ts (gerado)
  lib/format.ts   preço em BRL e parcelamento
  types/          modelo de domínio
tools/            scraper + JSON de origem
```

O carrinho é local (sem backend): o checkout monta a mensagem do pedido e abre
o WhatsApp para combinar pagamento e envio.
