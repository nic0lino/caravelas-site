import type { SVGProps } from 'react';
import { asset } from '@/lib/asset';

type P = SVGProps<SVGSVGElement>;
const base: P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };

export const Facebook = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
    <path d="M14 8V6.5c0-.7.2-1 1.2-1H17V2h-2.6C11.5 2 10 3.7 10 6.2V8H8v3.5h2V22h4V11.5h2.7L17 8z" />
  </svg>
);
export const Instagram = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} strokeWidth={2} {...p}>
    <rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".6" fill="currentColor" />
  </svg>
);
export const WhatsApp = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} strokeWidth={1.8} {...p}>
    <path d="M3 21l1.6-4.6A8.5 8.5 0 1 1 8 19.6z" /><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.7-2-1-1 .9c-1-.4-2-1.4-2.4-2.4l.9-1-1-2z" />
  </svg>
);
export const Mail = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} strokeWidth={1.8} {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3.5 7l8.5 6 8.5-6" />
  </svg>
);
export const PauseIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
);
export const PlayIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}><path d="M8 5l11 7-11 7z" /></svg>
);
export const MenuIcon = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} strokeWidth={2} {...p}><path d="M3 6h18M3 12h18M3 18h18" /></svg>
);
export const CloseIcon = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} strokeWidth={2} {...p}><path d="M5 5l14 14M19 5L5 19" /></svg>
);
/** Logo mark (wave) used as marquee separator. */
export const WaveMark = (p: P) => (
  <svg viewBox="0 0 64 28" {...base} strokeWidth={2} {...p}>
    <path d="M2 18c8-14 14-14 20-4s12 8 18 0 12-6 22 0" />
  </svg>
);

/** Figma line-art icons (dark source) rendered white. */
const featureIcon = (name: string) =>
  function FeatureIcon({ className }: { className?: string }) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={asset(`/assets/feature-${name}.svg`)} alt="" aria-hidden width={101} height={106} className={`object-contain [filter:brightness(0)_invert(1)] ${className ?? ''}`} />;
  };
export const FeatureIconFor = { lifebuoy: featureIcon('lifebuoy'), anchor: featureIcon('anchor'), ship: featureIcon('ship') } as const;
