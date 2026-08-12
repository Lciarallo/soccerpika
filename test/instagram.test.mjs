import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'node_modules/.cache/spk-test');
mkdirSync(OUT, { recursive: true });

const result = await build({
  entryPoints: [join(ROOT, 'api/_lib/instagram.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  logLevel: 'silent',
});
const output = join(OUT, 'instagram-lib.mjs');
writeFileSync(output, result.outputFiles[0].text);

const {
  fetchInstagramPosts,
  instagramConfigFromEnv,
  InstagramConfigError,
  parseInstagramPosts,
} = await import(`${pathToFileURL(output).href}?t=${Date.now()}`);

const TOKEN = 'token-secreto-que-nao-pode-vazar';
const config = {
  accessToken: TOKEN,
  userId: '123456789012345',
  apiVersion: 'v26.0',
};

const payload = {
  data: [
    {
      id: 'imagem-antiga',
      media_type: 'IMAGE',
      media_url: 'https://scontent.cdninstagram.com/antiga.jpg?assinatura=publica',
      permalink: 'https://www.instagram.com/p/antiga/',
      timestamp: '2026-08-08T12:00:00Z',
      username: 'soccerpika',
    },
    {
      id: 'video-novo',
      media_type: 'VIDEO',
      media_url: 'https://scontent.cdninstagram.com/video.mp4',
      thumbnail_url: 'https://scontent.cdninstagram.com/capa-video.jpg',
      permalink: 'https://www.instagram.com/reel/video-novo/',
      timestamp: '2026-08-11T12:00:00Z',
      alt_text: '  Camisa rara   em destaque  ',
    },
    {
      id: 'carrossel',
      media_type: 'CAROUSEL_ALBUM',
      permalink: 'https://instagram.com/p/carrossel/',
      timestamp: '2026-08-10T12:00:00Z',
      children: {
        data: [
          {
            id: 'filho',
            media_type: 'IMAGE',
            media_url: 'https://scontent.xx.fbcdn.net/carrossel.jpg',
          },
        ],
      },
    },
    {
      id: 'host-malicioso',
      media_type: 'IMAGE',
      media_url: 'https://cdninstagram.com.evil.example/foto.jpg',
      permalink: 'https://www.instagram.com/p/invalido/',
      timestamp: '2026-08-12T12:00:00Z',
    },
  ],
};

let requestedUrl = '';
let authorization = '';
const posts = await fetchInstagramPosts(config, async (input, init) => {
  requestedUrl = String(input);
  authorization = new Headers(init?.headers).get('Authorization') ?? '';
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});

assert.equal(authorization, `Bearer ${TOKEN}`);
assert.equal(requestedUrl.includes(TOKEN), false, 'token não pode aparecer na URL');
assert.equal(requestedUrl.startsWith('https://graph.instagram.com/v26.0/'), true);
assert.equal(requestedUrl.includes('access_token'), false);
assert.deepEqual(posts.map((post) => post.id), [
  'video-novo',
  'carrossel',
  'imagem-antiga',
]);
assert.equal(posts[0].src, 'https://scontent.cdninstagram.com/capa-video.jpg');
assert.equal(posts[0].alt, 'Camisa rara em destaque');
assert.equal(posts[1].src, 'https://scontent.xx.fbcdn.net/carrossel.jpg');
assert.equal(JSON.stringify(posts).includes(TOKEN), false, 'token não pode aparecer na resposta');

assert.equal(parseInstagramPosts({ data: [{
  id: 'http-bloqueado',
  media_type: 'IMAGE',
  media_url: 'http://scontent.cdninstagram.com/foto.jpg',
  permalink: 'https://instagram.com/p/http/',
}] }).length, 0);

assert.throws(
  () => instagramConfigFromEnv({}),
  (error) => error instanceof InstagramConfigError,
);
assert.deepEqual(
  instagramConfigFromEnv({
    INSTAGRAM_ACCESS_TOKEN: TOKEN,
    INSTAGRAM_USER_ID: '123456789012345',
  }),
  config,
);

const handlerBuild = await build({
  entryPoints: [join(ROOT, 'api/instagram.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  logLevel: 'silent',
});
const handlerOutput = join(OUT, 'instagram-handler.mjs');
writeFileSync(handlerOutput, handlerBuild.outputFiles[0].text);
const { default: handler } = await import(
  `${pathToFileURL(handlerOutput).href}?t=${Date.now()}`
);

const originalFetch = globalThis.fetch;
const originalConsoleError = console.error;
const previousEnv = {
  token: process.env.INSTAGRAM_ACCESS_TOKEN,
  userId: process.env.INSTAGRAM_USER_ID,
  version: process.env.INSTAGRAM_GRAPH_API_VERSION,
};

let handlerFetches = 0;
globalThis.fetch = async () => {
  handlerFetches++;
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
process.env.INSTAGRAM_ACCESS_TOKEN = TOKEN;
process.env.INSTAGRAM_USER_ID = config.userId;
process.env.INSTAGRAM_GRAPH_API_VERSION = config.apiVersion;

const success = responseRecorder();
await handler({ method: 'GET', query: {} }, success.res);
assert.equal(success.state.status, 200);
assert.match(String(success.state.headers['cache-control']), /s-maxage=900/);
assert.equal(success.state.body.posts.length, 3);
assert.equal(JSON.stringify(success.state.body).includes(TOKEN), false);

const queryRejected = responseRecorder();
await handler({ method: 'GET', query: { access_token: 'tentativa' } }, queryRejected.res);
assert.equal(queryRejected.state.status, 400);
assert.equal(handlerFetches, 1, 'query arbitrária não pode chegar à Meta');

const methodRejected = responseRecorder();
await handler({ method: 'POST', query: {} }, methodRejected.res);
assert.equal(methodRejected.state.status, 405);
assert.equal(methodRejected.state.headers.allow, 'GET');

delete process.env.INSTAGRAM_ACCESS_TOKEN;
console.error = () => undefined;
const unavailable = responseRecorder();
await handler({ method: 'GET', query: {} }, unavailable.res);
assert.equal(unavailable.state.status, 503);
assert.equal(unavailable.state.headers['cache-control'], 'private, no-store');
assert.deepEqual(unavailable.state.body.posts, []);

globalThis.fetch = originalFetch;
console.error = originalConsoleError;
restoreEnv('INSTAGRAM_ACCESS_TOKEN', previousEnv.token);
restoreEnv('INSTAGRAM_USER_ID', previousEnv.userId);
restoreEnv('INSTAGRAM_GRAPH_API_VERSION', previousEnv.version);

console.log('Instagram: token isolado, mídia normalizada e URLs validadas.');

function responseRecorder() {
  const state = { status: 200, headers: {}, body: undefined };
  const res = {
    setHeader(name, value) {
      state.headers[name.toLowerCase()] = value;
    },
    status(status) {
      state.status = status;
      return res;
    },
    json(body) {
      state.body = body;
      return body;
    },
  };
  return { res, state };
}

function restoreEnv(name, value) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
