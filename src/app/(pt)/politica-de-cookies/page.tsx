import type { Metadata } from 'next';
import { LegalPage } from '@/components/Legal/LegalPage';
import { cookies } from '@/content/legal/cookies';

export const metadata: Metadata = { title: `${cookies.title} — CrossFit Caravelas` };

export default function Page() {
  return <LegalPage doc={cookies} />;
}
