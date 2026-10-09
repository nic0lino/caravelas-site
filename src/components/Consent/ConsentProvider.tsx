'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { UiStrings } from '@/i18n';

type Status = 'loading' | 'unset' | 'accepted' | 'declined';
interface Ctx {
  status: Status;
  accept: () => void;
  decline: () => void;
  reopen: () => void;
}

const KEY = 'caravelas-cookie-consent';
const ConsentContext = createContext<Ctx>({ status: 'loading', accept: () => {}, decline: () => {}, reopen: () => {} });
export const useConsent = () => useContext(ConsentContext);

/**
 * The only third-party cookies on the site come from the Google Maps embed, so consent gates that and nothing else.
 * The choice is stored in localStorage (try/catch: it can be unavailable) and can be changed from the footer.
 */
export function ConsentProvider({ t, cookiesHref, children }: { t: UiStrings; cookiesHref?: string; children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem(KEY); } catch {}
    if (saved === 'accepted' || saved === 'declined') setStatus(saved);
    else { setStatus('unset'); setOpen(true); }
  }, []);

  const save = useCallback((s: 'accepted' | 'declined') => {
    try { localStorage.setItem(KEY, s); } catch {}
    setStatus(s);
    setOpen(false);
  }, []);

  const value = useMemo<Ctx>(
    () => ({ status, accept: () => save('accepted'), decline: () => save('declined'), reopen: () => setOpen(true) }),
    [status, save],
  );

  return (
    <ConsentContext.Provider value={value}>
      {children}
      {open && (
        // slim bar glued to the bottom edge of the window (like the original site's), not a floating card
        <div role="region" aria-label={t.cookies.label} className="fixed inset-x-0 bottom-0 z-[60] border-t border-[#95be35] bg-ink text-white">
          <div className="mx-auto flex max-w-[1248px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-1.5 md:px-6">
            <p className="min-w-0 flex-1 basis-[24rem] text-2xs">
              {t.cookies.text}{' '}
              {cookiesHref && <a href={cookiesHref} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{t.contact.cookies}</a>}
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <button type="button" onClick={value.decline} className="rounded border border-white/60 px-2.5 py-0.5 text-2xs font-bold text-white hover:bg-white/10">{t.cookies.decline}</button>
              <button type="button" onClick={value.accept} className="rounded border border-[#66793a] bg-gradient-to-b from-[#99c82a] from-[66%] to-[#4b6215] px-2.5 py-0.5 text-2xs font-bold text-moss-900 hover:brightness-110">{t.cookies.accept}</button>
            </div>
          </div>
        </div>
      )}
    </ConsentContext.Provider>
  );
}

export function CookieSettingsButton({ label, className = '' }: { label: string; className?: string }) {
  const { reopen } = useConsent();
  return <button type="button" onClick={reopen} className={className}>{label}</button>;
}
