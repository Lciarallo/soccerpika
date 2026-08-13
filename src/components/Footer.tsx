import type { MouseEvent } from 'react';

const YEAR = new Date().getFullYear();

const LINKS = [
  ['Início', '/'],
  ['Produtos', '/produtos'],
  ['Contato', '/contato'],
] as const;

const PAYMENT_LOGOS = [
  ['visa', '/payments/visa.webp'],
  ['mastercard', '/payments/mastercard.webp'],
  ['amex', '/payments/amex.webp'],
  ['bradesco', '/payments/bradesco.webp'],
  ['elo', '/payments/elo.webp'],
  ['hipercard', '/payments/hipercard.webp'],
  ['pix', '/payments/pix.webp'],
  ['nuvem envio', '/payments/nuvem-envio.webp'],
] as const;

export function Footer({ onNavigate }: { onNavigate: (to: string) => void }) {
  const navigate = (event: MouseEvent<HTMLAnchorElement>, to: string) => {
    event.preventDefault();
    onNavigate(to);
  };

  return (
    <footer className="store-footer">
      <div className="store-footer-grid">
        <nav aria-label="Rodapé">
          <ul className="store-footer-menu">
            {LINKS.map(([label, href]) => (
              <li key={href}>
                <a href={href} onClick={(event) => navigate(event, href)}>
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="store-footer-meta">
          <div className="store-footer-socials">
            <a href="https://instagram.com/soccerpika" target="_blank" rel="noopener noreferrer">
              Instagram
            </a>
            <a href="https://www.tiktok.com/@soccerpika" target="_blank" rel="noopener noreferrer">
              Tiktok
            </a>
          </div>

          <ul className="store-footer-payments" aria-label="Formas de pagamento e envio">
            {PAYMENT_LOGOS.map(([name, src]) => (
              <li key={name}>
                <img src={src} alt={name} width={40} height={25} loading="lazy" />
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="store-powered-by" aria-label="Criado com Nuvemshop">
        criado com <span aria-hidden="true">∞</span> nuvemshop
      </div>
      <p className="store-copyright">
        Copyright Soccer Pika - {YEAR}. Todos os direitos reservados.
      </p>
    </footer>
  );
}
