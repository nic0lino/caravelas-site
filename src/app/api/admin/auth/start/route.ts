import { NextResponse } from 'next/server';
import { adminPath, callbackUrl, challenge, configured, cookieOptions, FLOW_COOKIE, randomToken, seal } from '@/lib/admin-auth';

export async function GET() {
  if (!configured()) return NextResponse.redirect(new URL(adminPath('/admin?error=config'), process.env.ADMIN_SITE_ORIGIN || 'http://localhost:3000'));
  const state = randomToken();
  const nonce = randomToken();
  const verifier = randomToken();
  const query = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!, redirect_uri: callbackUrl(), response_type: 'code',
    scope: 'openid email', state, nonce,
    code_challenge: challenge(verifier), code_challenge_method: 'S256',
  });
  const response = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${query}`);
  response.cookies.set(FLOW_COOKIE, seal({ state, nonce, verifier, createdAt: Date.now() }), { ...cookieOptions, maxAge: 600 });
  return response;
}
