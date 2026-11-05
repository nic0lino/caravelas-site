import { NextResponse } from 'next/server';
import { adminPath, cookieOptions, origin, SESSION_COOKIE } from '@/lib/admin-auth';

export async function POST(request: Request) {
  if (request.headers.get('origin') !== origin()) return new Response(null, { status: 403 });
  const response = NextResponse.redirect(`${origin()}${adminPath('/admin')}`, 303);
  response.cookies.set(SESSION_COOKIE, '', { ...cookieOptions, maxAge: 0 });
  return response;
}
