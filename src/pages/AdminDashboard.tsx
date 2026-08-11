import { useEffect, useMemo, useState } from 'react';
import { Loader2, Pencil, Plus, Trash2, Upload, X } from 'lucide-react';
import * as api from '../lib/api';
import type { Jersey } from '../types/jersey';
import { formatPrice } from '../lib/format';
import { useSession } from '../hooks/session-context';

const CATEGORIES = ['Brasileiros', 'Europeus', 'Seleções', 'Sulamericanas', 'De Jogo', 'Outros'];
const ERAS = ['80s', '90s', '2000s', '2010s+', 'Sem data'];

/** Campos editáveis de um produto, no formato do formulário. */
interface Draft {
  id?: string;
  name: string;
  slug: string;
  club: string;
  season: string;
  era: string;
  category: string;
  brand: string;
  description: string;
  price: string;
  stockQty: string;
  sizes: string;
  images: string[];
  isMatchWorn: boolean;
  isAutographed: boolean;
  isPublished: boolean;
}

const emptyDraft = (): Draft => ({
  name: '',
  slug: '',
  club: '',
  season: '',
  era: 'Sem data',
  category: 'Outros',
  brand: '',
  description: '',
  price: '',
  stockQty: '1',
  sizes: '',
  images: [],
  isMatchWorn: false,
  isAutographed: false,
  isPublished: true,
});

const toDraft = (p: Jersey): Draft => ({
  id: p.id,
  name: p.name,
  slug: p.slug ?? '',
  club: p.club,
  season: p.season,
  era: p.era,
  category: p.category,
  brand: p.brand,
  description: p.description,
  price: String(p.price),
  stockQty: String(p.stockQty),
  sizes: p.sizes.join(', '),
  images: p.images,
  isMatchWorn: p.isMatchWorn,
  isAutographed: p.isAutographed,
  isPublished: p.isPublished ?? true,
});

