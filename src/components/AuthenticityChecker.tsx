const STEPS = [
  ['Garimpo', 'Procuramos peça por peça em coleções, leilões e ex-atletas. Nada vem em lote.'],
  ['Conferência', 'Etiquetas, costuras, numeração e escudo conferidos com a referência da época.'],
  ['Registro', 'Fotografamos frente, verso, etiquetas e defeitos. O que você vê é o que chega.'],
  ['Envio', 'Embalagem protegida, código de rastreio e entrega para todo o Brasil.'],
];

export function AuthenticityChecker() {
  return (
    <section id="autenticidade" className="px-5 py-14 sm:px-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
        <div>
          <h2 className="font-display text-4xl font-900 uppercase sm:text-5xl">
            Autenticidade
          </h2>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
            Camisa rara sem procedência não vale nada. Todo manto passa pelo mesmo
            processo antes de entrar no acervo.
          </p>
        </div>

        <ol className="grid gap-x-8 gap-y-8 sm:grid-cols-2">
          {STEPS.map(([title, text], index) => (
            <li key={title}>
              <p className="font-display text-5xl font-900 text-brand tabular-nums">
                {String(index + 1).padStart(2, '0')}
              </p>
              <h3 className="mt-2 font-display text-xl font-800 uppercase">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
