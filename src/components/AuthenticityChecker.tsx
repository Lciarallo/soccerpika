import { Camera, PackageCheck, Ruler, Search } from 'lucide-react';

const STEPS = [
  {
    icon: Search,
    title: 'Garimpo',
    text: 'Procuramos peça por peça em coleções, leilões e ex-atletas. Nada é comprado em lote.',
  },
  {
    icon: Ruler,
    title: 'Conferência',
    text: 'Etiquetas, costuras, numeração e escudo são comparados com a referência da época.',
  },
  {
    icon: Camera,
    title: 'Registro',
    text: 'Fotografamos frente, verso, etiquetas e defeitos. O que você vê é a peça que chega.',
  },
  {
    icon: PackageCheck,
    title: 'Envio',
    text: 'Embalagem protegida, código de rastreio e envio para todo o Brasil.',
  },
];

export function AuthenticityChecker() {
  return (
    <section id="autenticidade" className="border-y-2 border-ink bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-14">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-900 uppercase sm:text-4xl">
            Como garantimos <span className="text-brand">o que é original</span>
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted">
            Camisa rara sem procedência não vale nada. Todo manto do acervo passa
            pelo mesmo processo antes de entrar no catálogo — e as fotos mostram
            exatamente o estado real da peça, marcas de uso incluídas.
          </p>
        </div>

        <ol className="mt-10 grid gap-0 border-2 border-ink bg-paper sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, text }, index) => (
            <li
              key={title}
              className="border-ink p-6 not-last:border-b-2 sm:not-nth-[2n]:border-r-2 sm:nth-[-n+2]:border-b-2 sm:last:border-b-0 lg:border-r-2 lg:border-b-0 lg:last:border-r-0"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center bg-brand font-display text-sm font-900 text-paper">
                  {index + 1}
                </span>
                <Icon size={20} className="text-navy" />
              </div>
              <h3 className="mt-4 font-display text-base font-800 uppercase">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
