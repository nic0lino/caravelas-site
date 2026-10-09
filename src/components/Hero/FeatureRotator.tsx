'use client';

import { useEffect, useRef, useState } from 'react';
import { FeatureIconFor } from '../icons';
import type { Feature } from '@/content/schema';

export interface FeatureView {
  id: string;
  icon: Feature['icon'];
  title: string;
  text: string;
}

const INTERVAL_MS = 6000;

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
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % features.length), INTERVAL_MS);
    return () => clearInterval(id);
  }, [running, features.length]);

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
            className={`col-start-1 row-start-1 flex items-end gap-[30px] transition-[opacity,transform] ease-out motion-reduce:transition-none ${
              active ? 'translate-y-0 opacity-100 delay-150 duration-300' : 'pointer-events-none translate-y-2 opacity-0 duration-150'
            }`}
          >
            <Icon className="h-[83px] w-[79px] shrink-0 md:h-[106px] md:w-[101px]" />
            <div className="flex w-[186px] flex-col gap-2.5 text-white sm:w-[248px] md:w-[358px]">
              <p className="text-base font-black uppercase leading-[normal] md:text-xl">{f.title}</p>
              <p className="text-xs font-light leading-[normal] md:text-xl">{f.text}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
