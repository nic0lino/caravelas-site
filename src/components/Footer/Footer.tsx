import type { OpeningHours, SiteConfig } from '@/content/schema';
import { LANG_META, type UiStrings } from '@/i18n';
import type { Lang } from '@/content/langs';
import Link from 'next/link';
import { asset } from '@/lib/asset';
import { Mail, WhatsApp } from '../icons';
import { CookieSettingsButton } from '../Consent/ConsentProvider';
import { MapEmbed } from './MapEmbed';

const range = (h: { opens: string; closes: string } | null, closed: string) => (h ? `${h.opens}–${h.closes}` : closed);

function PolicyLink({ href, label }: { href: string; label: string }) {
  return href.startsWith('/')
    ? <Link href={href} prefetch={false} className="underline">{label}</Link>
    : <a href={href} target="_blank" rel="noopener noreferrer" className="underline">{label}</a>;
}

// Figma 8:224 (desktop) / 21:6050 (mobile): bg #242424, pt 40 / pb 80, column 600 (383 on mobile):
// text 202 + gap 24 + map 374×301; headings #99c82a 20/Regular, labels #fcd911 uppercase 12; legal row 10px.
export function Footer({ t, config, lang }: { t: UiStrings; config: SiteConfig; lang: Lang }) {
  const { address: a, openingHours: h } = config;
  const full = `${a.street}, ${a.postalCode} ${a.city}`;
  const hours: [string, OpeningHours[keyof OpeningHours]][] = [
    [t.contact.weekdays, h.weekdays],
    [t.contact.saturday, h.saturday],
    [t.contact.sunday, h.sunday],
  ];
  const btn = 'inline-flex items-center gap-1.5 rounded-lg border border-[#99c82a] px-3 py-1.5 text-xs font-bold text-[#99c82a] transition hover:bg-[#99c82a] hover:text-footer';
  return (
    <footer id="contacto" aria-label={t.nav.contact} className="bg-footer pb-14 pt-10 text-white md:pb-20">
      <div className="mx-auto flex w-full max-w-[600px] flex-col gap-2.5 px-4 md:px-0">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:gap-6">
            <div className="grid grid-cols-[1fr_1fr] gap-5 md:flex md:min-h-[301px] md:w-[202px] md:shrink-0 md:flex-col md:justify-between md:gap-5">
              <div>
                <h2 className="text-sm font-normal leading-[normal] text-[#99c82a] md:text-lg">
                  {t.contact.headingA}<strong className="font-black">{t.contact.headingB}</strong>
                </h2>
                <p className="mt-3 text-xs leading-[normal] md:mt-5">{t.contact.sub}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {config.whatsapp && (
                    <a href={`https://wa.me/${config.whatsapp.replace('+', '')}`} target="_blank" rel="noopener noreferrer" className={btn}><WhatsApp className="h-4 w-4" />{t.contact.whatsapp}</a>
                  )}
                  {config.emails && config.emails.length > 0 && (
                    <a href={`mailto:${config.emails.join(',')}`} className={btn}><Mail className="h-4 w-4" />{t.contact.email}</a>
                  )}
                </div>
              </div>
              <div className="text-xs font-black leading-[normal]">
                <p className="uppercase text-[#fcd911]">{t.contact.address}</p>
                <address className="font-normal not-italic">{a.street}<br />{a.postalCode}, {a.city}.</address>
                <p className="mt-3 uppercase text-[#fcd90d]">{t.contact.hours}</p>
                <dl>
                  {hours.map(([label, v]) => (
                    <div key={label}><dt className="inline font-bold">{label}: </dt><dd className="inline font-normal">{range(v, t.contact.closed)}</dd></div>
                  ))}
                </dl>
              </div>
            </div>
            <MapEmbed
              query={`CrossFit Caravelas, ${full}`}
              hl={LANG_META[lang].code.toLowerCase()}
              alt={`${t.contact.mapAlt}${full}`}
              title={t.contact.mapTitle}
              href={config.mapsHref}
              offLabel={t.cookies.mapOff}
              loadLabel={t.cookies.mapLoad}
              openLabel={t.cookies.mapOpen}
            />
          </div>
          {/* official CrossFit badges: they go to CrossFit's own pages */}
          <div className="flex items-center justify-center gap-10 pb-5">
            <a href="https://journal.crossfit.com" target="_blank" rel="noopener noreferrer" aria-label="The CrossFit Journal">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={asset('/assets/crossfit-journal.png')} alt="CrossFit Journal" width={300} height={150} className="h-[37px] w-[74px]" />
            </a>
            <a href={config.affiliateHref ?? 'https://www.crossfit.com/affiliate'} target="_blank" rel="noopener noreferrer" aria-label="CrossFit Affiliates" className="relative block h-[35.4px] w-[90px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img aria-hidden src={asset('/assets/affiliates-cf.svg')} alt="" width={90} height={21} className="absolute left-0 top-0 h-[21px] w-[90px]" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img aria-hidden src={asset('/assets/affiliates-box.svg')} alt="" width={88} height={12} className="absolute left-0 top-[23.7px] h-[11.7px] w-[88px]" />
            </a>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 text-xs leading-[normal]">
          <p>
            © {new Date().getFullYear()} CrossFit Caravelas.{' '}
            <PolicyLink href={config.privacyHref ?? '/politica-de-privacidade'} label={t.contact.privacy} />.{' '}
            <PolicyLink href={config.cookiesHref ?? '/politica-de-cookies'} label={t.contact.cookies} />.{' '}
            <CookieSettingsButton label={t.cookies.manage} className="underline" />
          </p>
          <a href="https://www.livroreclamacoes.pt" target="_blank" rel="noopener noreferrer" aria-label={t.contact.complaints} className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={asset('/assets/livro-reclamacoes.png')} alt={t.contact.complaints} width={124} height={48} className="h-[25px] w-[65px] md:h-[31px] md:w-[81px]" />
          </a>
        </div>
      </div>
    </footer>
  );
}
