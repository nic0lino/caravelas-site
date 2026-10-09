'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CloseIcon, MenuIcon } from '../icons';

export function MobileMenu({
  openLabel,
  closeLabel,
  links,
  footer,
}: {
  openLabel: string;
  closeLabel: string;
  links: { href: string; label: string }[];
  footer: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const overlay = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const el = overlay.current!;
    const focusables = () => Array.from(el.querySelectorAll<HTMLElement>('a[href],button'));
    focusables()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return setOpen(false);
      if (e.key !== 'Tab') return;
      const f = focusables();
      const first = f[0]!, last = f[f.length - 1]!;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    const btn = button.current;
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
      btn?.focus();
    };
  }, [open]);

  return (
    <>
      <button ref={button} type="button" aria-expanded={open} aria-controls="mobile-menu" aria-label={openLabel} onClick={() => setOpen(true)} className="p-2 text-white lg:hidden">
        <MenuIcon className="h-7 w-7" />
      </button>
      {open && (
        <div ref={overlay} id="mobile-menu" role="dialog" aria-modal="true" aria-label={openLabel} className="fixed inset-0 z-50 flex flex-col bg-moss-900 px-6 py-6 lg:hidden">
          <div className="flex justify-end">
            <button type="button" aria-label={closeLabel} onClick={() => setOpen(false)} className="p-2 text-white"><CloseIcon className="h-7 w-7" /></button>
          </div>
          <nav className="mt-6 flex flex-col gap-6">
            {links.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="text-xl font-light uppercase text-white hover:text-yellow">{l.label}</a>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-6 pb-4">{footer}</div>
        </div>
      )}
    </>
  );
}
