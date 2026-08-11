/**
 * Autenticação: hash de senha, sessão assinada e leitura do usuário atual.
 *
 * Senha: scrypt do `node:crypto` — sem dependência extra e com custo de CPU
 * calibrado contra força bruta. O hash guarda o sal junto, no formato
 * `scrypt$N$r$p$sal$derivado`, para que os parâmetros possam mudar sem
 * invalidar as senhas antigas.
 *
 * Sessão: token `payload.assinatura` em cookie httpOnly, assinado com
 * HMAC-SHA256. Sem estado no servidor; a validade vive dentro do payload.
 */

import {
  createHmac,
  randomBytes,
  scrypt as scryptCb,
  timingSafeEqual,
  type ScryptOptions,
} from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './db.js';

/** `promisify` perde a sobrecarga com opções, então envolvemos à mão. */
const scrypt = (
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scryptCb(password, salt, keylen, options, (err, key) =>
      err ? reject(err) : resolve(key),
    );
  });

const COOKIE = 'spk_session';
const SESSION_DAYS = 30;

// Parâmetros do scrypt. N=2^15 leva ~100ms, que é o alvo para login.
const N = 32768;
const R = 8;
const P = 1;
const KEYLEN = 64;
// 128 * N * r = 32 MB, exatamente o teto padrão do Node — precisa ser elevado.
const MAXMEM = 64 * 1024 * 1024;

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new AuthError('SESSION_SECRET ausente ou curto demais (mín. 32 chars).', 500);
  }
  return secret;
}

// ------------------------------------------------------------------ senha ---

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, KEYLEN, {
    N,
    r: R,
    p: P,
    maxmem: MAXMEM,
  });
  return ['scrypt', N, R, P, salt.toString('base64'), derived.toString('base64')].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, saltB64, hashB64] = stored.split('$');
  if (scheme !== 'scrypt') return false;

  const salt = Buffer.from(saltB64, 'base64');
  const expected = Buffer.from(hashB64, 'base64');
  const derived = await scrypt(password, salt, expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: MAXMEM,
  });

  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

/**
 * Regras mínimas de senha. Comprimento pesa mais do que exigir símbolo, então
 * cobramos 8 caracteres e barramos as escolhas mais óbvias.
 */
const COMMON = new Set([
  '12345678', '123456789', 'senha123', 'password', 'qwertyui', 'soccerpika',
]);

export function assertStrongPassword(password: unknown): string {
  const value = String(password ?? '');
  if (value.length < 8) {
    throw new AuthError('A senha precisa de pelo menos 8 caracteres.', 400);
  }
  if (value.length > 200) {
    throw new AuthError('Senha longa demais.', 400);
  }
  if (COMMON.has(value.toLowerCase())) {
    throw new AuthError('Escolha uma senha menos previsível.', 400);
  }
  return value;
}

// ----------------------------------------------------------------- sessão ---

const b64url = (b: Buffer) => b.toString('base64url');

interface SessionPayload {
  sub: string;
  role: 'user' | 'admin';
  exp: number;
}

function sign(payload: SessionPayload): string {
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  const mac = createHmac('sha256', sessionSecret()).update(body).digest();
  return `${body}.${b64url(mac)}`;
}

function verify(token: string): SessionPayload | null {
  const [body, mac] = token.split('.');
  if (!body || !mac) return null;

  const expected = createHmac('sha256', sessionSecret()).update(body).digest();
  const given = Buffer.from(mac, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as SessionPayload;
    return payload.exp > Date.now() ? payload : null;
  } catch {
    return null;
  }
}

export function setSessionCookie(res: VercelResponse, user: { id: string; role: 'user' | 'admin' }) {
  const token = sign({
    sub: user.id,
    role: user.role,
    exp: Date.now() + SESSION_DAYS * 86_400_000,
  });

  res.setHeader('Set-Cookie', [
    serializeCookie(COOKIE, token, SESSION_DAYS * 86_400),
  ]);
}

export function clearSessionCookie(res: VercelResponse) {
  res.setHeader('Set-Cookie', [serializeCookie(COOKIE, '', 0)]);
}

function serializeCookie(name: string, value: string, maxAge: number): string {
  const parts = [
    `${name}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ];
  // Em produção o cookie só trafega em HTTPS; em `vercel dev` não há TLS.
  if (process.env.VERCEL) parts.push('Secure');
  return parts.join('; ');
}

function readCookie(req: VercelRequest, name: string): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}

// --------------------------------------------------------------- usuários ---

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  cpf: string | null;
  phone: string | null;
}

/** Usuário da sessão, ou null. Relê do banco para pegar troca de papel. */
export async function currentUser(req: VercelRequest): Promise<CurrentUser | null> {
  const token = readCookie(req, COOKIE);
  if (!token) return null;

  const payload = verify(token);
  if (!payload) return null;

  const [user] = await sql<CurrentUser[]>`
    SELECT id, email, name, role, cpf, phone FROM users WHERE id = ${payload.sub}
  `;
  return user ?? null;
}

export async function requireUser(req: VercelRequest): Promise<CurrentUser> {
  const user = await currentUser(req);
  if (!user) throw new AuthError('Faça login para continuar.');
  return user;
}

export async function requireAdmin(req: VercelRequest): Promise<CurrentUser> {
  const user = await requireUser(req);
  if (user.role !== 'admin') {
    throw new AuthError('Acesso restrito ao administrador.', 403);
  }
  return user;
}

/** Resposta padrão para AuthError, para os handlers não repetirem try/catch. */
export function sendAuthError(res: VercelResponse, error: unknown): boolean {
  if (error instanceof AuthError) {
    res.status(error.status).json({ error: error.message });
    return true;
  }
  return false;
}
