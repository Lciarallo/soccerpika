import { useState, type FormEvent } from 'react';
import { Send } from 'lucide-react';

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
    <section id="vender" className="mx-auto max-w-7xl px-4 py-14">
      <div className="grid gap-0 border-2 border-ink lg:grid-cols-[1fr_1.1fr]">
        <div className="flex flex-col justify-center border-ink bg-navy p-8 text-paper lg:border-r-2">
          <h2 className="font-display text-3xl font-900 uppercase">
            Tem uma camisa
            <br />
            <span className="underline decoration-brand decoration-4 underline-offset-4">
              para vender?
            </span>
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-paper/75">
            Compramos e recebemos em consignação camisas de jogo, retrô,
            autografadas e peças de seleção. Conte o que você tem — respondemos
            com uma avaliação honesta, mesmo que a resposta seja não.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-paper/75">
            <li>· Avaliação sem compromisso</li>
            <li>· Pagamento à vista ou consignação</li>
            <li>· Aceitamos peças com marcas de uso</li>
          </ul>
        </div>

        <form onSubmit={submit} className="grid gap-4 bg-paper p-8 sm:grid-cols-2">
          <Field name="peca" label="Qual a peça?" placeholder="Ex.: Camisa Grêmio 1995 nº 10" required />
          <Field name="ano" label="Ano / temporada" placeholder="Ex.: 1995" />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="estado" className="font-display text-xs font-800 tracking-widest uppercase">
              Estado da peça
            </label>
            <select
              id="estado"
              name="estado"
              required
              className="border-2 border-line px-3 py-2.5 text-sm focus:border-ink focus:outline-none"
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

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label htmlFor="detalhes" className="font-display text-xs font-800 tracking-widest uppercase">
              Detalhes (opcional)
            </label>
            <textarea
              id="detalhes"
              name="detalhes"
              rows={3}
              placeholder="Origem da peça, etiquetas, autógrafos, defeitos…"
              className="resize-y border-2 border-line px-3 py-2.5 text-sm focus:border-ink focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <button type="submit" className="btn btn-primary w-full py-3.5 text-sm uppercase">
              {sent ? 'Abrindo WhatsApp…' : 'Enviar para avaliação'}
              <Send size={15} />
            </button>
            <p className="mt-2 text-center text-[11px] text-muted">
              Abrimos o WhatsApp com sua mensagem pronta — você só confirma o envio.
            </p>
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
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="font-display text-xs font-800 tracking-widest uppercase">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="text"
        placeholder={placeholder}
        required={required}
        className="border-2 border-line px-3 py-2.5 text-sm placeholder:text-muted focus:border-ink focus:outline-none"
      />
    </div>
  );
}
