import Link from 'next/link';
import type { ReactNode } from 'react';
import type { LegalDoc } from '@/content/legal/types';

const TOKEN = /(\*\*[^*]+\*\*|https?:\/\/[^\s,;)]+|www\.[^\s,;)]+|[\w.+-]+@[\w-]+(?:\.[\w-]+)+)/g;

/** Plain text -> inline nodes: **bold** lead-ins, URLs and e-mail addresses become links (trailing dot stays outside). */
function inline(text: string): ReactNode[] {
  return text.split(TOKEN).map((part, i) => {
    if (!part) return null;
    if (part.startsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    const isUrl = /^(https?:\/\/|www\.)/.test(part);
    const isMail = !isUrl && /@/.test(part);
    if (!isUrl && !isMail) return part;
    const clean = part.replace(/[.]+$/, '');
    const tail = part.slice(clean.length);
    const href = isMail ? `mailto:${clean}` : clean.startsWith('http') ? clean : `https://${clean}`;
    return (
      <span key={i}>
        <a href={href} {...(isUrl ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className="underline underline-offset-4">{clean}</a>
        {tail}
      </span>
    );
  });
}

/** A legal page: just text on the same grey as the team section. */
export function LegalPage({ doc }: { doc: LegalDoc }) {
  return (
    <main className="min-h-screen bg-[#e8e6e6] text-black lg:bg-[#ededed]">
      <div className="mx-auto max-w-[760px] px-4 pb-20 pt-8 md:px-6 md:pt-12">
        <Link href="/" prefetch={false} className="text-sm font-bold uppercase tracking-[0.2em] text-[#496700] underline-offset-4 hover:underline">
          ← Voltar
        </Link>
        <h1 className="mt-8 text-xl font-bold uppercase leading-tight text-[#304400]">{doc.title}</h1>
        <div className="mt-8 space-y-4 text-base leading-relaxed">
          {doc.blocks.map((b, i) =>
            'h' in b ? (
              <h2 key={i} className="!mt-10 border-b border-[#a4cf3d] pb-1 text-lg font-bold text-[#496700]">{b.h}</h2>
            ) : 'p' in b ? (
              <p key={i}>{inline(b.p)}</p>
            ) : (
              <ul key={i} className="list-disc space-y-2 pl-6">
                {b.ul.map((li, j) => <li key={j}>{inline(li)}</li>)}
              </ul>
            ),
          )}
        </div>
      </div>
    </main>
  );
}
