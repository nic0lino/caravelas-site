import type { Coach, SiteConfig } from '@/content/schema';
import { localize, splitBio, type Lang } from '@/content/select';
import type { UiStrings } from '@/i18n';
import { asset } from '@/lib/asset';
import { PhotoTags, type TagView } from './PhotoTags';

// Figma "Os capitaes" (24:7062). Desktop card 586 high: the gym photo (1200×800, offset up 149) sits behind and fades
// into the card (#ededed gradient 32%→100% + a 65% veil); the cut-out of the coaches (628×586) stands on the card's
// floor. Mobile (440 wide): a 255-high window with the same recipe, the title tab over it, Ana and Feu below.
// Desktop = lg (1024+); below that the mobile composition (capped at 560 wide).
const COL = 'max(24px,calc((100% - 1000px)/2))'; // left edge of the 1000px column, inside the card

function Bio({ text }: { text: string }) {
  const [first, ...rest] = splitBio(text);
  return (
    <div className="space-y-[1.2em] text-xs leading-[normal] text-black">
      {first && <p className="font-bold">{first}</p>}
      {rest.map((p, i) => <p key={i}>{p}</p>)}
    </div>
  );
}

export function Team({ lang, t, coaches, config }: { lang: Lang; t: UiStrings; coaches: Coach[]; config: SiteConfig }) {
  const sorted = [...coaches].sort((a, b) => a.order - b.order);
  const people = config.teamPhoto ?? asset('/assets/team-people.webp');
  const tags: TagView[] = sorted.flatMap((c, i) =>
    c.instagram
      ? [{
          id: c.id,
          href: c.instagram,
          handle: new URL(c.instagram).pathname.split('/').filter(Boolean)[0] ?? c.name,
          label: t.team.instagram.replace('{name}', c.name),
          side: c.photoSide ?? (i % 2 === 0 ? 'left' : 'right'),
        } as TagView]
      : [],
  );
  // the gym itself, tagged on the rack in the background
  if (config.instagram) {
    tags.push({
      id: 'gym',
      href: config.instagram,
      handle: new URL(config.instagram).pathname.split('/').filter(Boolean)[0] ?? 'caravelas',
      label: t.team.instagram.replace('{name}', 'CrossFit Caravelas'),
      side: 'gym',
    });
  }

  return (
    <section id="equipa" aria-labelledby="equipa-title" className="relative z-10 overflow-x-clip bg-[#e8e6e6] lg:bg-[#ededed]">
      <div className="relative mx-auto max-w-[560px] lg:h-[586px] lg:max-w-none">
        {/* visual: the window on mobile, the whole card behind the text on desktop */}
        <div className="relative aspect-[440/254.6] w-full bg-[#e8e6e6] [clip-path:inset(-60px_0_0_0_round_0_0_16px_16px)] lg:absolute lg:inset-0 lg:aspect-auto lg:bg-[#ededed] lg:[clip-path:none]">
          {/* gym photo, washed out into the card colour (clipped to the window) */}
          <div aria-hidden className="absolute inset-0 overflow-clip">
          <div
            className="absolute -left-[4.09%] -top-[24.35%] aspect-[3/2] w-[108.18%] lg:left-[calc(var(--col)+211px)] lg:top-[-149px] lg:aspect-auto lg:h-[800px] lg:w-[max(1200px,calc(100%-var(--col)-211px))]"
            style={{ ['--col' as string]: COL }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={asset('/assets/team-bg.jpg')} alt="" width={1600} height={1067} className="h-full w-full object-cover" />
            <div className="absolute -inset-px bg-[linear-gradient(to_right,#ededed_25.36%,rgba(237,237,237,0.32)_67.9%)]" />
            <div className="absolute -inset-px bg-[#ededed]/65" />
          </div>
          </div>

          {/* the coaches, cut out. Mobile: optically centred (the alpha centroid is at 46% of the image and its extent midpoint at 51%, so 49% sits on the window's centre). Mobile: their heads rise 40px above the window, over the section above, and are cut at
              the window's bottom; desktop: they stand on the card's floor. */}
          <div data-clip className="absolute inset-x-0 bottom-0 top-[-40px] overflow-clip lg:top-0">
            <div
              className="absolute left-[13.47%] top-0 w-[74.55%] lg:bottom-0 lg:left-[calc(var(--col)+541px)] lg:top-auto lg:w-[min(628px,calc(100%-var(--col)-541px))]"
              style={{ ['--col' as string]: COL }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={people} alt="" width={1256} height={1170} className="block h-auto w-full select-none" draggable={false} />
              <PhotoTags tags={tags} />
            </div>
          </div>

          {/* mobile title tab (Figma 24:7127): solid green wave, centred on the title, small gap */}
          <div aria-hidden className="absolute left-[0.23%] top-[82.8%] flex min-h-[26px] min-w-[50%] items-center justify-end gap-2 rounded-r-[4px] bg-[#fdd806] py-1 pl-2 pr-3 lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={asset('/assets/squiggle-pill.svg')} alt="" width={244} height={19} className="h-[9px] w-[100px] max-w-none" />
            <span className="text-sm font-bold leading-none text-moss-900">{t.team.title}</span>
          </div>
        </div>

        {/* text */}
        <div className="pointer-events-none relative z-10 lg:mx-auto lg:h-full lg:max-w-[1048px] lg:px-6 lg:pt-16">
          <div className="pointer-events-auto flex flex-col lg:w-[450px] lg:gap-5">
            <h2
              id="equipa-title"
              className="hidden h-[58px] w-[450px] items-center gap-2.5 rounded-[10px] bg-[linear-gradient(to_right,#fdd806_46.556%,rgba(253,224,10,0))] p-2.5 text-xl font-bold leading-[normal] text-moss-900 lg:flex"
            >
              <span className="shrink-0">{t.team.title}</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img aria-hidden src={asset('/assets/squiggle-pill.svg')} alt="" width={244} height={19} className="h-[15px] w-[240px] max-w-none" />
            </h2>
            <span className="sr-only-text lg:hidden" role="heading" aria-level={2}>{t.team.title}</span>
            <div className="grid grid-cols-2 pb-6 lg:flex lg:h-[380px] lg:gap-7 lg:pb-0">
              {sorted.map((c, i) => (
                <article key={c.id} className={`px-2.5 pt-5 lg:w-[211px] lg:px-0 lg:pt-0 ${i === 0 && sorted.length === 2 ? 'max-lg:order-2' : ''}`}>
                  <h3 className="border-b border-[#99c82a] pb-1 text-base font-medium leading-[normal] text-[#496700] lg:border-[#a4cf3d] lg:pb-0 lg:text-xl">{c.name}</h3>
                  <div className="mt-2.5 lg:pl-2.5"><Bio text={localize(c.bio, lang)} /></div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
