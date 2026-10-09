import type { Coach, SiteConfig } from '@/content/schema';
import { localize, splitBio, type Lang } from '@/content/select';
import type { UiStrings } from '@/i18n';
import { asset } from '@/lib/asset';
import { PhotoTags, type TagView } from './PhotoTags';

// Figma 10:270 (1728×502): bg #ededed; content column starts at the 1000px column's left edge.
// Left stack 450 wide (pill 450×58 r10, two coaches 211 wide gap 28), then the photo (square, bleeding to the right edge,
// shown through a window 502 high, image shifted up 124px so both faces stay in frame).
// Mobile 20:1721 (440 wide): photo first, title tab overlapping its bottom-left, then two bio columns.
function Bio({ text }: { text: string }) {
  const [first, ...rest] = splitBio(text);
  return (
    <div className="space-y-[1.2em] text-[11px] leading-[normal] text-black md:text-xs">
      {first && <p className="font-bold">{first}</p>}
      {rest.map((p, i) => <p key={i}>{p}</p>)}
    </div>
  );
}

export function Team({ lang, t, coaches, config }: { lang: Lang; t: UiStrings; coaches: Coach[]; config: SiteConfig }) {
  const sorted = [...coaches].sort((a, b) => a.order - b.order);
  const photo = config.teamPhoto ?? asset('/assets/team.jpg');
  const tags: TagView[] = sorted.flatMap((c, i) =>
    c.instagram
      ? [{
          id: c.id,
          href: c.instagram,
          handle: (new URL(c.instagram).pathname.split('/').filter(Boolean)[0] ?? c.name),
          label: t.team.instagram.replace('{name}', c.name),
          side: c.photoSide ?? (i % 2 === 0 ? 'left' : 'right'),
        } as TagView]
      : [],
  );
  // the gym itself, tagged on the rack bars in the background
  if (config.instagram) {
    tags.push({
      id: 'gym',
      href: config.instagram,
      handle: (new URL(config.instagram).pathname.split('/').filter(Boolean)[0] ?? 'caravelas'),
      label: t.team.instagram.replace('{name}', 'CrossFit Caravelas'),
      side: 'gym',
    });
  }
  return (
    <section id="equipa" aria-labelledby="equipa-title" className="overflow-hidden bg-[#e8e6e6] md:bg-[#ededed]">
      <div className="flex flex-col md:h-[502px] md:flex-row md:pl-[max(24px,calc((100vw-1000px)/2))]">
        {/* photo */}
        <div className="relative aspect-[440/254.6] w-full overflow-clip [container-type:inline-size] md:order-2 md:ml-10 md:aspect-auto md:h-full md:min-w-0 md:flex-1">
          <div className="relative -ml-[0.23cqw] -mt-[16.42cqw] aspect-square w-[108.87cqw] overflow-clip md:ml-[1.14cqw] md:-mt-[14.19cqw] md:w-[106.5cqw] md:rounded-[16px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt="" width={800} height={800} className="absolute inset-0 h-full w-full object-cover" />
            <div aria-hidden className="absolute inset-0 hidden bg-[radial-gradient(ellipse_11.5%_35%_at_0_40.2%,#ededed,rgba(232,230,230,0))] md:block" />
            <PhotoTags tags={tags} />
          </div>
          {/* mobile title tab (Figma 21:2281): solid green wave, centred on the title, small gap */}
          <div aria-hidden className="absolute left-[0.23cqw] top-[47.9cqw] flex min-h-[26px] min-w-[50%] items-center justify-end gap-2 rounded-r-[4px] bg-[#fdd806] py-1 pl-2 pr-3 md:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={asset('/assets/squiggle-pill.svg')} alt="" width={244} height={19} className="h-[9px] w-[100px] max-w-none" />
            <span className="text-sm font-bold leading-none text-moss-900">{t.team.title}</span>
          </div>
        </div>

        {/* left stack */}
        <div className="flex flex-col md:order-1 md:w-[450px] md:shrink-0 md:justify-center md:gap-5">
          <h2
            id="equipa-title"
            className="hidden h-[58px] w-[450px] items-center gap-2.5 rounded-[10px] bg-[linear-gradient(to_right,#fdd806_46.556%,rgba(253,224,10,0))] p-2.5 text-[32px] font-bold leading-[normal] text-moss-900 md:flex"
          >
            <span className="shrink-0">{t.team.title}</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img aria-hidden src={asset('/assets/squiggle-pill.svg')} alt="" width={244} height={19} className="h-[15px] w-[240px] max-w-none" />
          </h2>
          <span className="sr-only-text md:hidden" role="heading" aria-level={2}>{t.team.title}</span>
          <div className="grid grid-cols-2 gap-x-0 pb-6 md:flex md:h-[380px] md:gap-7 md:pb-0">
            {sorted.map((c) => (
              <article key={c.id} className="px-2.5 pt-5 md:w-[211px] md:px-0 md:pt-0">
                <h3 className="border-b border-[#99c82a] pb-1 text-sm font-medium leading-[normal] text-[#496700] md:border-[#a4cf3d] md:pb-0 md:text-[32px]">{c.name}</h3>
                <div className="mt-2.5 md:pl-2.5"><Bio text={localize(c.bio, lang)} /></div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
