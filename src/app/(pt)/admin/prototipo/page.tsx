import { AdminPanel } from '@/components/admin/AdminPanel';
import { SiteContent } from '@/content/schema';
import seed from '@/content/sources/fixtures/admin-seed.json';

export const metadata = { title: 'Prototipo del panel · Caravelas', robots: { index: false, follow: false } };

export default function AdminPrototypePage() {
  return <main className="admin-theme px-4 py-8 md:px-8 md:py-12">
    <AdminPanel
      demo
      initialContent={SiteContent.parse(seed)}
      initialVersions={{ schedule: '', coaches: '', prices: '', config: '' }}
      email=""
    />
  </main>;
}
