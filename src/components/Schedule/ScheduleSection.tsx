import type { SiteContent } from '@/content/schema';
import { buildScheduleGrid, slotsForDay, WEEKDAYS, type Lang } from '@/content/select';
import type { UiStrings } from '@/i18n';
import { Pricing } from '../Pricing/Pricing';
import { ScheduleDayTabs } from './ScheduleDayTabs';
import { ScheduleTable } from './ScheduleTable';
import { toCellView, type ScheduleView } from './view';

export function ScheduleSection({ lang, t, content }: { lang: Lang; t: UiStrings; content: SiteContent }) {
  const grid = buildScheduleGrid(content.schedule);
  const cells: ScheduleView['cells'] = {};
  for (const time of grid.times)
    for (const d of grid.days) {
      const slots = grid.cells[time]?.[d];
      if (slots) (cells[time] ??= {})[d] = slots.map((s) => toCellView(s, lang, t));
    }
  const byDay = Object.fromEntries(
    WEEKDAYS.map((d) => [d, slotsForDay(content.schedule, d).map((s) => ({ ...toCellView(s, lang, t), time: s.time }))]),
  ) as ScheduleView['byDay'];
  const view: ScheduleView = {
    days: grid.days,
    times: grid.times,
    cells,
    byDay,
    dayLabels: Object.fromEntries(WEEKDAYS.map((d) => [d, { long: t.days.long[d], short: t.days.short[d] }])) as ScheduleView['dayLabels'],
    labels: { time: t.schedule.time, today: t.schedule.today, sundayClosed: t.schedule.sundayClosed, coach: t.schedule.coach },
  };

  // Figma 1:1255: radial #4b5c0e → #34420a → #1d2705, ellipse 100% × 63% centred at (49%, 90%); py 40; title Inter Bold 36.
  return (
    <section id="horarios" aria-labelledby="horarios-title" className="bg-[radial-gradient(ellipse_100%_63%_at_49%_90%,#4b5c0e_0%,#34420a_50%,#1d2705_100%)] pb-3 pt-8 md:pt-10 lg:pb-10">
      <div className="container-col">
        <h2 id="horarios-title" className="mb-5 pt-2 font-[family-name:var(--font-inter)] text-lg font-bold text-white md:flex md:h-[88px] md:items-center md:px-5 md:pt-10 md:text-xl">
          {t.schedule.title}
        </h2>
        <ScheduleTable view={view} />
        <ScheduleDayTabs view={view} />
        <Pricing lang={lang} plans={content.prices} config={content.config} />
      </div>
    </section>
  );
}
