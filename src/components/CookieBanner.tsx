import { useState } from 'react';

const COOKIE_KEY = 'soccerpika-cookie-notice-v1';

export function CookieBanner() {
  const [visible, setVisible] = useState(
    () => window.localStorage.getItem(COOKIE_KEY) !== 'accepted',
  );

  if (!visible) return null;

  return (
    <aside className="store-cookie" aria-label="Aviso de cookies">
      Ao navegar por este site <strong>você aceita o uso de cookies</strong> para
      agilizar a sua experiência de compra.{' '}
      <button
        type="button"
        onClick={() => {
          window.localStorage.setItem(COOKIE_KEY, 'accepted');
          setVisible(false);
        }}
      >
        Entendi
      </button>
    </aside>
  );
}
