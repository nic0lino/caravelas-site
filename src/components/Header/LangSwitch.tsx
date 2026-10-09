'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { LANGS, langPath, type Lang } from '@/content/langs';
import { LANG_META } from '@/i18n';
import { Flag } from '../icons/Flags';

/**
 * Language menu (disclosure): shows the current code, lists every language by its native name.
 * Keeps the current #hash and remembers the choice (only to preselect, never to redirect).
 */
export function LangSwitch({ lang, label, className = '' }: { lang: Lang; label: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [hash, setHash] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const listId = useId();

  useEffect(() => {
    const sync = () => setHash(window.location.hash);
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); button.current?.focus(); }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const remember = (l: Lang) => {
    try { localStorage.setItem('caravelas-lang', l); } catch {}
  };

  return (
    <div ref={root} className={`relative ${className}`}>
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`${label}: ${LANG_META[lang].name}`}
        onClick={() => setOpen((o) => !o)}
        className="flex h-full w-full items-center justify-center gap-3 rounded-[10px] border border-black bg-ink px-5 text-white md:gap-[33px]"
      >
        <Flag lang={lang} />
        <svg aria-hidden viewBox="0 0 16 10" className={`h-2.5 w-4 shrink-0 text-white transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 1.5l7 7 7-7" />
        </svg>
      </button>
      {open && (
        <ul id={listId} className="absolute right-0 top-full z-50 mt-2 min-w-[180px] overflow-hidden rounded-[10px] border border-black bg-ink py-1 text-base shadow-lg">
          {LANGS.map((l) => (
            <li key={l}>
              {l === lang ? (
                <span aria-current="true" className="flex items-center gap-3 px-4 py-2 font-bold text-white">
                  <Flag lang={l} className="h-4 w-6" />{LANG_META[l].name}<span className="ml-auto text-xs text-white/60">{LANG_META[l].code}</span>
                </span>
              ) : (
                <Link
                  href={`${langPath(l)}${hash}`}
                  prefetch={false} // segment prefetches 404 when the site is mounted behind nicolino.zip's rewrite
                  lang={l}
                  hrefLang={l}
                  onClick={() => { remember(l); setOpen(false); }}
                  className="flex items-center gap-3 px-4 py-2 font-light text-white/80 hover:bg-white/10 hover:text-white"
                >
                  <Flag lang={l} className="h-4 w-6" />{LANG_META[l].name}<span className="ml-auto text-xs text-white/50">{LANG_META[l].code}</span>
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
