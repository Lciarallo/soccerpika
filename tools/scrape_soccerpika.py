#!/usr/bin/env python3
"""Extrai o catálogo completo de soccerpika.com (Nuvemshop) para tools/products.json.

Fontes de verdade, por campo:
  preço / marca / estoque  -> JSON-LD schema.org/Product
  variantes (cor, tamanho) -> objeto JS `LS.variants` da Nuvemshop
  descrição / categoria    -> JSON-LD WebPage + breadcrumb
  fotos                    -> links com data-fancybox="product-gallery"

Detalhe importante: a página de um produto NÃO emite JSON-LD Product para si
mesma — apenas para os produtos relacionados no carrossel. Por isso o script
agrega os blocos Product de todas as páginas e indexa por URL canônica; a união
cobre o catálogo inteiro.

Uso:
    python3 tools/scrape_soccerpika.py [--out tools/products.json]
"""

import argparse
import html as htmlmod
import json
import re
import subprocess
import sys

BASE = "https://soccerpika.com/"
SEEDS = [BASE, BASE + "usadoemjogo/", BASE + "europeus/"]
UA = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
)
MAX_PAGES = 6


def get(url: str) -> str:
    return subprocess.run(
        ["curl", "-sL", "-A", UA, url], capture_output=True, text=True, timeout=60
    ).stdout


def txt(s: str) -> str:
    return " ".join(htmlmod.unescape(s or "").split())


def block_text(s: str) -> str:
    s = re.sub(r"<br\s*/?>", "\n", s)
    s = re.sub(r"</(p|div|li|h\d)>", "\n", s)
    s = re.sub(r"<[^>]+>", "", s)
    return "\n".join(l.strip() for l in htmlmod.unescape(s).split("\n") if l.strip())


def json_ld(page: str) -> list[dict]:
    out = []
    for m in re.finditer(
        r'<script type="application/ld\+json"[^>]*>(.*?)</script>', page, re.S
    ):
        try:
            out.append(json.loads(m.group(1).strip()))
        except json.JSONDecodeError:
            pass
    return out


def discover() -> list[str]:
    """Todas as URLs de produto, varrendo home + categorias + paginação."""
    urls: list[str] = []
    for seed in SEEDS:
        for page_no in range(1, MAX_PAGES + 1):
            url = seed if page_no == 1 else f"{seed}?page={page_no}"
            found = re.findall(
                r'href="(https://soccerpika\.com/produtos/[^"?#]+/)"', get(url)
            )
            new = [u for u in dict.fromkeys(found) if u not in urls]
            if not new:
                break
            urls += new
            print(f"  {url} -> +{len(new)}", file=sys.stderr)
    return urls


def build_product_index(pages: dict[str, str]) -> dict[str, dict]:
    """Dados autoritativos por URL, unindo os blocos Product de todas as páginas."""
    index: dict[str, dict] = {}
    for page in pages.values():
        for b in json_ld(page):
            if b.get("@type") != "Product":
                continue
            offer = b.get("offers") or {}
            url = offer.get("url") or (b.get("mainEntityOfPage") or {}).get("@id")
            if not url:
                continue
            inv = (offer.get("inventoryLevel") or {}).get("value")
            index[url.rstrip("/") + "/"] = {
                "name": txt(b.get("name", "")),
                "brand": txt((b.get("brand") or {}).get("name", "")),
                "price": float(offer["price"]) if offer.get("price") else None,
                "currency": offer.get("priceCurrency", "BRL"),
                "inStock": "InStock" in str(offer.get("availability", "")),
                "stockQty": int(inv) if str(inv).isdigit() else None,
            }
    return index


