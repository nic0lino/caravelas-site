import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession, origin } from '@/lib/admin-auth';
import { Edits, readAdminContent, saveAdminContent } from '@/lib/admin-content';
import { LANGS, langPath } from '@/content/langs';

export async function PUT(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Sesión expirada. Vuelve a entrar con Google.' }, { status: 401 });
  if (request.headers.get('origin') !== origin()) return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 });
  const body = await request.json().catch(() => null);
  const parsed = Edits.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Revisa los campos: hay datos incompletos o no válidos.' }, { status: 400 });
  try {
    await saveAdminContent(session.email, parsed.data);
    revalidateTag('site-content', { expire: 0 });
    LANGS.forEach(lang => revalidatePath(langPath(lang)));
    const snapshot = await readAdminContent();
    return NextResponse.json({ content: snapshot.content, versions: snapshot.versions });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron guardar los cambios.';
    return NextResponse.json({ error: message }, { status: message.includes('cambió') ? 409 : 500 });
  }
}
