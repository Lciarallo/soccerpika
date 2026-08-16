/**
 * Cliente da API da InfinitePay — cobrança Pix com taxa 0% para MEI.
 *
 * Escolhida no lugar do Mercado Pago pela taxa: 0% no Pix contra 0,99%. Duas
 * peculiaridades do contrato mandam no desenho de tudo que consome isto:
 *
 * 1. A criação da cobrança (`POST /links`) não devolve o que a consulta
 *    exige — `transaction_nsu` e `slug` só existem depois que alguém paga.
 *    Não dá para consultar uma cobrança recém-criada; o polling só funciona
 *    sobre coordenadas capturadas depois (webhook ou retorno do cliente).
 * 2. Nada é autenticado — o `handle` viaja na URL pública do checkout. Isso
 *    não enfraquece a confirmação: a prova continua sendo a resposta da
 *    InfinitePay lida por TLS, nunca o corpo que alguém entregou no webhook.
 *
 * O checkout é hospedado: o cliente é redirecionado para o domínio da
 * InfinitePay em vez de ver o QR Code na loja. É o preço dos 0%.
 */

const API_HOST = 'https://api.checkout.infinitepay.io';
const REQUEST_TIMEOUT_MS = 15_000;

/** Hosts aceitos para a URL de checkout devolvida pela API. */
const CHECKOUT_HOSTS = ['checkout.infinitepay.com.br', 'checkout.infinitepay.io'];

export class InfinitePayError extends Error {
  status: number;
  detail: unknown;

  constructor(message: string, status = 502, detail?: unknown) {
    super(message);
    this.name = 'InfinitePayError';
    this.status = status;
    this.detail = detail;
  }
}

function handle(): string {
  const value = process.env.INFINITEPAY_HANDLE?.trim();
  if (!value) {
    throw new InfinitePayError('INFINITEPAY_HANDLE não configurado no ambiente.', 500);
  }
  // A InfiniteTag é usada sem o `$`; aceitar com e sem evita um erro de
  // configuração que só apareceria como "link não gera".
  return value.replace(/^\$/, '');
}

export function isInfinitePayConfigured(): boolean {
  return Boolean(process.env.INFINITEPAY_HANDLE?.trim());
}

async function postJson(path: string, body: unknown): Promise<Record<string, unknown>> {
  const response = await fetch(`${API_HOST}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    redirect: 'error',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new InfinitePayError(
      `InfinitePay respondeu ${response.status} em ${path}.`,
      502,
      text.slice(0, 300),
    );
  }

  try {
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== 'object') throw new Error('resposta não é um objeto');
    return parsed as Record<string, unknown>;
  } catch (cause) {
    throw new InfinitePayError(
      `InfinitePay devolveu corpo ilegível em ${path}.`,
      502,
      (cause as Error).message,
    );
  }
}

/* -------------------------------------------------------------------------- */
/* Criação da cobrança                                                        */
/* -------------------------------------------------------------------------- */

export interface InfinitePayLinkInput {
  orderId: string;
  /** Inteiro, em centavos. Quem chama já validou. */
  amountCents: number;
  customer: { name: string; email: string; phone?: string };
  redirectUrl?: string;
  webhookUrl?: string;
}

/**
 * Encontra a URL do checkout na resposta.
 *
 * A documentação mostra `url`, mas não formaliza o contrato. Ler
 * defensivamente é barato; gravar um pedido sem link porque o campo mudou de
 * nome, não. Falha explícita se nada casar — nunca devolve vazio em silêncio.
 */
function extractCheckoutUrl(body: Record<string, unknown>): string {
  const named = [body.url, body.link, body.payment_url, body.checkout_url];
  for (const candidate of named) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }

  for (const value of Object.values(body)) {
    if (
      typeof value === 'string' &&
      /^https:\/\/checkout\.infinitepay\.(com\.br|io)\//.test(value)
    ) {
      return value;
    }
  }

  throw new InfinitePayError(
    `InfinitePay não devolveu URL de checkout. Campos recebidos: ${Object.keys(body).join(', ')}`,
    502,
  );
}

/**
 * A URL vai direto para `window.location.assign`/link no navegador do
 * cliente, então um host inesperado seria redirect aberto com CPF digitado.
 */
function assertCheckoutUrl(raw: string): string {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new InfinitePayError('InfinitePay devolveu uma URL de checkout inválida.', 502);
  }
  if (parsed.protocol !== 'https:' || !CHECKOUT_HOSTS.includes(parsed.hostname)) {
    throw new InfinitePayError(`URL de checkout em host inesperado: ${parsed.hostname}`, 502);
  }
  return parsed.toString();
}

export async function createInfinitePayLink(input: InfinitePayLinkInput): Promise<string> {
  const h = handle();

  const body: Record<string, unknown> = {
    handle: h,
    order_nsu: input.orderId,
    // Uma linha sintética com o total: o valor já passou por frete. Mandar
    // item a item faria o somatório da InfinitePay divergir do nosso por
    // arredondamento, e aí nada mais bate.
    items: [{ quantity: 1, price: input.amountCents, description: `Pedido ${input.orderId}` }],
    customer: {
      name: input.customer.name,
      email: input.customer.email,
      ...(input.customer.phone ? { phone_number: input.customer.phone } : {}),
    },
    ...(input.redirectUrl ? { redirect_url: input.redirectUrl } : {}),
    ...(input.webhookUrl ? { webhook_url: input.webhookUrl } : {}),
  };

  try {
    const response = await postJson('/links', body);
    return assertCheckoutUrl(extractCheckoutUrl(response));
  } catch (cause) {
    console.warn(
      'infinitepay: falha ao gerar link dinâmico, usando checkout direto do lojista',
      (cause as Error).message,
    );
    return `https://checkout.infinitepay.io/${encodeURIComponent(h)}`;
  }
}

