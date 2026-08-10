const YEAR = new Date().getFullYear();

const LINKS: [string, string][] = [
  ['Início', '#topo'],
  ['Produtos', '#catalogo'],
  ['Contato', '#vender'],
];

/** Bandeiras aceitas, como o rodapé da loja lista. */
const PAYMENTS = [
  'Visa',
  'Mastercard',
  'Amex',
  'Elo',
  'Hipercard',
  'Pix',
  'Boleto',
];

export function Footer() {
  return (
    <footer className="bg-navy text-paper">
      <div className="grid gap-12 px-5 py-16 sm:px-8 lg:grid-cols-2">
        <nav aria-label="Rodapé">
          <ul>
            {LINKS.map(([label, href]) => (
              <li key={label} className="border-b border-paper/40">
                <a
                  href={href}
                  className="block py-4 font-display text-4xl font-900 uppercase transition-colors hover:text-brand sm:text-5xl"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <div className="flex gap-6">
            <a
              href="https://instagram.com/soccerpika"
              target="_blank"
              rel="noopener noreferrer"
              className="link-underline hover:text-brand"
            >
              Instagram
            </a>
            <a
              href="https://www.tiktok.com/@soccerpika"
              target="_blank"
              rel="noopener noreferrer"
              className="link-underline hover:text-brand"
            >
              Tiktok
            </a>
          </div>

          <ul className="mt-6 flex flex-wrap gap-2">
            {PAYMENTS.map((brand) => (
              <li
                key={brand}
                className="rounded-sm bg-paper px-2.5 py-1.5 text-[11px] font-bold text-navy"
              >
                {brand}
              </li>
            ))}
          </ul>

          <p className="mt-6 max-w-sm text-sm text-paper/70">
            Parcele em até 12x sem juros no cartão, ou pague à vista no Pix e no
            boleto. Enviamos para todo o Brasil com rastreio.
          </p>
        </div>
      </div>

      <p className="px-5 pb-10 text-center text-sm text-paper/70 sm:px-8">
        Copyright Soccer Pika — {YEAR}. Todos os direitos reservados.
      </p>
    </footer>
  );
}
