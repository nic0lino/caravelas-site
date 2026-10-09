'use client';

import { useEffect, useRef, useState } from 'react';
import type { AnimationItem } from 'lottie-web';
import { asset } from '@/lib/asset';

export type AnimName = 'lifebuoy' | 'anchor' | 'ship-a' | 'ship-b';

/**
 * One feature's Lottie (white strokes, 300 frames @ 60fps = exactly one DURATION_MS of the rotator). The static icon
 * stays underneath until the player is ready (also the no-JS / reduced-motion / failed-load fallback). The player (SVG
 * "light" build, ~47KB gz) and the JSON are fetched lazily, only for the feature on screen and the next one.
 * The box is as tall as the feature's text block (the row stretches it) and the art is left-aligned in it.
 * `active` = this is the feature on screen; `playing` = the rotator is running (not held, not scrolled away).
 */
export function FeatureAnimation({ name, load, active, playing, children }: { name: AnimName; load: boolean; active: boolean; playing: boolean; children: React.ReactNode }) {
  const host = useRef<HTMLDivElement>(null);
  const anim = useRef<AnimationItem | null>(null);
  const wasActive = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!load || anim.current) return;
    let dead = false;
    (async () => {
      try {
        const [mod, data] = await Promise.all([
          import('lottie-web/build/player/lottie_light'),
          fetch(asset(`/assets/anim/feature-${name}.json`)).then((r) => r.json()),
        ]);
        if (dead || !host.current) return;
        const lottie = mod.default ?? mod;
        anim.current = lottie.loadAnimation({
          container: host.current,
          renderer: 'svg',
          loop: false,
          autoplay: false,
          animationData: data,
          rendererSettings: { preserveAspectRatio: 'xMinYMid meet' },
        });
        setReady(true);
      } catch {
        /* the static icon stays */
      }
    })();
    return () => {
      dead = true;
    };
  }, [load, name]);

  useEffect(() => () => { anim.current?.destroy(); anim.current = null; }, []);

  useEffect(() => {
    const a = anim.current;
    if (!a || !ready) return;
    if (active && !wasActive.current) {
      // appears: draw-on from the first frame
      if (playing) a.goToAndPlay(0, true);
      else a.goToAndStop(0, true);
    } else if (active) {
      if (playing) a.play();
      else a.pause();
    } else {
      a.pause();
    }
    wasActive.current = active;
  }, [ready, active, playing]);

  return (
    <div className="relative min-h-[83px] w-[100px] shrink-0 md:min-h-[106px] md:w-[120px]">
      <div className={`absolute inset-0 transition-opacity duration-300 ${ready ? 'opacity-0' : 'opacity-100'}`}>{children}</div>
      <div ref={host} aria-hidden className={`absolute inset-0 transition-opacity duration-300 ${ready ? 'opacity-100' : 'opacity-0'}`} />
    </div>
  );
}
