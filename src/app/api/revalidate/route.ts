import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { LANGS, langPath } from '@/content/langs';

// Juanpi owns this endpoint; minimal version so the Apps Script "Publicar" menu has a target.
export async function POST(req: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || req.headers.get('x-revalidate-secret') !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  for (const l of LANGS) revalidatePath(langPath(l));
  return NextResponse.json({ ok: true, at: new Date().toISOString() });
}
