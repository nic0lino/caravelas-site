import type { ReactNode } from 'react';
import { RootDocument } from '@/components/RootDocument';
import { buildMetadata } from '@/lib/metadata';

export const metadata = buildMetadata('pt');

export default function Layout({ children }: { children: ReactNode }) {
  return <RootDocument lang="pt">{children}</RootDocument>;
}
