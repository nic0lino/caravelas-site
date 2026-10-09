import type { PricePlan, SiteConfig } from '@/content/schema';
import { formatPrice, localize, type Lang } from '@/content/select';
import { asset } from '@/lib/asset';

// Figma desktop 1:1697 / mobile 20:243: the plans are always ONE row (never a grid). All lines are 1px site-wide.
// Band #121901 + yellow glow (20%) at the left, border #74730a, py 21 (mobile pt 20 / pb 40), gap 16 to the notes.
// Every plan has the same width; the featured box is just that same cell with a 1px outline in the separators' colour (#95be35).
// Separators (1px #95be35) only between plain plans. Notes: desktop updated|promo side by side, mobile promo above updated.
export function Pricing({ lang, plans, config }: { lang: Lang; plans: PricePlan[]; config: SiteConfig }) {
  const sorted = [...plans].sort((a, b) => a.order - b.order);
  const updated = localize(config.pricesUpdatedNote, lang);
  const promo = localize(config.pricesPromoNote, lang);
  return (
    <div className="relative overflow-hidden rounded-b-[16px] border border-t-0 border-[#74730a] bg-[#121901] bg-[radial-gradient(440px_440px_at_0_69px,rgba(253,224,10,0.2),rgba(253,224,10,0))] px-2 pb-10 pt-5 md:px-6 md:py-[21px] lg:pl-[30.3%] lg:pr-[4.1%]">
      {/* yellow wave: 263px window onto the 551px wave, cut mid-cycle on the left (wide desktop only) */}
      <div aria-hidden className="pointer-events-none absolute left-0 top-[46px] hidden h-10 w-[263px] overflow-hidden lg:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={asset('/assets/squiggle-price.svg')} alt="" width={551} height={40} className="-ml-[17px] h-10 w-[551px] max-w-none" />
      </div>
      <ul className="relative flex items-center justify-center lg:justify-start">
        {sorted.map((p, i) => {
          const prev = sorted[i - 1];
          const sep = i > 1 && !p.featured && prev && !prev.featured; // separators between plain plans only
          return (
            <li key={p.id} className={`flex min-w-0 items-center ${i > 0 ? 'ml-2 md:ml-6 lg:ml-10' : ''}`}>
              {sep && <span aria-hidden className="mr-2 h-[59px] w-px bg-[#95be35] md:mr-6 md:h-[43px] lg:mr-10" />}
              {/* every plan has the same footprint; the featured one just gets the outline (same colour as the separators) */}
              <div className={`flex w-[70px] shrink-0 flex-col items-center rounded-[7px] border py-3 md:w-[117px] ${p.featured ? 'border-[#95be35]' : 'border-transparent'}`}>
                <div className="flex flex-col items-center gap-3.5 px-0.5 text-center text-white md:px-1">
                  <span className="flex min-h-[2.5em] items-center text-[10px] font-light leading-tight md:min-h-0 md:text-xs md:leading-none">{localize(p.label, lang)}</span>
                  <span className="text-xl font-bold leading-none md:text-[32px]">{formatPrice(p.priceEUR)}</span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {(updated || promo) && (
        <div className="relative mt-4 flex flex-col-reverse items-center gap-2.5 text-center text-white md:max-w-full md:flex-row md:justify-between md:gap-0 md:text-left lg:w-[656px]">
          {updated && <p className="text-[11px] font-light md:w-[244px] md:text-xs">{updated}</p>}
          {promo && (
            <p className="text-xs font-bold md:w-[305px] md:text-right">
              {config.pricesPromoHref ? <a href={config.pricesPromoHref} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{promo}</a> : promo}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
