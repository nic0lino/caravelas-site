'use client';

import { useEffect, useRef, useState } from 'react';
import { asset } from '@/lib/asset';

/**
 * Poster first (LCP). After `load`, the shader module is imported lazily and a canvas
 * fades in over the poster once the first frame is drawn. Falls back to the poster when:
 * no WebGL2, reduced motion, saveData, or context lost.
 */
export function HeroBackground() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (reduced || conn?.saveData) return;

    let cleanup: (() => void) | undefined;
    let cancelled = false;

    const start = async () => {
      if (cancelled || !canvas.current || !video.current || !root.current) return;
      const v = video.current;
      const { startRefraction } = await import('./refraction');
      if (cancelled) return;
      const handle = startRefraction(canvas.current, v, {
        onFirstFrame: () => setReady(true),
        onLost: () => { setReady(false); v.pause(); },
      });
      if (!handle) return; // no WebGL2 -> poster stays
      v.preload = 'auto';
      v.play().catch(() => {});

      let inView = true;
      let tabVisible = !document.hidden;
      const sync = () => {
        const on = inView && tabVisible;
        handle.setActive(on);
        if (on) v.play().catch(() => {}); else v.pause();
      };
      const io = new IntersectionObserver(([e]) => { inView = e!.isIntersecting; sync(); });
      io.observe(root.current);
      const onVis = () => { tabVisible = !document.hidden; sync(); };
      document.addEventListener('visibilitychange', onVis);
      cleanup = () => {
        io.disconnect();
        document.removeEventListener('visibilitychange', onVis);
        handle.destroy();
        v.pause();
      };
    };

    if (document.readyState === 'complete') void start();
    else window.addEventListener('load', start, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener('load', start);
      cleanup?.();
    };
  }, []);

  return (
    <div ref={root} aria-hidden className="absolute inset-0 -z-20 overflow-hidden bg-moss-950">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={asset('/video/poster.jpg')} alt="" width={1280} height={720} fetchPriority="high" className="h-full w-full object-cover" />
      <canvas ref={canvas} className={`absolute inset-0 h-full w-full transition-opacity duration-700 ${ready ? 'opacity-100' : 'opacity-0'}`} />
      <video ref={video} muted loop playsInline preload="none" tabIndex={-1} className="pointer-events-none absolute left-0 top-0 h-px w-px opacity-0">
        <source src={asset('/video/hero.webm')} type="video/webm" />
        <source src={asset('/video/hero.mp4')} type="video/mp4" />
      </video>
    </div>
  );
}
