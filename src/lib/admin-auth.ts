import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';

export type AdminSession = { email: string; sub: string; expiresAt: number };
export type LoginFlow = { state: string; nonce: string; verifier: string; createdAt: number };
export const SESSION_COOKIE = 'caravelas_admin';
export const FLOW_COOKIE = 'caravelas_google_flow';
const basePath = process.env.BASE_PATH || '';

export function adminPath(path: string) { return `${basePath}${path}`; }
export function configured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.ADMIN_SESSION_SECRET && process.env.ADMIN_EMAILS && process.env.DATABASE_URL && process.env.ADMIN_SITE_ORIGIN);
}
export function allowed(email: string) {
  return (process.env.ADMIN_EMAILS || '').split(',').map(v => v.trim().toLowerCase()).filter(Boolean).includes(email.toLowerCase());
}
export function origin() {
  const value = process.env.ADMIN_SITE_ORIGIN;
  if (!value) throw new Error('ADMIN_SITE_ORIGIN is missing');
  const url = new URL(value);
  if (url.pathname !== '/' || url.search || url.hash) throw new Error('ADMIN_SITE_ORIGIN must be an origin');
  return url.origin;
}
export function callbackUrl() { return `${origin()}${adminPath('/api/admin/auth/callback')}`; }
export function randomToken() { return randomBytes(32).toString('base64url'); }
export function challenge(verifier: string) { return createHash('sha256').update(verifier).digest('base64url'); }

function key() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || Buffer.from(secret, 'base64url').length !== 32) throw new Error('ADMIN_SESSION_SECRET must be 32 random bytes encoded as base64url');
  return Buffer.from(secret, 'base64url');
}
export function seal(value: object) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
}
export function unseal<T>(value?: string): T | null {
  if (!value) return null;
  try {
    const data = Buffer.from(value, 'base64url');
    const decipher = createDecipheriv('aes-256-gcm', key(), data.subarray(0, 12));
    decipher.setAuthTag(data.subarray(12, 28));
    return JSON.parse(Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString()) as T;
  } catch { return null; }
}
export const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: basePath || '/' };

export async function getAdminSession(): Promise<AdminSession | null> {
  const session = unseal<AdminSession>((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session || !allowed(session.email) || !session.sub || session.expiresAt < Date.now()) return null;
  return session;
}
