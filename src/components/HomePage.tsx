import { getSiteContent } from '@/content';
import { localize, lisbonToday, selectActiveMarquee, type Lang } from '@/content/select';
import { strings } from '@/i18n';
import { ConsentProvider } from './Consent/ConsentProvider';
import { Footer } from './Footer/Footer';
import { Header } from './Header/Header';
import { Hero } from './Hero/Hero';
import { Marquee } from './Marquee/Marquee';
import { ScheduleSection } from './Schedule/ScheduleSection';
import { jsonLd } from '@/lib/jsonld';
import { Team } from './Team/Team';

export async function HomePage({ lang }: { lang: Lang }) {
  const content = await getSiteContent();
  const t = strings(lang);
  const marquee = selectActiveMarquee(content.marquee, lisbonToday().isoDate).map((m) => ({
    id: m.id,
    highlight: localize(m.highlight, lang),
    text: localize(m.text, lang),
    href: m.href,
  }));

  return (
    <ConsentProvider t={t} cookiesHref={content.config.cookiesHref}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(content.config, lang)).replace(/</g, '\\u003c') }} />
      <a href="#horarios" className="sr-only-text focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-yellow focus:p-2 focus:text-black">{t.skip}</a>
      <Header lang={lang} t={t} config={content.config} />
      <main>
        <Hero lang={lang} t={t} config={content.config} features={content.features} />
        <Marquee items={marquee} label={t.marquee.label} pauseLabel={t.marquee.pause} playLabel={t.marquee.play} />
        <ScheduleSection lang={lang} t={t} content={content} />
        <Team lang={lang} t={t} coaches={content.coaches} config={content.config} />
      </main>
      <Footer t={t} config={content.config} lang={lang} />
    </ConsentProvider>
  );
}