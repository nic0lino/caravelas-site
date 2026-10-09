import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { RootDocument } from '@/components/RootDocument';
import { LANGS, isLang } from '@/content/langs';
import { buildMetadata } from '@/lib/metadata';

export const dynamicParams = false;
export const generateStaticParams = () => LANGS.filter((l) => l !== 'pt').map((lang) => ({ lang }));

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return isLang(lang) ? buildMetadata(lang) : {};
}

export default async function Layout({ children, params }: { children: ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang) || lang === 'pt') notFound();
  return <RootDocument lang={lang}>{children}</RootDocument>;
}
