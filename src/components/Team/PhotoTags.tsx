'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Instagram } from '../icons';

export interface TagView {
  id: string;
  href: string;
  handle: string; // "@name"
  label: string; // aria-label
  side: 'left' | 'right' | 'gym';
}

// Positions are fractions of the (square) team photo, tuned for public/assets/team.jpg.
// anchor = the thing being tagged, bubble = the roomy spot nearby where the tag prefers to float.
const SPOTS = {
  left: { anchor: { x: 0.265, y: 0.31 }, bubble: { x: 0.15, y: 0.47 } }, // her shoulder, left of the shirt logo
  right: { anchor: { x: 0.58, y: 0.28 }, bubble: { x: 0.78, y: 0.43 } }, // his shoulder, clear of his face on small screens
  gym: { anchor: { x: 0.9, y: 0.32 }, bubble: { x: 0.78, y: 0.2 } }, // the gym tags the rack bars in the background
} as const;

const MARGIN = 8; // never closer than this to the edge of the visible photo
const GAP = 6; // nor to another tag

interface Rect { l: number; t: number; r: number; b: number }
interface Visible { left: number; top: number; right: number; bottom: number }
interface Box { w: number; h: number }
interface Placement { A: { x: number; y: number }; B: { x: number; y: number } }

/**
 * Where each bubble goes. It prefers its own spot; if that would be cut by the edge of the visible photo (or hit
 * another tag) it swings to the other side of the tagged point — mirrored horizontally, vertically or both — and only
 * if nothing fits does it get pushed inside. So a tag never leaves through the margins.
 */
function place(tags: TagView[], boxes: Record<string, Box>, size: number, vis: Visible): Placement[] {
  const taken: Rect[] = [];
  return tags.map((t) => {
    const spot = SPOTS[t.side];
    const box = boxes[t.id] ?? { w: 130, h: 26 };
    const A = { x: spot.anchor.x * size, y: spot.anchor.y * size };
    const P = { x: spot.bubble.x * size, y: spot.bubble.y * size };
    const rect = (c: { x: number; y: number }): Rect => ({ l: c.x - box.w / 2, t: c.y - box.h / 2, r: c.x + box.w / 2, b: c.y + box.h / 2 });
    const inside = (r: Rect) => r.l >= vis.left + MARGIN && r.r <= vis.right - MARGIN && r.t >= vis.top + MARGIN && r.b <= vis.bottom - MARGIN;
    const clear = (r: Rect) => taken.every((o) => r.r + GAP <= o.l || r.l - GAP >= o.r || r.b + GAP <= o.t || r.t - GAP >= o.b);
    const candidates = [P, { x: 2 * A.x - P.x, y: P.y }, { x: P.x, y: 2 * A.y - P.y }, { x: 2 * A.x - P.x, y: 2 * A.y - P.y }];
    let B = candidates.find((c) => inside(rect(c)) && clear(rect(c))) ?? candidates.find((c) => inside(rect(c)));
    if (!B) {
      const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));
      B = {
        x: clamp(P.x, vis.left + box.w / 2 + MARGIN, vis.right - box.w / 2 - MARGIN),
        y: clamp(P.y, vis.top + box.h / 2 + MARGIN, vis.bottom - box.h / 2 - MARGIN),
      };
    }
    taken.push(rect(B));
    return { A, B };
  });
}

type Phase = 'hidden' | 'in' | 'out';

/**
 * Instagram-style tags on the photo. The little triangle always points at the tagged spot.
 * Touch devices: they appear by themselves ~1.2s after the photo is seen. Pointer devices: they unfold
 * (with a small wobble) when the photo is hovered or when a tag receives focus.
 */
