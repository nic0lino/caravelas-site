'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { asset } from '@/lib/asset';
import { PauseIcon, PlayIcon } from '../icons';

export interface MarqueeView {
  id: string;
  highlight: string;
  text?: string;
  href?: string;
}

const SPEED_DESKTOP = 60; // px/s
const SPEED_MOBILE = 45;

export function Marquee({ items, label, pauseLabel, playLabel }: { items: MarqueeView[]; label: string; pauseLabel: string; playLabel: string }) {
  const [reps, setReps] = useState(1);
  const [duration, setDuration] = useState(40);
  const [paused, setPaused] = useState(false);
  const [onScreen, setOnScreen] = useState(true);
  const root = useRef<HTMLElement>(null);
  const firstCopy = useRef<HTMLDivElement>(null);
  const repsRef = useRef(1);

  const measure = useCallback(() => {
    const copy = firstCopy.current;
    if (!copy) return;
    const unit = copy.scrollWidth / repsRef.current; // width of the items listed once
    if (!unit) return;
    const vw = window.innerWidth;
    const nextReps = Math.max(1, Math.ceil(vw / unit));
    const speed = vw < 768 ? SPEED_MOBILE : SPEED_DESKTOP;
    repsRef.current = nextReps;
    setReps(nextReps);
    setDuration((unit * nextReps) / speed); // constant speed, not constant duration
  }, []);

  useLayoutEffect(() => {
    measure();
  }, [measure, items]);

  useEffect(() => {
    const ro = new ResizeObserver(measure);
    if (root.current) ro.observe(root.current);
    document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, [measure]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e!.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (items.length === 0) return null; // no empty yellow strip

  const copy = (n: number) => (
    <div key={n} ref={n === 0 ? firstCopy : undefined} aria-hidden className="flex shrink-0 items-center" data-copy={n}>
      {Array.from({ length: reps }).flatMap((_, r) =>
        items.map((it, i) => {
          const first = n === 0 && r === 0 && i === 0;
          const body = (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={asset('/assets/mark.svg')} alt="" width={103} height={33} className="mx-[7px] h-auto w-[29px] shrink-0 md:mx-[18px] md:w-[66px]" />
              <span className="font-bold">{it.highlight}</span>
              {it.text && <span className="ml-[0.3em] font-light">{it.text}</span>}
            </>
          );
          return (
            <span key={`${r}-${it.id}`} data-first={first || undefined} className="marquee-item flex items-center whitespace-nowrap text-sm md:text-lg">
              {it.href ? (
                <a href={it.href} target="_blank" rel="noopener noreferrer" tabIndex={n === 0 && r === 0 ? undefined : -1} className="flex items-center underline-offset-4 hover:underline">{body}</a>
              ) : (
                <span className="flex items-center">{body}</span>
              )}
              <span aria-hidden className="ml-2.5 text-sm font-light md:text-lg">|</span>
            </span>
          );
        }),
      )}
    </div>
  );

  return (
    <section
      ref={root}
      aria-label={label}
      data-paused={paused || !onScreen}
      className="marquee-root relative overflow-hidden bg-yellow text-black"
      style={{ ['--marquee-duration' as string]: `${duration}s` }}
    >
      <div className="marquee-track h-9 md:h-14">{copy(0)}{copy(1)}</div>
      <ul className="sr-only-text">
        {items.map((it) => (
          <li key={it.id}>
            {it.href ? <a href={it.href}>{it.highlight} {it.text}</a> : <>{it.highlight} {it.text}</>}
          </li>
        ))}
      </ul>
      <button
        type="button"
        aria-pressed={paused}
        aria-label={paused ? playLabel : pauseLabel}
        onClick={() => setPaused((p) => !p)}
        className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-yellow/90 text-black"
      >
        {paused ? <PlayIcon className="h-3.5 w-3.5" /> : <PauseIcon className="h-3.5 w-3.5" />}
      </button>
    </section>
  );
}
