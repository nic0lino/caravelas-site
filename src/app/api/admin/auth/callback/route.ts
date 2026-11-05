import { NextRequest, NextResponse } from 'next/server';
import { adminPath, allowed, callbackUrl, cookieOptions, FLOW_COOKIE, origin, SESSION_COOKIE, seal, unseal, type LoginFlow } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  const fail = (reason: string) => NextResponse.redirect(`${origin()}${adminPath(`/admin?error=${reason}`)}`);
  const flow = unseal<LoginFlow>(request.cookies.get(FLOW_COOKIE)?.value);
  const code = request.nextUrl.searchParams.get('code');
  if (!flow || Date.now() - flow.createdAt > 600_000 || !code || flow.state !== request.nextUrl.searchParams.get('state')) return fail('login');
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, cache: 'no-store',
    body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, redirect_uri: callbackUrl(), grant_type: 'authorization_code', code_verifier: flow.verifier }),
  });
  if (!tokenResponse.ok) return fail('login');
  const token = await tokenResponse.json() as { id_token?: string };
  if (!token.id_token) return fail('login');
  const identityResponse = await fetch('https://oauth2.googleapis.com/tokeninfo', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, cache: 'no-store', body: new URLSearchParams({ id_token: token.id_token }),
  });
  if (!identityResponse.ok) return fail('login');
  const identity = await identityResponse.json() as { aud?: string; iss?: string; exp?: string; email?: string; email_verified?: string | boolean; nonce?: string; sub?: string };
  if (identity.aud !== process.env.GOOGLE_CLIENT_ID || !['accounts.google.com', 'https://accounts.google.com'].includes(identity.iss || '') || Number(identity.exp) * 1000 < Date.now() || identity.nonce !== flow.nonce || String(identity.email_verified) !== 'true' || !identity.email || !identity.sub) return fail('login');
  if (!allowed(identity.email)) return fail('access');
  const response = NextResponse.redirect(`${origin()}${adminPath('/admin')}`);
  response.cookies.set(FLOW_COOKIE, '', { ...cookieOptions, maxAge: 0 });
  response.cookies.set(SESSION_COOKIE, seal({ email: identity.email.toLowerCase(), sub: identity.sub, expiresAt: Date.now() + 12 * 60 * 60 * 1000 }), { ...cookieOptions, maxAge: 12 * 60 * 60 });
  return response;
}
