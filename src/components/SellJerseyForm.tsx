import { useState, type FormEvent } from 'react';

export function SellJerseyForm() {
  const [sent, setSent] = useState(false);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const texto = [
      'Olá! Tenho uma camisa para vender na Soccer Pika:',
      '',
      `Peça: ${form.get('peca')}`,
      `Ano/temporada: ${form.get('ano') || 'não sei'}`,
      `Estado: ${form.get('estado')}`,
      `Contato: ${form.get('contato')}`,
      form.get('detalhes') ? `\nDetalhes: ${form.get('detalhes')}` : '',
    ].join('\n');

    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
    setSent(true);
    event.currentTarget.reset();
    setTimeout(() => setSent(false), 4000);
  };

  return (
    <section id="vender" className="px-5 py-14 sm:px-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
        <div>
          <h2 className="font-display text-4xl font-900 uppercase sm:text-5xl">Contato</h2>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
            Compramos e recebemos em consignação camisas de jogo, retrô,
            autografadas e de seleção. Conte o que você tem — respondemos com
            uma avaliação honesta, mesmo que a resposta seja não.
          </p>
        </div>

        <form onSubmit={submit} className="grid max-w-2xl gap-6 sm:grid-cols-2">
          <Field name="peca" label="Qual a peça?" placeholder="Ex.: Camisa Grêmio 1995 nº 10" required />
          <Field name="ano" label="Ano / temporada" placeholder="Ex.: 1995" />

          <div>
            <label htmlFor="estado" className="text-xs tracking-widest text-muted uppercase">
              Estado da peça
            </label>
            <select
              id="estado"
              name="estado"
              required
              className="mt-1.5 w-full border-b border-ink bg-transparent py-2.5 text-sm focus:outline-none"
            >
              <option value="">Selecione…</option>
              <option>Nova, com etiqueta</option>
              <option>Excelente, pouco uso</option>
              <option>Boa, marcas leves de uso</option>
              <option>Usada em jogo</option>
              <option>Com defeitos</option>
            </select>
          </div>

          <Field name="contato" label="Seu contato" placeholder="WhatsApp ou e-mail" required />

          <div className="sm:col-span-2">
            <label htmlFor="detalhes" className="text-xs tracking-widest text-muted uppercase">
              Detalhes (opcional)
            </label>
            <textarea
              id="detalhes"
              name="detalhes"
              rows={3}
              placeholder="Origem da peça, etiquetas, autógrafos, defeitos…"
              className="mt-1.5 w-full resize-y border-b border-ink bg-transparent py-2.5 text-sm
                         placeholder:text-muted focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <button type="submit" className="btn btn-primary w-full py-4 text-sm tracking-wide uppercase">
              {sent ? 'Abrindo WhatsApp…' : 'Enviar para avaliação'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

interface FieldProps {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
}

function Field({ name, label, placeholder, required }: FieldProps) {
  return (
    <div>
      <label htmlFor={name} className="text-xs tracking-widest text-muted uppercase">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="text"
        placeholder={placeholder}
        required={required}
        className="mt-1.5 w-full border-b border-ink bg-transparent py-2.5 text-sm
                   placeholder:text-muted focus:outline-none"
      />
    </div>
  );
}
