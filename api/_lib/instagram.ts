const INSTAGRAM_GRAPH_ORIGIN = 'https://graph.instagram.com';
const DEFAULT_API_VERSION = 'v26.0';
const MEDIA_FIELDS = [
  'id',
  'media_type',
  'media_url',
  'permalink',
  'thumbnail_url',
  'timestamp',
  'username',
  'alt_text',
  'children{id,media_type,media_url,thumbnail_url}',
].join(',');

const ALLOWED_IMAGE_HOSTS = ['cdninstagram.com', 'fbcdn.net'];
const ALLOWED_PERMALINK_HOSTS = ['instagram.com'];

export interface InstagramPost {
  id: string;
  href: string;
  src: string;
  alt: string;
}

export interface InstagramConfig {
  accessToken: string;
  userId: string;
  apiVersion: string;
}

interface InstagramMedia {
  id?: unknown;
  media_type?: unknown;
  media_url?: unknown;
  permalink?: unknown;
  thumbnail_url?: unknown;
  timestamp?: unknown;
  username?: unknown;
  alt_text?: unknown;
  children?: unknown;
}

interface InstagramMediaWithDate {
  post: InstagramPost;
  timestamp: number;
}

export class InstagramConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InstagramConfigError';
  }
}

export class InstagramUpstreamError extends Error {
  status: number;

  constructor(status: number) {
    super(`A API do Instagram respondeu com status ${status}.`);
    this.name = 'InstagramUpstreamError';
    this.status = status;
  }
}

export function instagramConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): InstagramConfig {
  const accessToken = env.INSTAGRAM_ACCESS_TOKEN?.trim() ?? '';
  const userId = env.INSTAGRAM_USER_ID?.trim() ?? '';
  const apiVersion = env.INSTAGRAM_GRAPH_API_VERSION?.trim() || DEFAULT_API_VERSION;

  if (!accessToken) {
    throw new InstagramConfigError('INSTAGRAM_ACCESS_TOKEN não configurado.');
  }
  if (!/^\d{5,30}$/.test(userId)) {
    throw new InstagramConfigError('INSTAGRAM_USER_ID ausente ou inválido.');
  }
  if (!/^v\d{1,2}\.0$/.test(apiVersion)) {
    throw new InstagramConfigError('INSTAGRAM_GRAPH_API_VERSION inválida.');
  }

  return { accessToken, userId, apiVersion };
}

export async function fetchInstagramPosts(
  config: InstagramConfig,
  fetcher: typeof fetch = fetch,
): Promise<InstagramPost[]> {
  const url = new URL(
    `${INSTAGRAM_GRAPH_ORIGIN}/${config.apiVersion}/${config.userId}/media`,
  );
  url.searchParams.set('fields', MEDIA_FIELDS);
  url.searchParams.set('limit', '12');

  const response = await fetcher(url, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${config.accessToken}`,
    },
    signal: AbortSignal.timeout(6_000),
  });

  if (!response.ok) {
    throw new InstagramUpstreamError(response.status);
  }

  const payload: unknown = await response.json();
  return parseInstagramPosts(payload).slice(0, 3);
}

export function parseInstagramPosts(payload: unknown): InstagramPost[] {
  if (!isRecord(payload) || !Array.isArray(payload.data)) return [];

  return payload.data
    .map(toInstagramPost)
    .filter((item): item is InstagramMediaWithDate => item !== null)
    .sort((a, b) => b.timestamp - a.timestamp)
    .map(({ post }) => post);
}

function toInstagramPost(media: unknown): InstagramMediaWithDate | null {
  if (!isRecord(media)) return null;
  const item = media as InstagramMedia;
  const id = stringValue(item.id);
  const href = safeHttpsUrl(item.permalink, ALLOWED_PERMALINK_HOSTS);
  const mediaType = stringValue(item.media_type);
  const carouselPreview = firstCarouselImage(item.children);
  const preferredImage = mediaType === 'VIDEO'
    ? item.thumbnail_url ?? item.media_url
    : item.media_url ?? carouselPreview ?? item.thumbnail_url;
  const src = safeHttpsUrl(preferredImage, ALLOWED_IMAGE_HOSTS);

  if (!id || !href || !src) return null;

  const altText = normalizeAltText(item.alt_text);
  const username = stringValue(item.username).replace(/^@+/, '');
  const parsedTimestamp = Date.parse(stringValue(item.timestamp));

  return {
    post: {
      id,
      href,
      src,
      alt: altText || (username
        ? `Publicação de @${username} no Instagram`
        : 'Publicação da Soccer Pika no Instagram'),
    },
    timestamp: Number.isNaN(parsedTimestamp) ? 0 : parsedTimestamp,
  };
}

function firstCarouselImage(value: unknown): unknown {
  if (!isRecord(value) || !Array.isArray(value.data)) return undefined;

  for (const child of value.data) {
    if (!isRecord(child)) continue;
    const mediaType = stringValue(child.media_type);
    const candidate = mediaType === 'VIDEO'
      ? child.thumbnail_url ?? child.media_url
      : child.media_url ?? child.thumbnail_url;
    if (candidate) return candidate;
  }

  return undefined;
}

function safeHttpsUrl(value: unknown, allowedHosts: string[]): string | null {
  const raw = stringValue(value);
  if (!raw) return null;

  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return null;
    const host = url.hostname.toLowerCase();
    if (!allowedHosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeAltText(value: unknown): string {
  const altText = stringValue(value).replace(/\s+/g, ' ').trim();
  return altText.length > 180 ? `${altText.slice(0, 177)}…` : altText;
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
