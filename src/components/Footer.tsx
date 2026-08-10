const YEAR = new Date().getFullYear();

/* Lucide removeu os ícones de marca — SVGs inline no lugar. */
function InstagramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.5 2h-3v13.2a2.7 2.7 0 1 1-2.2-2.66V9.5a5.8 5.8 0 1 0 5.2 5.77V8.9a6.6 6.6 0 0 0 3.9 1.27V7.1a3.7 3.7 0 0 1-3.9-3.6V2Z" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="bg-navy text-paper">
      <div className="rule-brand" />

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-3">
            <img src="./logo.png" alt="" width={48} height={48} className="h-12 w-12" />
            <span className="font-display text-xl font-900 tracking-tight">SOCCERPIKA</span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-paper/70">
            Acervo de camisas raras, de jogo e retrô. Cada peça é única — garimpada,
            conferida e enviada para todo o Brasil.
          </p>

          <div className="mt-5 flex gap-2">
            <a
              href="https://instagram.com/soccerpika"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram da Soccer Pika"
              className="border-2 border-paper/30 p-2.5 transition-colors hover:border-paper hover:bg-paper hover:text-navy"
            >
              <InstagramIcon />
            </a>
            <a
              href="https://www.tiktok.com/@soccerpika"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok da Soccer Pika"
              className="border-2 border-paper/30 p-2.5 transition-colors hover:border-paper hover:bg-paper hover:text-navy"
            >
              <TikTokIcon />
            </a>
          </div>
        </div>

        <FooterColumn
          title="Acervo"
          links={[
            ['Brasileiros', '#catalogo'],
            ['Europeus', '#catalogo'],
            ['Seleções', '#catalogo'],
            ['Sulamericanas', '#catalogo'],
            ['De jogo', '#catalogo'],
          ]}
        />

        <FooterColumn
          title="A loja"
          links={[
            ['Autenticidade', '#autenticidade'],
            ['Quero vender', '#vender'],
            ['Loja oficial', 'https://soccerpika.com/'],
          ]}
        />

        <div>
          <h3 className="font-display text-sm font-800 tracking-widest uppercase">
            Formas de pagamento
          </h3>
          <p className="mt-4 text-sm text-paper/70">
            Pix, boleto e cartão em até 12x sem juros. Pagamento combinado
            diretamente no atendimento.
          </p>
          <p className="mt-4 text-sm text-paper/70">
            Envio por Correios e transportadora, com rastreio.
          </p>
        </div>
      </div>

      <div className="border-t border-paper/20">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-paper/60 sm:flex-row">
          <p>© {YEAR} Soccer Pika. Todos os direitos reservados.</p>
          <p>Catálogo e imagens de soccerpika.com</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h3 className="font-display text-sm font-800 tracking-widest uppercase">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {links.map(([label, href]) => (
          <li key={label}>
            <a
              href={href}
              {...(href.startsWith('http')
                ? { target: '_blank', rel: 'noopener noreferrer' }
                : {})}
              className="text-sm text-paper/70 transition-colors hover:text-paper"
            >
              {label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
