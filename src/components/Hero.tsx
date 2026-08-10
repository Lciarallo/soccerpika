const TICKER = ['REDES SOCIAIS', '@SOCCERPIKA', 'PEÇAS ÚNICAS', 'ENVIO PARA TODO O BRASIL'];

export function Hero() {
  return (
    <section className="overflow-hidden pt-6 pb-10">
      {/* Wordmark — a assinatura da loja */}
      <h1 className="px-5 font-display text-[15vw] leading-[0.85] font-900 tracking-tighter sm:px-8 lg:text-[11rem]">
        SOCCER PIKA
        <span className="align-super text-[0.16em] tracking-normal">™</span>
      </h1>

      {/* Letreiro deslizante */}
      <div className="mt-8 overflow-hidden border-y border-line py-3" aria-hidden="true">
        <div className="marquee">
          {[0, 1].map((copy) => (
            <ul key={copy} className="flex shrink-0 items-center">
              {TICKER.map((word) => (
                <li
                  key={word}
                  className="flex items-center gap-8 px-8 font-display text-2xl font-800 tracking-tight whitespace-nowrap uppercase sm:text-4xl"
                >
                  {word}
                  <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-brand" />
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}