export function AdminDashboard({ onExit }: { onExit: () => void }) {
  const { user, isAdmin, loading: sessionLoading } = useSession();
  const [products, setProducts] = useState<Jersey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [query, setQuery] = useState('');

  const reload = () =>
    api
      .fetchProducts()
      .then(setProducts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    if (isAdmin) void reload();
  }, [isAdmin]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? products.filter((p) => `${p.name} ${p.brand} ${p.category}`.toLowerCase().includes(q))
      : products;
  }, [products, query]);

  const stats = useMemo(
    () => ({
      total: products.length,
      inStock: products.filter((p) => p.inStock).length,
      hidden: products.filter((p) => p.isPublished === false).length,
      value: products.reduce((s, p) => s + p.price * p.stockQty, 0),
    }),
    [products],
  );

  if (sessionLoading) {
    return <Centered><Loader2 className="animate-spin" /></Centered>;
  }

  if (!isAdmin) {
    return (
      <Centered>
        <h1 className="font-display text-3xl font-900 uppercase">Acesso restrito</h1>
        <p className="mt-2 text-sm text-muted">
          {user
            ? 'Esta conta não é de administrador.'
            : 'Entre com uma conta de administrador para ver o painel.'}
        </p>
        <button type="button" onClick={onExit} className="btn btn-dark mt-6 px-6 py-3 text-sm uppercase">
          Voltar à loja
        </button>
      </Centered>
    );
  }

  const remove = async (product: Jersey) => {
    if (!confirm(`Remover "${product.name}"? Isso não pode ser desfeito.`)) return;
    try {
      await api.deleteProduct(product.id);
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao remover.');
    }
  };

  return (
    <div className="min-h-screen bg-paper">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-5 py-4 sm:px-8">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="" width={40} height={40} className="h-10 w-10" />
          <div>
            <h1 className="font-display text-xl font-900 uppercase">Painel</h1>
            <p className="text-xs text-muted">{user?.email}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setDraft(emptyDraft())}
            className="btn btn-primary px-4 py-2.5 text-xs uppercase"
          >
            <Plus size={15} /> Novo produto
          </button>
          <button type="button" onClick={onExit} className="btn btn-outline px-4 py-2.5 text-xs uppercase">
            Ver loja
          </button>
        </div>
      </header>

      <div className="px-5 py-8 sm:px-8">
        <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <Stat label="Produtos" value={String(stats.total)} />
          <Stat label="Disponíveis" value={String(stats.inStock)} />
          <Stat label="Ocultos" value={String(stats.hidden)} />
          <Stat label="Valor em estoque" value={formatPrice(stats.value)} />
        </dl>

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filtrar por nome, marca ou categoria…"
          className="mt-8 w-full max-w-md border-b border-ink bg-transparent py-2.5 text-sm focus:outline-none"
        />

        {error && (
          <p className="mt-4 flex items-center justify-between bg-surface p-3 text-sm text-danger">
            {error}
            <button type="button" onClick={() => setError(null)} aria-label="Dispensar">
              <X size={15} />
            </button>
          </p>
        )}

        {loading ? (
          <p className="mt-10 flex items-center gap-2 text-sm text-muted">
            <Loader2 size={15} className="animate-spin" /> Carregando catálogo…
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-3xl border-collapse text-sm">
              <thead>
                <tr className="border-b border-ink text-left text-xs tracking-widest text-muted uppercase">
                  <th className="py-3 pr-4 font-semibold">Produto</th>
                  <th className="py-3 pr-4 font-semibold">Categoria</th>
                  <th className="py-3 pr-4 text-right font-semibold">Preço</th>
                  <th className="py-3 pr-4 text-right font-semibold">Estoque</th>
                  <th className="py-3 pr-4 font-semibold">Status</th>
                  <th className="py-3 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => (
                  <tr key={p.id} className="border-b border-line">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 shrink-0 bg-surface">
                          {p.images[0] && (
                            <img src={p.images[0]} alt="" className="h-full w-full object-contain" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{p.name}</p>
                          <p className="text-xs text-muted">{p.brand || 'sem marca'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-muted">{p.category}</td>
                    <td className="py-3 pr-4 text-right tabular-nums">{formatPrice(p.price)}</td>
                    <td className="py-3 pr-4 text-right tabular-nums">{p.stockQty}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-block px-2 py-0.5 text-[11px] font-bold uppercase ${
                          p.isPublished === false
                            ? 'bg-surface text-muted'
                            : p.inStock
                              ? 'bg-success text-paper'
                              : 'bg-ink text-paper'
                        }`}
                      >
                        {p.isPublished === false ? 'Oculto' : p.inStock ? 'Ativo' : 'Esgotado'}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setDraft(toDraft(p))}
                          aria-label={`Editar ${p.name}`}
                          className="text-muted hover:text-ink"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(p)}
                          aria-label={`Remover ${p.name}`}
                          className="text-muted hover:text-brand"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {visible.length === 0 && (
              <p className="py-12 text-center text-sm text-muted">Nenhum produto encontrado.</p>
            )}
          </div>
        )}
      </div>

      {draft && (
        <ProductForm
          draft={draft}
          onClose={() => setDraft(null)}
          onSaved={() => {
            setDraft(null);
            void reload();
          }}
        />
      )}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs tracking-widest text-muted uppercase">{label}</dt>
      <dd className="mt-1 font-display text-2xl font-900">{value}</dd>
    </div>
  );
}

// ---------------------------------------------------------------- formulário ---

function ProductForm({
  draft,
  onClose,
  onSaved,
}: {
  draft: Draft;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(draft);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    try {
      const urls = await Promise.all([...files].map((f) => api.uploadImage(f)));
      set('images', [...form.images, ...urls].slice(0, 12));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha no upload.');
    } finally {
      setUploading(false);
    }
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const payload = {
      name: form.name,
      slug: form.slug || form.name,
      club: form.club,
      season: form.season,
      era: form.era,
      category: form.category,
      brand: form.brand,
      description: form.description,
      price: Number(form.price),
      stockQty: Number(form.stockQty),
      sizes: form.sizes.split(',').map((s) => s.trim()).filter(Boolean),
      images: form.images,
      isMatchWorn: form.isMatchWorn,
      isAutographed: form.isAutographed,
      isPublished: form.isPublished,
    };

    try {
      if (form.id) await api.updateProduct(form.id, payload);
      else await api.createProduct(payload);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao salvar.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/60 p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={form.id ? 'Editar produto' : 'Novo produto'}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <form onSubmit={save} className="relative w-full max-w-3xl bg-paper p-6 sm:p-10">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 hover:text-brand"
        >
          <X size={24} strokeWidth={1.5} />
        </button>

        <h2 className="font-display text-2xl font-900 uppercase">
          {form.id ? 'Editar produto' : 'Novo produto'}
        </h2>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Input label="Nome" value={form.name} onChange={(v) => set('name', v)} required className="sm:col-span-2" />
          <Input label="Slug (opcional)" value={form.slug} onChange={(v) => set('slug', v)} placeholder="gerado a partir do nome" />
          <Input label="Marca" value={form.brand} onChange={(v) => set('brand', v)} />
          <Input label="Clube" value={form.club} onChange={(v) => set('club', v)} />
          <Input label="Temporada" value={form.season} onChange={(v) => set('season', v)} placeholder="1995" />

          <Select label="Categoria" value={form.category} options={CATEGORIES} onChange={(v) => set('category', v)} />
          <Select label="Época" value={form.era} options={ERAS} onChange={(v) => set('era', v)} />

          <Input label="Preço (R$)" value={form.price} onChange={(v) => set('price', v)} type="number" step="0.01" required />
          <Input label="Estoque" value={form.stockQty} onChange={(v) => set('stockQty', v)} type="number" required />

          <Input label="Tamanhos (separados por vírgula)" value={form.sizes} onChange={(v) => set('sizes', v)} placeholder="P, M, G, GG" className="sm:col-span-2" />

          <div className="sm:col-span-2">
            <label htmlFor="descricao" className="text-xs tracking-widest text-muted uppercase">
              Descrição
            </label>
            <textarea
              id="descricao"
              rows={3}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              className="mt-1.5 w-full resize-y border-b border-ink bg-transparent py-2.5 text-sm focus:outline-none"
            />
          </div>

          {/* imagens */}
          <div className="sm:col-span-2">
            <span className="text-xs tracking-widest text-muted uppercase">Fotos</span>
            <div className="mt-2 flex flex-wrap gap-3">
              {form.images.map((url) => (
                <div key={url} className="relative h-24 w-24 bg-surface">
                  <img src={url} alt="" className="h-full w-full object-contain" />
                  <button
                    type="button"
                    onClick={() => set('images', form.images.filter((i) => i !== url))}
                    aria-label="Remover foto"
                    className="absolute -top-2 -right-2 bg-ink p-1 text-paper hover:bg-brand"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}

              <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 border border-dashed border-line text-muted hover:border-ink hover:text-ink">
                {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                <span className="text-[10px] uppercase">{uploading ? 'Enviando' : 'Enviar'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  multiple
                  className="sr-only"
                  onChange={(e) => upload(e.target.files)}
                />
              </label>
            </div>
            <p className="mt-2 text-[11px] text-muted">
              JPG, PNG, WebP ou AVIF, até 8 MB cada. A primeira foto é a capa.
            </p>
          </div>

          <div className="flex flex-wrap gap-6 sm:col-span-2">
            <Check label="Peça de jogo" checked={form.isMatchWorn} onChange={(v) => set('isMatchWorn', v)} />
            <Check label="Autografada" checked={form.isAutographed} onChange={(v) => set('isAutographed', v)} />
            <Check label="Publicado na loja" checked={form.isPublished} onChange={(v) => set('isPublished', v)} />
          </div>
        </div>

        {error && <p className="mt-5 bg-surface p-3 text-sm text-danger">{error}</p>}

        <div className="mt-7 flex gap-3">
          <button type="submit" disabled={busy} className="btn btn-primary flex-1 py-3.5 text-sm uppercase">
            {busy && <Loader2 size={16} className="animate-spin" />}
            {form.id ? 'Salvar alterações' : 'Cadastrar produto'}
          </button>
          <button type="button" onClick={onClose} className="btn btn-outline px-6 py-3.5 text-sm uppercase">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  className = '',
  ...rest
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
  type?: string;
  step?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div className={className}>
      <label className="text-xs tracking-widest text-muted uppercase">
        {label}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          {...rest}
          className="mt-1.5 w-full border-b border-ink bg-transparent py-2.5 text-sm normal-case focus:outline-none"
        />
      </label>
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="text-xs tracking-widest text-muted uppercase">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full border-b border-ink bg-transparent py-2.5 text-sm normal-case focus:outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[var(--color-brand)]"
      />
      {label}
    </label>
  );
}
