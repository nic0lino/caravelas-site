'use client';

import { useConsent } from '../Consent/ConsentProvider';

/**
 * Real Google Maps widget (lazy). Google's embed sets third-party cookies, so it only loads once the visitor has
 * accepted cookies; until then (or if declined) a placeholder with a link to Google Maps takes its place.
 */
export function MapEmbed({
  query, hl, title, href, alt, offLabel, loadLabel, openLabel,
}: {
  query: string; hl: string; title: string; href: string; alt: string;
  offLabel: string; loadLabel: string; openLabel: string;
}) {
  const { status, accept } = useConsent();
  const src = `https://www.google.com/maps?q=${encodeURIComponent(query)}&hl=${hl}&z=16&output=embed`;
  return (
    <div className="relative aspect-[383/285] w-full overflow-hidden rounded-lg bg-[#1b1b1b] md:aspect-[374/301] md:w-[374px] md:rounded-none">
      {status === 'accepted' ? (
        <>
          <iframe title={title} src={src} loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade" className="absolute inset-0 h-full w-full border-0" />
          <a href={href} target="_blank" rel="noopener noreferrer" className="sr-only-text">{alt}</a>
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center text-xs text-white/80 md:text-sm">
          <p>{offLabel}</p>
          <button type="button" onClick={accept} className="rounded-lg border border-[#99c82a] px-4 py-2 font-bold text-[#99c82a] hover:bg-[#99c82a] hover:text-footer">{loadLabel}</button>
          <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-white">{openLabel}</a>
        </div>
      )}
    </div>
  );
}
