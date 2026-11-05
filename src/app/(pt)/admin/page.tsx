import { getAdminSession, configured, adminPath } from '@/lib/admin-auth';
import { readAdminContent } from '@/lib/admin-content';
import { AdminPanel } from '@/components/admin/AdminPanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Administração · Caravelas', robots: { index: false, follow: false } };

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await getAdminSession();
  const params = await searchParams;
  const ready = configured();
  let snapshot: Awaited<ReturnType<typeof readAdminContent>> | null = null;
  let dataError = '';
  if (session) {
    try { snapshot = await readAdminContent(); }
    catch (error) { dataError = error instanceof Error ? error.message : 'No se pudo abrir la base de datos.'; }
  }
  return <div className="admin-theme px-4 py-8 md:px-8 md:py-12">
    {snapshot && session ? <AdminPanel initialContent={snapshot.content} initialVersions={snapshot.versions} email={session.email} /> :
      <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center">
        <Card className="w-full border-border bg-card text-card-foreground shadow-2xl">
          <CardHeader className="space-y-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-yellow text-2xl font-black text-moss-950">C</div>
            <div><CardTitle className="text-xl">Caravelas · Administração</CardTitle><CardDescription className="mt-2 text-muted-foreground">Entra con tu cuenta de Google para editar el contenido del sitio.</CardDescription></div>
          </CardHeader>
          <CardContent className="space-y-5">
            {!ready && <p role="alert" className="rounded-lg border border-yellow/40 bg-yellow/10 p-3 text-sm">Falta configurar el acceso de Google o la base de datos. Consulta la guía de instalación del panel.</p>}
            {params.error === 'access' && <p role="alert" className="rounded-lg border border-yellow/40 bg-yellow/10 p-3 text-sm">Este correo de Google no está en la lista de acceso.</p>}
            {params.error === 'login' && <p role="alert" className="rounded-lg border border-yellow/40 bg-yellow/10 p-3 text-sm">No se pudo completar el inicio de sesión. Inténtalo de nuevo.</p>}
            {dataError && <p role="alert" className="rounded-lg border border-yellow/40 bg-yellow/10 p-3 text-sm">{dataError}</p>}
            {ready ? <Button asChild size="lg" className="w-full font-bold"><a href={adminPath('/api/admin/auth/start')}>Continuar con Google</a></Button> : <Button size="lg" className="w-full font-bold" disabled>Continuar con Google</Button>}
            <Button variant="outline" asChild className="w-full"><a href={adminPath('/admin/prototipo')}>Ver prototipo del panel</a></Button>
            <a className="block text-center text-sm text-muted-foreground underline underline-offset-4" href={adminPath('/')}>Volver al sitio</a>
          </CardContent>
        </Card>
      </div>}
  </div>;
}
