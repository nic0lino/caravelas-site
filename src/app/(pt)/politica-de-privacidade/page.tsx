import type { Metadata } from 'next';
import { LegalPage } from '@/components/Legal/LegalPage';
import { privacy } from '@/content/legal/privacy';

export const metadata: Metadata = { title: `${privacy.title} — CrossFit Caravelas` };

export default function Page() {
  return <LegalPage doc={privacy} />;
}
