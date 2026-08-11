import { readFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { join } from 'node:path';
import type { Plugin, ViteDevServer } from 'vite';

/**
 * Monta a pasta `api/` como middleware do Vite, para `npm run dev` rodar o
 * site inteiro — banco e sessão incluídos — sem depender de `vercel dev`.
 *
 * Em produção quem serve essas rotas é a Vercel; aqui só reproduzimos o
 * roteamento por arquivo e o par (req, res) que os handlers esperam.
 */
export function devApi(): Plugin {
  return {
    name: 'soccerpika-dev-api',
    apply: 'serve',

    configureServer(server: ViteDevServer) {
      // Lê .env sem dependência: o Vite só expõe as VITE_* ao processo.
      loadDotEnv();

      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        if (!url.pathname.startsWith('/api/')) return next();

        try {
          const mod = await server.ssrLoadModule(resolveRoute(url.pathname), {
            fixStacktrace: true,
          });
          const handler = mod.default as (rq: unknown, rs: unknown) => Promise<void>;
          if (typeof handler !== 'function') {
            return send(res, 500, { error: 'Rota sem handler padrão.' });
          }

          await handler(
            await enhanceRequest(req, url),
            enhanceResponse(res),
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (message.includes('Failed to load url')) {
            return send(res, 404, { error: `Rota não encontrada: ${url.pathname}` });
          }
          server.config.logger.error(`[api] ${url.pathname}: ${message}`);
          send(res, 500, { error: message });
        }
      });
    },
  };
}

/** `/api/products/abc` -> `/api/products/[id].ts` quando não há arquivo exato. */
function resolveRoute(pathname: string): string {
  const parts = pathname.replace(/^\/api\//, '').split('/').filter(Boolean);
  const direct = join('/api', ...parts) + '.ts';

  if (existsInProject(direct)) return direct;

  // Última parte vira parâmetro dinâmico.
  if (parts.length > 1) {
    const dynamic = join('/api', ...parts.slice(0, -1), '[id].ts');
    if (existsInProject(dynamic)) return dynamic;
  }
  return direct;
}

function existsInProject(relative: string): boolean {
  try {
    readFileSync(join(process.cwd(), relative));
    return true;
  } catch {
    return false;
  }
}

/** Acrescenta `query` e `body` já parseados, como a Vercel entrega. */
async function enhanceRequest(req: IncomingMessage, url: URL) {
  const query: Record<string, string> = Object.fromEntries(url.searchParams);

  // Parâmetro dinâmico da rota: /api/products/<id>
  const parts = url.pathname.replace(/^\/api\//, '').split('/').filter(Boolean);
  if (parts.length > 1 && !existsInProject(join('/api', ...parts) + '.ts')) {
    query.id = parts[parts.length - 1];
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks);

  const type = String(req.headers['content-type'] ?? '');
  let body: unknown = undefined;
  if (raw.length) {
    body = type.includes('application/json')
      ? safeJson(raw.toString('utf8'))
      : type.startsWith('image/')
        ? raw
        : raw.toString('utf8');
  }

  return Object.assign(req, { query, body, cookies: {} });
}

function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** Dá a `res` os atalhos `status()` e `json()` do runtime da Vercel. */
function enhanceResponse(res: ServerResponse) {
  const enhanced = res as ServerResponse & {
    status: (code: number) => typeof enhanced;
    json: (data: unknown) => void;
    send: (data: unknown) => void;
  };
  enhanced.status = (code: number) => {
    res.statusCode = code;
    return enhanced;
  };
  enhanced.json = (data: unknown) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(data));
  };
  enhanced.send = (data: unknown) => res.end(data as string);
  return enhanced;
}

function send(res: ServerResponse, code: number, data: unknown) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

/** Carrega .env para process.env, sem sobrescrever o que já existe. */
function loadDotEnv() {
  for (const file of ['.env.local', '.env']) {
    let text: string;
    try {
      text = readFileSync(join(process.cwd(), file), 'utf8');
    } catch {
      continue;
    }
    for (const line of text.split('\n')) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/i.exec(line);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key] !== undefined) continue;
      process.env[key] = rawValue.trim().replace(/^["']|["']$/g, '');
    }
  }
}
