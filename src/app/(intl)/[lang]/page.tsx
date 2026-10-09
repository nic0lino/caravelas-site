import { notFound } from 'next/navigation';
import { HomePage } from '@/components/HomePage';
import { isLang } from '@/content/langs';

// Must be a literal for Next's static analysis; keep in sync with REVALIDATE_SECONDS (300).
export const revalidate = 300;

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang) || lang === 'pt') notFound();
  return <HomePage lang={lang} />;
}
