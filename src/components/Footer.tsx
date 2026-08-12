import type { MouseEvent } from 'react';

const YEAR = new Date().getFullYear();

const LINKS = [
  ['Início', '/'],
  ['Produtos', '/produtos'],
  ['Contato', '/contato'],
] as const;

const PAYMENT_LOGOS = [
  ['visa', 'https://d26lpennugtm8s.cloudfront.net/assets/common/img/logos/payment/new_logos_payment/visa@2x.png'],
  ['mastercard', 'https://d26lpennugtm8s.cloudfront.net/assets/common/img/logos/payment/new_logos_payment/mastercard@2x.png'],
  ['amex', 'https://d26lpennugtm8s.cloudfront.net/assets/common/img/logos/payment/new_logos_payment/amex@2x.png'],
  ['bradesco', 'https://d26lpennugtm8s.cloudfront.net/assets/common/img/logos/payment/new_logos_payment/br/bradesco@2x.png'],
  ['elo', 'https://d26lpennugtm8s.cloudfront.net/assets/common/img/logos/payment/new_logos_payment/br/elo@2x.png'],
  ['hipercard', 'https://d26lpennugtm8s.cloudfront.net/assets/common/img/logos/payment/new_logos_payment/br/hipercard@2x.png'],
  ['pix', 'https://d26lpennugtm8s.cloudfront.net/assets/common/img/logos/payment/new_logos_payment/payment-method-types/pix@2x.png'],
  ['nuvem envio', 'https://d26lpennugtm8s.cloudfront.net/assets/common/img/logos/shipping/api/4190@2x.png'],
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
