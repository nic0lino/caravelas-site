import type { Feature, SiteConfig } from '@/content/schema';
import { localize, type Lang } from '@/content/select';
import type { UiStrings } from '@/i18n';
import { LangSwitch } from '../Header/LangSwitch';
import { Badges } from './Badges';
import { CtaButton } from './CtaButton';
import { FeatureRotator } from './FeatureRotator';
import { HeroBackground } from './HeroBackground';

// Figma 1:10 (1728×667): content column 1000 wide starting 225px from the top, items-end;
// title 96/78% Lato Black #fde00a (563 wide), feature row gap 30, CTA 402×70 r16.
// Mobile 21:2583 (440 wide): px 40, title 64 at 117, feature row, CTA 285×43 r10 centered.
export function Hero({ lang, t, config, features }: { lang: Lang; t: UiStrings; config: SiteConfig; features: Feature[] }) {
  const views = [...features]
    .sort((a, b) => a.order - b.order)
    .map((f) => ({ id: f.id, icon: f.icon, title: localize(f.title, lang), text: localize(f.text, lang) }));

  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden bg-black">
      <HeroBackground />
      <div aria-hidden className="absolute inset-0 -z-10 bg-[#4f6d0c]/75 mix-blend-multiply" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,rgba(14,22,2,0.85),rgba(14,22,2,0.1)_60%),linear-gradient(to_right,rgba(0,0,0,0.6),rgba(0,0,0,0.25)_70%)]" />
      <div className="absolute right-10 top-5 z-10 lg:hidden"><LangSwitch lang={lang} label={t.langLabel} className="h-[35px] w-[101px]" /></div>

      <div className="container-col flex flex-col px-10 pb-[68px] pt-[117px] md:min-h-[667px] md:px-6 md:pb-[48px] md:pt-[225px]">
        <div className="flex flex-1 flex-col lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col items-start gap-5 md:gap-10">
            <h1 id="hero-title" className="max-w-[563px] text-display font-black uppercase text-yellow">
              {/* brand name: intentionally never translated, always the PT text; words never split at the hyphen */}
              {config.heroTitle.pt.split(' ').map((w, i) => (
                <span key={i}>{i > 0 && ' '}<span className="inline-block whitespace-nowrap">{w}</span></span>
              ))}
            </h1>
            {/* the badges never get wider than the features block: the row is sized by it, not by its own content */}
            <div className="flex w-fit max-w-full flex-col gap-5 md:gap-10">
              <FeatureRotator features={views} label={t.features.label} />
              <Badges affiliateHref={config.affiliateHref} />
            </div>
          </div>
          <CtaButton href={config.ctaHref} label={localize(config.ctaLabel, lang)} badge={localize(config.ctaBadge, lang)} />
        </div>
      </div>
    </section>
  );
}
