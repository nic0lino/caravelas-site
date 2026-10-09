'use client';

import { useEffect, useState } from 'react';
import { lisbonToday } from '@/content/select';
import type { Weekday } from '@/content/schema';
import { CellText } from './CellText';
import { kindClass, type ScheduleView } from './view';

// Figma 1:1255: table #232e07 r16, time column 143 wide, header row 32, body rows 43.
// Every line on the site is 1px. Hierarchy comes from colour: row rules white (structure), column dividers lime #95be35 (they recede).
export function ScheduleTable({ view }: { view: ScheduleView }) {
  const [today, setToday] = useState<Weekday | null>(null);
  const [hover, setHover] = useState<{ day: Weekday; time: string } | null>(null);
  useEffect(() => setToday(lisbonToday().weekday), []);

  const rule = 'border-white';
  const vline = 'border-l border-l-[#95be35]';
  return (
    <div className="hidden overflow-hidden rounded-[16px] bg-[#232e07] md:block">
      <table className="w-full table-fixed border-collapse text-center" onMouseLeave={() => setHover(null)}>
        <colgroup>
          <col style={{ width: 143 }} />
          {view.days.map((d) => <col key={d} />)}
        </colgroup>
        <thead>
          <tr className="h-8">
            <th scope="col" className={`border-b p-0 text-xs font-normal text-white ${rule} ${vline}`}>{view.labels.time}</th>
            {view.days.map((d) => (
              <th key={d} scope="col" className={`border-b p-0 text-base font-normal text-yellow ${rule} ${vline} ${d === view.days[view.days.length - 1] ? 'border-r border-r-[#95be35]' : ''}`}>
                <span className={`inline-block rounded-full px-3 leading-6 transition ${today === d ? 'bg-yellow font-bold text-moss-950' : hover?.day === d ? 'bg-yellow/15' : ''}`}>
                  {view.dayLabels[d].long}
                  {today === d && <span className="sr-only-text"> ({view.labels.today})</span>}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {view.times.map((time, ri) => {
            const last = ri === view.times.length - 1;
            const b = last ? '' : 'border-b';
            return (
              <tr key={time}>
                <th scope="row" className={`h-[43px] p-0 text-xl font-black text-[#a4cf3d] ${b} ${rule} ${vline} ${hover?.time === time ? 'bg-white/5' : ''}`}>{time}</th>
                {view.days.map((d) => {
                  const cells = view.cells[time]?.[d] ?? [];
                  return (
                    <td
                      key={d}
                      data-hl={hover?.day === d && hover.time === time}
                      onMouseEnter={() => cells.length && setHover({ day: d, time })}
                      className={`p-0 align-middle transition-colors ${b} ${rule} ${vline} ${d === view.days[view.days.length - 1] ? 'border-r border-r-[#95be35]' : ''} ${cells[0] ? kindClass[cells[0].kind] : ''}`}
                    >
                      {cells.map((c, i) => (
                        <div key={c.id} className={`flex min-h-[43px] flex-col items-center justify-center px-2.5 py-2 ${i > 0 ? 'border-t border-white' : ''}`}>
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
