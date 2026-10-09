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
        <div role="region" aria-label={t.cookies.label} className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-[600px] rounded-[16px] border border-[#95be35] bg-ink p-4 text-white shadow-[0_8px_30px_rgba(0,0,0,0.5)] md:bottom-5">
          <p className="text-xs leading-[1.45] md:text-sm">
            {t.cookies.text}{' '}
            {cookiesHref && <a href={cookiesHref} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{t.contact.cookies}</a>}
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
            <button type="button" onClick={value.decline} className="rounded-lg border border-white/60 px-4 py-2 text-xs font-bold text-white hover:bg-white/10 md:text-sm">{t.cookies.decline}</button>
            <button type="button" onClick={value.accept} className="rounded-lg border border-[#66793a] bg-gradient-to-b from-[#99c82a] from-[66%] to-[#4b6215] px-4 py-2 text-xs font-bold text-moss-900 hover:brightness-110 md:text-sm">{t.cookies.accept}</button>
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
