import Link from 'next/link';
import { langPath } from '@/content/langs';
import type { SiteConfig } from '@/content/schema';
import type { Lang } from '@/content/select';
import type { UiStrings } from '@/i18n';
import { Facebook, Instagram } from '../icons';
import { Logo } from '../Logo';
import { LangSwitch } from './LangSwitch';
import { MobileMenu } from './MobileMenu';

// Menu stays on ONE line: below lg (1024) it collapses into the hamburger, between lg and xl it uses tighter gaps/size.
// Figma 1:1743 — bg #304400, py 40, content 1200 wide; logo 152×67, nav gap 20 (px 20 / py 10, 20px Light),
// right block 224 wide: language box 67 high (#0e0f0c, r10) + 42px social icons.
export function Header({ lang, t, config }: { lang: Lang; t: UiStrings; config: SiteConfig }) {
  const links = [
    { href: '#horarios', label: t.nav.schedule },
    { href: '#equipa', label: t.nav.team },
    { href: '#contacto', label: t.nav.contact },
  ];
  const social = 'flex h-[42px] w-[42px] items-center justify-center text-white hover:text-yellow';
  const socials = (
    <div className="flex items-center gap-2.5">
      {config.facebook && (
        <a href={config.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className={social}><Facebook className="h-6 w-6" /></a>
      )}
      {config.instagram && (
        <a href={config.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className={social}><Instagram className="h-6 w-6" /></a>
      )}
    </div>
  );
  return (
    <header className="bg-moss-900">
      <div className="mx-auto flex max-w-[1248px] items-center justify-between gap-4 px-5 py-5 md:px-6 md:py-10 xl:gap-6">
        <Link href={langPath(lang)} aria-label="CrossFit Caravelas"><Logo /></Link>
        <nav aria-label="Principal" className="hidden items-center gap-1 lg:flex xl:gap-5">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="whitespace-nowrap px-2.5 py-2.5 text-base font-light uppercase text-white underline-offset-[6px] hover:text-yellow hover:underline xl:px-5 xl:text-xl">{l.label}</a>
          ))}
        </nav>
        <div className="hidden shrink-0 items-center justify-end gap-[26px] lg:flex xl:w-[224px]">
          <LangSwitch lang={lang} label={t.langLabel} className="h-[67px] w-[101px]" />
          {socials}
        </div>
        <MobileMenu
          openLabel={t.nav.menu}
          closeLabel={t.nav.close}
          links={links}
          footer={<><LangSwitch lang={lang} label={t.langLabel} className="h-[52px] w-[110px]" />{socials}</>}
        />
      </div>
    </header>
  );
}