/* -------------------------------------------------------------------------- */
/* Consulta — a prova                                                         */
/* -------------------------------------------------------------------------- */

export interface PaymentCoordinates {
  orderId: string;
  transactionNsu: string;
  /** Vazio até resolvido — cai no handle configurado. */
  slug: string;
}

export interface InfinitePayProof {
  paid: boolean;
  /** O que foi cobrado, em centavos. É este que tem de bater com o pedido. */
  amountCents: number | null;
  /** O que o comprador desembolsou; pode ser maior que `amountCents`. */
  paidAmountCents: number | null;
  captureMethod: string | null;
}

function intOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null;
}

/**
 * Pergunta à InfinitePay se aquela transação foi mesmo paga.
 *
 * É a única fonte de verdade sobre pagamento no sistema inteiro. Webhook e
 * retorno do cliente só dizem *qual* transação olhar.
 */
export async function checkInfinitePayPayment(
  coords: PaymentCoordinates,
): Promise<InfinitePayProof> {
  const h = handle();
  const response = await postJson('/payment_check', {
    handle: h,
    order_nsu: coords.orderId,
    transaction_nsu: coords.transactionNsu,
    slug: coords.slug || h,
  });

  if (response.success === false) {
    throw new InfinitePayError('InfinitePay recusou a consulta de pagamento.', 502);
  }

  const captureMethod = response.capture_method;
  return {
    paid: response.paid === true,
    amountCents: intOrNull(response.amount),
    paidAmountCents: intOrNull(response.paid_amount),
    captureMethod: typeof captureMethod === 'string' ? captureMethod : null,
  };
}

/* -------------------------------------------------------------------------- */
/* Coordenadas — extraídas do webhook ou do retorno do cliente                */
/* -------------------------------------------------------------------------- */

function parseCoordinates(raw: Record<string, unknown>): PaymentCoordinates | null {
  const meta = (raw.metadata && typeof raw.metadata === 'object' ? raw.metadata : {}) as Record<
    string,
    unknown
  >;
  const data = (raw.data && typeof raw.data === 'object' ? raw.data : {}) as Record<
    string,
    unknown
  >;

  const orderId =
    (typeof raw.order_nsu === 'string' ? raw.order_nsu : null) ??
    (typeof raw.orderId === 'string' ? raw.orderId : null) ??
    (typeof raw.order_id === 'string' ? raw.order_id : null) ??
    (typeof raw.reference_id === 'string' ? raw.reference_id : null) ??
    (typeof meta.order_nsu === 'string' ? meta.order_nsu : null) ??
    (typeof data.order_nsu === 'string' ? data.order_nsu : null);

  const transactionNsu =
    (typeof raw.transaction_nsu === 'string' ? raw.transaction_nsu : null) ??
    (typeof raw.transactionNsu === 'string' ? raw.transactionNsu : null) ??
    (typeof raw.transaction_id === 'string' ? raw.transaction_id : null) ??
    (typeof raw.nsu === 'string' ? raw.nsu : null) ??
    (typeof raw.id === 'string' ? raw.id : null) ??
    (typeof data.transaction_nsu === 'string' ? data.transaction_nsu : null);

  const slug =
    (typeof raw.slug === 'string' ? raw.slug : null) ??
    (typeof raw.handle === 'string' ? raw.handle : null) ??
    (typeof raw.infinite_tag === 'string' ? raw.infinite_tag : null) ??
    (typeof data.slug === 'string' ? data.slug : null);

  if (!orderId) return null;
  return {
    orderId: orderId.trim(),
    transactionNsu: (transactionNsu ?? orderId).trim(),
    slug: (slug ?? '').trim(),
  };
}

/** Junta coordenadas candidatas do corpo e da query string, sem repetição. */
export function collectCoordinates(body: unknown, query: unknown): PaymentCoordinates[] {
  const list: PaymentCoordinates[] = [];

  if (body && typeof body === 'object') {
    const direct = parseCoordinates(body as Record<string, unknown>);
    if (direct) list.push(direct);

    const dataObj = (body as { data?: unknown }).data;
    if (dataObj && typeof dataObj === 'object') {
      const parsed = parseCoordinates(dataObj as Record<string, unknown>);
      if (parsed) list.push(parsed);
    }
  }

  if (query && typeof query === 'object') {
    const parsed = parseCoordinates(query as Record<string, unknown>);
    if (parsed) list.push(parsed);
  }

  const seen = new Set<string>();
  return list.filter((c) => {
    const key = `${c.orderId}:${c.transactionNsu}:${c.slug}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
