const TICKER = ['@SOCCERPIKA', '(LÁ ELE)', 'NAS REDES SOCIAIS'];

function TickerLine({ reverse = false }: { reverse?: boolean }) {
  return (
    <div
      className={`store-ticker-line${reverse ? ' is-reverse' : ''}`}
      aria-hidden="true"
    >
      {[0, 1, 2, 3, 4].flatMap((copy) =>
        TICKER.map((text) => (
          <span key={`${copy}-${text}`} className="store-ticker-text">
            {text}
          </span>
        )),
      )}
    </div>
  );
}

export function Hero() {
  return (
    <>
      <section className="store-wordmark-section">
        <div className="store-container">
          <h1>SOCCER PIKA™</h1>
        </div>
      </section>

      <section className="store-ticker-section" aria-label="Soccer Pika nas redes sociais">
        <TickerLine />
        <TickerLine reverse />
      </section>
    </>
  );
}
