import type { Lang } from '@/content/langs';

// Simplified 3:2 flags (no coats of arms) — inline SVG so they render the same on every OS.
const flags: Record<Lang, React.ReactNode> = {
  pt: (
    <>
      <rect width="30" height="20" fill="#ff0000" />
      <rect width="12" height="20" fill="#006600" />
      <circle cx="12" cy="10" r="4.2" fill="none" stroke="#ffd800" strokeWidth="1" />
      <path d="M9.6 7.6h4.8v3.2a2.4 2.4 0 0 1-4.8 0z" fill="#fff" stroke="#ff0000" strokeWidth=".9" />
    </>
  ),
  en: (
    <>
      <rect width="30" height="20" fill="#012169" />
      <path d="M0 0l30 20M30 0L0 20" stroke="#fff" strokeWidth="4" />
      <path d="M0 0l30 20M30 0L0 20" stroke="#c8102e" strokeWidth="1.5" />
      <path d="M15 0v20M0 10h30" stroke="#fff" strokeWidth="6" />
      <path d="M15 0v20M0 10h30" stroke="#c8102e" strokeWidth="3.4" />
    </>
  ),
  es: (
    <>
      <rect width="30" height="20" fill="#aa151b" />
      <rect y="5" width="30" height="10" fill="#f1bf00" />
    </>
  ),
  fr: (
    <>
      <rect width="30" height="20" fill="#fff" />
      <rect width="10" height="20" fill="#0055a4" />
      <rect x="20" width="10" height="20" fill="#ef4135" />
    </>
  ),
  de: (
    <>
      <rect width="30" height="20" fill="#ffce00" />
      <rect width="30" height="13.34" fill="#dd0000" />
      <rect width="30" height="6.67" fill="#000" />
    </>
  ),
  ru: (
    <>
      <rect width="30" height="20" fill="#fff" />
      <rect y="6.67" width="30" height="13.33" fill="#0039a6" />
      <rect y="13.34" width="30" height="6.66" fill="#d52b1e" />
    </>
  ),
  uk: (
    <>
      <rect width="30" height="20" fill="#ffd500" />
      <rect width="30" height="10" fill="#005bbb" />
    </>
  ),
};

export function Flag({ lang, className = 'h-[19px] w-[29px]' }: { lang: Lang; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 30 20" className={`shrink-0 rounded-[2px] ring-1 ring-white/20 ${className}`}>
      {flags[lang]}
    </svg>
  );
}