def parse(url: str, page: str, index: dict[str, dict]) -> dict:
    auth = index.get(url.rstrip("/") + "/", {})
    web = next((b for b in json_ld(page) if b.get("@type") == "WebPage"), None)

    rec = {
        "url": url,
        "slug": url.rstrip("/").split("/")[-1],
        "name": auth.get("name", ""),
        "price": auth.get("price"),
        "currency": auth.get("currency", "BRL"),
        "brand": auth.get("brand", ""),
        "inStock": auth.get("inStock", False),
        "stockQty": auth.get("stockQty"),
        "description": "",
        "categories": [],
        "colors": [],
        "sizes": [],
        "variants": [],
    }

    # Variantes: cor, tamanho e estoque por SKU.
    m = re.search(r"LS\.variants\s*=\s*(\[.*?\]);", page, re.S)
    if m:
        try:
            for v in json.loads(m.group(1)):
                rec["variants"].append(
                    {
                        "color": v.get("option0"),
                        "size": v.get("option1"),
                        "price": v.get("price_number"),
                        "stock": v.get("stock"),
                        "available": bool(v.get("available")),
                    }
                )
            rec["colors"] = list(
                dict.fromkeys(v["color"] for v in rec["variants"] if v["color"])
            )
            rec["sizes"] = list(
                dict.fromkeys(v["size"] for v in rec["variants"] if v["size"])
            )
            if rec["variants"]:
                rec["inStock"] = any(v["available"] for v in rec["variants"])
                rec["stockQty"] = sum(v["stock"] or 0 for v in rec["variants"])
        except json.JSONDecodeError:
            pass

    if not rec["name"]:
        m = re.search(r'<meta property="og:title" content="([^"]*)"', page)
        rec["name"] = txt(m.group(1)) if m else rec["slug"]

    if not rec["brand"]:
        m = re.search(r"brand:\s*'([^']*)'", page)
        if m and m.group(1):
            rec["brand"] = txt(m.group(1))

    if web:
        rec["description"] = txt(web.get("description", ""))
        crumbs = (web.get("breadcrumb") or {}).get("itemListElement") or []
        rec["categories"] = [
            txt(c["name"])
            for c in crumbs
            if c.get("name")
            and txt(c["name"]) != "Início"
            and txt(c["name"]).upper() != rec["name"].upper()
        ]

    m = re.search(
        r'<div[^>]*class="[^"]*item-description[^"]*"[^>]*>(.*?)</div>\s*(?:</div>|<script)',
        page,
        re.S,
    )
    if m:
        long = block_text(re.sub(r"<script.*?</script>", "", m.group(1), flags=re.S))
        if len(long) > len(rec["description"]):
            rec["descriptionLong"] = long[:900]

    # Só as fotos do próprio produto (o carrossel de relacionados não usa fancybox).
    gallery = re.findall(
        r'href="(//dcdn-us[^"]+?)"[^>]*data-fancybox="product-gallery"', page
    )
    rec["images"] = list(dict.fromkeys("https:" + g for g in gallery))

    return rec


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="tools/products.json")
    args = ap.parse_args()

    print("descobrindo produtos…", file=sys.stderr)
    urls = discover()
    print(f"{len(urls)} produtos únicos", file=sys.stderr)

    pages = {u: get(u) for u in urls}
    index = build_product_index(pages)
    print(f"{len(index)} entradas autoritativas de JSON-LD", file=sys.stderr)

    products = [parse(u, pages[u], index) for u in urls]

    for p in products:
        print(
            f"{p['name'][:36]:38} R${p['price'] or 0:>8.2f} | "
            f"{'ESTQ' if p['inStock'] else 'ESGT'} | {len(p['images'])}img | "
            f"{p['brand'][:9]:9} | {'/'.join(p['categories'])[:20]}",
            file=sys.stderr,
        )

    with open(args.out, "w", encoding="utf-8") as fh:
        json.dump(products, fh, ensure_ascii=False, indent=2)

    print(
        f"\n{args.out}: {len(products)} produtos | "
        f"{sum(1 for p in products if p['inStock'])} em estoque | "
        f"{sum(len(p['images']) for p in products)} imagens",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()
