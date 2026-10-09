'use client';

import { useEffect, useRef, useState } from 'react';
import { FeatureIconFor } from '../icons';
import type { Feature } from '@/content/schema';
import { FeatureAnimation, type AnimName } from './FeatureAnimation';

export interface FeatureView {
  id: string;
  icon: Feature['icon'];
  anim: AnimName;
  title: string;
  text: string;
}

// One feature stays on screen exactly as long as its animation lasts (300 frames @ 60fps).
const DURATION_MS = 5000;

export function FeatureRotator({ features, label }: { features: FeatureView[]; label: string }) {
  const [index, setIndex] = useState(0);
  const [hold, setHold] = useState(false); // hover / focus
  const [visible, setVisible] = useState(true);
  const [reduced, setReduced] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e!.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const running = features.length > 1 && !reduced && !hold && visible;
  // Remaining-time clock: pausing (hover/focus/offscreen) freezes the animation and the countdown together,
  // so the switch always lands when the animation ends.
  const elapsed = useRef(0);
  useEffect(() => {
    if (!running) return;
    const startedAt = performance.now();
    let fired = false;
    const t = setTimeout(() => {
      fired = true;
      elapsed.current = 0;
      setIndex((i) => (i + 1) % features.length);
    }, Math.max(0, DURATION_MS - elapsed.current));
    return () => {
      clearTimeout(t);
      if (!fired) elapsed.current += performance.now() - startedAt;
    };
  }, [running, index, features.length]);

  return (
    <div
      ref={root}
      aria-label={label}
      className="grid"
      onMouseEnter={() => setHold(true)}
      onMouseLeave={() => setHold(false)}
      onFocus={() => setHold(true)}
      onBlur={() => setHold(false)}
    >
      {/* All features share one grid cell -> height = tallest, no layout shift. */}
      {features.map((f, i) => {
        const Icon = FeatureIconFor[f.icon];
        const active = reduced ? i === 0 : i === index;
        return (
          <div
            key={f.id}
            aria-hidden={!active}
            className={`col-start-1 row-start-1 flex items-stretch gap-[9px] self-end md:gap-3 transition-[opacity,transform] ease-out motion-reduce:transition-none ${
              active ? 'translate-y-0 opacity-100 delay-150 duration-300' : 'pointer-events-none translate-y-2 opacity-0 duration-150'
            }`}
          >
            <FeatureAnimation name={f.anim} load={!reduced && (active || i === (index + 1) % features.length)} active={active} playing={running && active}>
              <Icon className="h-full w-full object-left" />
            </FeatureAnimation>
            <div className="flex w-[186px] flex-col gap-2.5 text-white sm:w-[248px] md:w-[358px]">
              <p className="text-base font-black uppercase leading-[normal] md:text-lg">{f.title}</p>
              <p className="text-sm font-light leading-[normal] md:text-lg">{f.text}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
