'use client';

import { useEffect, useState } from 'react';
import { lisbonToday } from '@/content/select';
import type { Weekday } from '@/content/schema';
import { CellText } from './CellText';
import { kindClass, type ScheduleView } from './view';

// Figma 1:1255: table #232e07 r16, time column 143 wide, header row 32, body rows 43.
// Lines: this table uses 0.5px hairlines (the pricing band stays 1px). Row rules white, column dividers lime #95be35.
// Interaction (subtle, not decisive): today's column header gets a soft lime tint; hovering a class lightens its cell
// and the day label goes from Regular to Black.
const HAIR = 'border-white';
const VLINE = 'border-l-[0.5px] border-l-[#95be35]';
const VEDGE = 'border-r-[0.5px] border-r-[#95be35]';
const TINT = 'bg-[#a4cf3d]/30';

export function ScheduleTable({ view }: { view: ScheduleView }) {
  const [today, setToday] = useState<Weekday | null>(null);
  const [hover, setHover] = useState<{ day: Weekday; time: string } | null>(null);
  useEffect(() => setToday(lisbonToday().weekday), []);
  const lastDay = view.days[view.days.length - 1];

  return (
    <div className="hidden overflow-hidden rounded-[16px] bg-[#232e07] md:block">
      <table className="w-full table-fixed border-collapse text-center" onMouseLeave={() => setHover(null)}>
        <colgroup>
          <col style={{ width: 143 }} />
          {view.days.map((d) => <col key={d} />)}
        </colgroup>
        <thead>
          <tr className="h-8">
            <th scope="col" className={`border-b-[0.5px] p-0 text-xs font-normal text-white ${HAIR} ${VLINE}`}>{view.labels.time}</th>
            {view.days.map((d) => (
              <th
                key={d}
                scope="col"
                className={`border-b-[0.5px] p-0 text-base text-yellow transition-colors duration-200 ${hover?.day === d ? 'font-black' : 'font-normal'} ${today === d ? TINT : ''} ${HAIR} ${VLINE} ${d === lastDay ? VEDGE : ''}`}
              >
                {view.dayLabels[d].long}
                {today === d && <span className="sr-only-text"> ({view.labels.today})</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {view.times.map((time, ri) => {
            const b = ri === view.times.length - 1 ? '' : 'border-b-[0.5px]';
            return (
              <tr key={time}>
                <th scope="row" className={`h-[43px] p-0 text-xl font-black text-[#a4cf3d] ${b} ${HAIR} ${VLINE}`}>{time}</th>
                {view.days.map((d) => {
                  const cells = view.cells[time]?.[d] ?? [];
                  const hl = hover?.day === d && hover.time === time;
                  return (
                    <td
                      key={d}
                      onMouseEnter={() => cells.length && setHover({ day: d, time })}
                      className={`p-0 align-middle ${b} ${HAIR} ${VLINE} ${d === lastDay ? VEDGE : ''} ${cells[0] ? kindClass[cells[0].kind] : ''}`}
                    >
                      {cells.map((c, i) => (
                        <div
                          key={c.id}
                          className={`flex min-h-[43px] flex-col items-center justify-center px-2.5 py-2 transition-colors duration-200 ${hl ? TINT : 'bg-transparent'} ${i > 0 ? 'border-t-[0.5px] border-white' : ''}`}
                        >
                          <CellText cell={c} coachLabel={view.labels.coach} />
                        </div>
                      ))}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