export function PhotoTags({ tags }: { tags: TagView[] }) {
  const root = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>('hidden');
  const [canHover, setCanHover] = useState(true);
  const [size, setSize] = useState(0);
  const [vis, setVis] = useState<Visible | null>(null);
  const [boxes, setBoxes] = useState<Record<string, Box>>({});

  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const sync = () => setCanHover(mq.matches);
    sync();
    mq.addEventListener('change', sync); // e.g. a tablet gaining/losing a mouse
    return () => mq.removeEventListener('change', sync);
  }, []);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const clip = el.parentElement?.parentElement; // the cropping window (overflow-clip)
    const measure = () => {
      setSize(el.clientWidth);
      if (!clip) return;
      const r = el.getBoundingClientRect();
      const c = clip.getBoundingClientRect();
      setVis({
        left: Math.max(0, c.left - r.left),
        top: Math.max(0, c.top - r.top),
        right: Math.min(r.width, c.right - r.left),
        bottom: Math.min(r.height, c.bottom - r.top),
      });
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (clip) ro.observe(clip);
    measure();
    return () => ro.disconnect();
  }, []);

  // touch: reveal once, a moment after the photo is on screen
  useEffect(() => {
    if (canHover) return;
    const el = root.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e!.isIntersecting) timer = setTimeout(() => setPhase('in'), 1200);
        else clearTimeout(timer);
      },
      { threshold: 0.25 }, // only part of the square photo is visible (it is cropped by the section)
    );
    io.observe(el);
    return () => { io.disconnect(); clearTimeout(timer); };
  }, [canHover]);

  const onMeasure = useCallback((id: string, w: number, h: number) => {
    setBoxes((b) => (b[id]?.w === w && b[id]?.h === h ? b : { ...b, [id]: { w, h } }));
  }, []);
  const show = useCallback(() => setPhase('in'), []);
  const hide = useCallback(() => setPhase((p) => (p === 'in' ? 'out' : p)), []);

  const placed = size > 0 && vis ? place(tags, boxes, size, vis) : null;

  return (
    <div
      ref={root}
      className="absolute inset-0 z-10"
      onMouseEnter={canHover ? show : undefined}
      onMouseLeave={canHover ? hide : undefined}
      onFocus={show}
      onBlur={canHover ? hide : undefined}
    >
      {placed && tags.map((t, i) => (
        <Tag key={t.id} tag={t} index={i} at={placed[i]!} box={boxes[t.id]} onMeasure={onMeasure} phase={phase} canHover={canHover} />
      ))}
    </div>
  );
}

function Tag({ tag, index, at, box, onMeasure, phase, canHover }: {
  tag: TagView; index: number; at: Placement; box?: Box; onMeasure: (id: string, w: number, h: number) => void; phase: Phase; canHover: boolean;
}) {
  const bubble = useRef<HTMLAnchorElement>(null);
  useLayoutEffect(() => {
    const el = bubble.current;
    if (el) onMeasure(tag.id, el.offsetWidth, el.offsetHeight);
  }, [tag.handle, onMeasure, tag.id]);

  const { A, B } = at;
  const w = box?.w ?? 130;
  const h = box?.h ?? 26;
  // aim the triangle from the bubble's edge at the tagged spot
  const dx = A.x - B.x;
  const dy = A.y - B.y;
  const t = Math.min(dx ? w / 2 / Math.abs(dx) : Infinity, dy ? h / 2 / Math.abs(dy) : Infinity);
  const ex = w / 2 + dx * t; // edge point, in the bubble's own box
  const ey = h / 2 + dy * t;
  const angle = (Math.atan2(dx, -dy) * 180) / Math.PI; // apex (up) rotated to look at the spot

  const anim = phase === 'in' ? 'tag-in' : phase === 'out' ? 'tag-out' : 'opacity-0';

  return (
    <>
      {/* the tagged spot: a quiet dot (pulses on pointer devices until the tags are out) */}
      <span
        aria-hidden
        className="pointer-events-none absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80 shadow-[0_0_0_3px_rgba(255,255,255,0.25)]"
        style={{ left: A.x, top: A.y }}
      >
        {canHover && phase !== 'in' && <span className="dot-pulse absolute inset-0 rounded-full bg-white/70" style={{ animationDelay: `${index * 600}ms` }} />}
      </span>

      <div className="absolute" style={{ left: B.x, top: B.y, transform: 'translate(-50%, -50%)' }}>
        <div className="tag-float" style={{ ['--fd' as string]: `${index * -1.7}s` }}>
          <div className={anim} style={{ ['--d' as string]: `${index * 150}ms`, transformOrigin: `${ex}px ${ey}px` }}>
            <a
              ref={bubble}
              href={tag.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={tag.label}
              className={`relative flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#0e0f0c]/85 px-3 py-1.5 text-[11px] font-bold leading-none text-white shadow-[0_2px_8px_rgba(0,0,0,0.35)] transition-colors hover:bg-black md:text-xs ${phase === 'in' ? '' : 'pointer-events-none'}`}
            >
              <Instagram className="h-3.5 w-3.5 shrink-0" />
              {tag.handle}
              <span
                aria-hidden
                className="absolute h-2 w-3 bg-[#0e0f0c]/85 [clip-path:polygon(50%_0,0_100%,100%_100%)]"
                style={{ left: ex - 6, top: ey - 7, transformOrigin: '50% 100%', transform: `rotate(${angle}deg)` }}
              />
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
