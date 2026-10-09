import { asset } from '@/lib/asset';

// Credentials strip under the hero features. Brand names/labels are intentionally not translated.
// The Google badge carries its rating as artwork ("4.9 · more than 100 reviews"): update the SVG when it changes.
// TODO(contract): move the two URLs below into SiteConfig (next to affiliateHref) if they should be editable from the sheet.
const WODILY_HREF = 'https://wodily.com/city/pt/lisbon';
const GOOGLE_HREF = 'https://maps.app.goo.gl/5fRqnZK19u8THFEz9';
const CROSSFIT_FALLBACK = 'https://www.crossfit.com/affiliate';

type Badge = { id: string; src: string; w: number; h: number; alt: string; href: string };

// Mobile: one linear row, widths weighted by aspect ratio so all three share the same height.
// md+: fixed shared height (matches the 70px CTA on desktop), natural widths.
export function Badges({ affiliateHref }: { affiliateHref?: string }) {
  const badges: Badge[] = [
    { id: 'crossfit', src: '/assets/badge-crossfit.svg', w: 275, h: 108, alt: 'CrossFit Affiliates', href: affiliateHref ?? CROSSFIT_FALLBACK },
    { id: 'google', src: '/assets/badge-google.svg', w: 272, h: 106, alt: 'Google: 4.9, more than 100 reviews', href: GOOGLE_HREF },
    { id: 'wodily', src: '/assets/badge-wodily.svg', w: 273, h: 116, alt: 'Top 1 em Wodily Lisboa', href: WODILY_HREF },
  ];

  return (
    <ul className="flex w-full items-center gap-3 md:w-auto md:gap-6">
      {badges.map((b) => (
        <li key={b.id} className="min-w-0 grow-[var(--r)] basis-0 md:grow-0 md:basis-auto" style={{ '--r': b.w / b.h } as React.CSSProperties}>
          <a
            href={b.href}
            target="_blank"
            rel="noopener noreferrer"
            className="block opacity-90 transition-[opacity,translate] duration-200 ease-out hover:-translate-y-0.5 hover:opacity-100 focus-visible:-translate-y-0.5 focus-visible:opacity-100"
          >
            <img src={asset(b.src)} alt={b.alt} width={b.w} height={b.h} className="block h-auto w-full md:h-[clamp(52px,6vw,70px)] md:w-auto" />
          </a>
        </li>
      ))}
    </ul>
  );
}
