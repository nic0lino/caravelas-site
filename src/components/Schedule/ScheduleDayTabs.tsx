'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { lisbonToday } from '@/content/select';
import type { Weekday } from '@/content/schema';
import { CellText } from './CellText';
import { kindClass, type ScheduleView } from './view';

export function ScheduleDayTabs({ view }: { view: ScheduleView }) {
  const [day, setDay] = useState<Weekday>('mon');
  const [today, setToday] = useState<Weekday | null>(null);
  const [animate, setAnimate] = useState(false); // only animate rows after the visitor changes day
  const tabs = useRef<Partial<Record<Weekday, HTMLButtonElement | null>>>({});

  useEffect(() => {
    const w = lisbonToday().weekday;
    setToday(w);
    // Sunday with no Sunday column -> default to Monday (a note explains it).
    setDay(view.days.includes(w) ? w : 'mon');
  }, [view.days]);

  const onKey = (e: KeyboardEvent, i: number) => {
    const n = view.days.length;
    const next = e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowLeft' ? (i - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1;
    if (next < 0) return;
    e.preventDefault();
    const d = view.days[next]!;
    setAnimate(true);
    setDay(d);
    tabs.current[d]?.focus();
  };

  return (
    <div className="md:hidden">
      <div role="tablist" aria-label={view.labels.time} className="flex gap-1.5">
        {view.days.map((d, i) => (
          <button
            key={d}
            ref={(el) => { tabs.current[d] = el; }}
            role="tab"
            id={`tab-${d}`}
            aria-selected={day === d}
            aria-controls="schedule-panel"
            tabIndex={day === d ? 0 : -1}
            onClick={() => { setAnimate(true); setDay(d); }}
            onKeyDown={(e) => onKey(e, i)}
            className={`flex-1 rounded-lg px-1 py-2 text-sm ${day === d ? 'bg-yellow font-bold text-moss-950' : 'bg-moss-950 text-yellow'} ${today === d && day !== d ? 'ring-1 ring-yellow' : ''}`}
          >
            {view.dayLabels[d].short}
            {today === d && <span className="sr-only-text"> ({view.labels.today})</span>}
          </button>
        ))}
      </div>
      {today === 'sun' && !view.days.includes('sun') && (
        <p className="mt-3 text-center text-sm font-light text-white/80">{view.labels.sundayClosed}</p>
      )}
      <ul id="schedule-panel" role="tabpanel" aria-labelledby={`tab-${day}`} className="mt-4 flex flex-col gap-2 rounded-t-[16px] bg-table p-2">
        {/* Same rows for every day (no layout jump): times stay, class info only where the day has one. */}
        {view.times.map((time, i) => {
          const cells = view.cells[time]?.[day] ?? [];
          const style = { ['--i' as string]: i };
          const anim = animate ? 'slot-in' : '';
          if (cells.length === 0)
            return (
              <li key={`${day}-${time}`} style={style} className={`flex min-h-[64px] items-center gap-4 rounded-md bg-black/10 px-4 py-3 ${anim}`}>
                <span className="w-14 text-xl font-black text-[#a4cf3d]/45">{time}</span>
              </li>
            );
          return cells.map((c) => (
            <li key={`${day}-${c.id}`} data-hl="false" style={style} className={`flex min-h-[64px] items-center gap-4 rounded-md px-4 py-3 ${kindClass[c.kind]} ${anim}`}>
              <span className="w-14 text-xl font-black text-[#a4cf3d]">{time}</span>
              <span><CellText cell={c} coachLabel={view.labels.coach} large /></span>
            </li>
          ));
        })}
      </ul>
    </div>
  );
}
