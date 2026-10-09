'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Instagram } from '../icons';

export interface TagView {
  id: string;
  href: string;
  handle: string; // "name" (shown without the @)
  label: string; // aria-label
  side: 'left' | 'right' | 'gym';
}

// Positions are fractions of the cut-out of the coaches (x of its width, y of its height), tuned for
// public/assets/team-people.webp. anchor = the thing being tagged, bubble = where the tag prefers to float.
const SPOTS = {
  left: { anchor: { x: 0.23, y: 0.25 }, bubble: { x: 0.14, y: 0.5 } }, // her face / her side
  right: { anchor: { x: 0.55, y: 0.22 }, bubble: { x: 0.78, y: 0.46 } }, // his face / his side
  gym: { anchor: { x: 0.97, y: 0.26 }, bubble: { x: 0.82, y: 0.1 } }, // the rack behind him, in the gym photo
} as const;

const MARGIN = 8; // never closer than this to the edge of the visible photo
const GAP = 6; // nor to another tag

interface Rect { l: number; t: number; r: number; b: number }
interface Visible { left: number; top: number; right: number; bottom: number }
interface Box { w: number; h: number }
interface Dims { w: number; h: number }
interface Placement { A: { x: number; y: number }; B: { x: number; y: number } }

/**
 * Where each bubble goes. It prefers its own spot; if that would be cut by the edge of the visible photo (or hit
 * another tag) it swings to the other side of the tagged point — mirrored horizontally, vertically or both — and only
 * if nothing fits does it get pushed inside. So a tag never leaves through the margins.
 */
function place(tags: TagView[], boxes: Record<string, Box>, dims: Dims, vis: Visible, follow: { side: Side; x: number; y: number } | null): Placement[] {
  const taken: Rect[] = [];
  return tags.map((t) => {
    const spot = SPOTS[t.side];
    const box = boxes[t.id] ?? { w: 130, h: 26 };
    const following = follow?.side === t.side;
    // following: the cursor is the tagged spot and the bubble sits diagonally beside it (down-right first)
    const A = following ? { x: follow.x, y: follow.y } : { x: spot.anchor.x * dims.w, y: spot.anchor.y * dims.h };
    const P = following ? { x: A.x + box.w / 2 + 12, y: A.y + box.h / 2 + 16 } : { x: spot.bubble.x * dims.w, y: spot.bubble.y * dims.h };
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
type Side = TagView['side'];

/**
 * Which tag a point of the photo belongs to (x, y as fractions of the square photo): her half (face and chest),
 * his half, or the rack bars in the background for the gym.
 */
function zoneAt(x: number, y: number): Side {
  if (x >= 0.86 && y <= 0.45) return 'gym';
  return x < 0.47 ? 'left' : 'right';
}

/**
 * Instagram-style tags on the photo. The little triangle always points at the tagged spot.
 * Touch devices: all appear by themselves ~1.2s after the photo is seen.
 * Pointer devices: hovering a person (face or chest) unfolds only their tag, with a small wobble; moving to the other
 * person swaps it. Hovering the rack bars shows the gym's. Tags are also revealed by keyboard focus.
 */
export function PhotoTags({ tags }: { tags: TagView[] }) {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<Side | null>(null); // pointer / focus: the one tag on show
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null); // pointer position inside the photo
  const [revealAll, setRevealAll] = useState(false); // touch: every tag, once the photo has been seen
  const [shown, setShown] = useState<Record<string, boolean>>({}); // has been out at least once (so it can animate away)
  const [canHover, setCanHover] = useState(true);
  const [dims, setDims] = useState<Dims>({ w: 0, h: 0 });
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
    const clip = el.closest('[data-clip]'); // the cropping window (overflow-clip)
    const measure = () => {
      setDims({ w: el.clientWidth, h: el.clientHeight });
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
        if (e!.isIntersecting) timer = setTimeout(() => setRevealAll(true), 1200);
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
  const frame = useRef(0);
  const onMove = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('a')) return; // on the tag itself: it holds still so it can be clicked
    const { clientX, clientY } = e;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const r = root.current?.getBoundingClientRect();
      if (!r) return;
      const x = clientX - r.left;
      const y = clientY - r.top;
      setActive(zoneAt(x / r.width, y / r.height));
      setCursor({ x, y });
    });
  }, []);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  // clicking a person opens their Instagram (the tag chases the cursor, so it is hard to hit)
  const onClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('a')) return;
    const t = tags.find((x) => x.side === active);
    if (t) window.open(t.href, '_blank', 'noopener,noreferrer');
  }, [active, tags]);

  const phaseOf = (t: TagView): Phase => (revealAll || active === t.side ? 'in' : shown[t.id] ? 'out' : 'hidden');
  useEffect(() => {
    const on = tags.filter((t) => revealAll || active === t.side).map((t) => t.id);
    if (on.length) setShown((s) => (on.every((id) => s[id]) ? s : { ...s, ...Object.fromEntries(on.map((id) => [id, true])) }));
  }, [active, revealAll, tags]);

  const follow = canHover && active && cursor ? { side: active, ...cursor } : null;
  const placed = dims.w > 0 && vis ? place(tags, boxes, dims, vis, follow) : null;

  return (
    <div
      ref={root}
      className={`absolute inset-0 z-10 ${canHover && active ? 'cursor-pointer' : ''}`}
      onMouseMove={canHover ? onMove : undefined}
      onMouseLeave={canHover ? () => { cancelAnimationFrame(frame.current); setActive(null); } : undefined}
      onClick={canHover ? onClick : undefined}
    >
      {placed && tags.map((t, i) => (
        <Tag key={t.id} tag={t} index={i} at={placed[i]!} box={boxes[t.id]} onMeasure={onMeasure} phase={phaseOf(t)} canHover={canHover} following={follow?.side === t.side} onFocusTag={() => setActive(t.side)} onBlurTag={() => setActive(null)} />
      ))}
    </div>
  );
}

/**
 * Point on a pill (w x h, fully rounded ends) where the ray from its centre towards (dx, dy) leaves it, plus the
 * rotation (deg, apex up = 0) that points a triangle outwards along the outline's normal there.
 */
function pillEdge(w: number, h: number, dx: number, dy: number) {
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const r = h / 2;
  const half = Math.max(0, w / 2 - r); // half-length of the flat part
  let t: number;
  let nx: number;
  let ny: number;
  const flat = Math.abs(uy) > 1e-6 ? r / Math.abs(uy) : Infinity;
  if (Math.abs(ux) * flat <= half) {
    t = flat; // leaves through the top or bottom side
    nx = 0;
    ny = Math.sign(uy) || -1;
  } else {
    const cx = Math.sign(ux) * half; // centre of the round end it leaves through
    const b = ux * cx;
    t = b + Math.sqrt(Math.max(0, b * b - cx * cx + r * r));
    nx = (t * ux - cx) / r;
    ny = (t * uy) / r;
  }
  return { ex: w / 2 + ux * t, ey: h / 2 + uy * t, angle: (Math.atan2(nx, -ny) * 180) / Math.PI };
}

function Tag({ tag, index, at, box, onMeasure, phase, canHover, following, onFocusTag, onBlurTag }: {
  tag: TagView; index: number; at: Placement; box?: Box; onMeasure: (id: string, w: number, h: number) => void; phase: Phase; canHover: boolean; following: boolean;
  onFocusTag: () => void; onBlurTag: () => void;
}) {
  const bubble = useRef<HTMLAnchorElement>(null);
  useLayoutEffect(() => {
    const el = bubble.current;
    if (el) onMeasure(tag.id, el.offsetWidth, el.offsetHeight);
  }, [tag.handle, onMeasure, tag.id]);

  const [glide, setGlide] = useState(false);
  useEffect(() => {
    if (!following) { setGlide(false); return; }
    const id = requestAnimationFrame(() => setGlide(true));
    return () => cancelAnimationFrame(id);
  }, [following]);

  const { A, B } = at;
  const w = box?.w ?? 130;
  const h = box?.h ?? 26;
  // The triangle orbits the pill's real outline: find where the line from the centre to the tagged spot crosses the
  // stadium (flat sides + round ends), and turn the triangle to the outline's normal there.
  const { ex, ey, angle } = pillEdge(w, h, A.x - B.x, A.y - B.y);

  const anim = phase === 'in' ? 'tag-in' : phase === 'out' ? 'tag-out' : 'opacity-0';

  return (
    <>
      {/* the tagged spot: a quiet dot (pulses on pointer devices until the tags are out) */}
      <span
        aria-hidden
        className={`pointer-events-none absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80 shadow-[0_0_0_3px_rgba(255,255,255,0.25)] ${following ? 'hidden' : ''}`}
        style={{ left: A.x, top: A.y }}
      >
        {canHover && phase !== 'in' && <span className="dot-pulse absolute inset-0 rounded-full bg-white/70" style={{ animationDelay: `${index * 600}ms` }} />}
      </span>

      <div
        className="absolute left-0 top-0 will-change-transform"
        style={{ transform: `translate3d(${B.x}px, ${B.y}px, 0) translate(-50%, -50%)`, transition: glide ? 'transform 110ms ease-out' : 'none' }}
      >
        <div className="tag-float" style={{ ['--fd' as string]: `${index * -1.7}s` }}>
          <div className={anim} style={{ ['--d' as string]: `${canHover ? 0 : index * 150}ms`, transformOrigin: `${ex}px ${ey}px` }}>
            <a
              ref={bubble}
              href={tag.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={tag.label}
              onFocus={onFocusTag}
              onBlur={onBlurTag}
              className={`relative flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#0e0f0c] px-3 py-1.5 text-[11px] font-bold leading-none text-white shadow-[0_2px_8px_rgba(0,0,0,0.35)] md:text-xs ${phase === 'in' ? '' : 'pointer-events-none'}`}
            >
              <Instagram className="h-3.5 w-3.5 shrink-0" />
              {tag.handle}
              <span
                aria-hidden
                className="absolute h-2 w-3 bg-[#0e0f0c] [clip-path:polygon(50%_0,0_100%,100%_100%)]"
                style={{ left: ex - 6, top: ey - 7, transformOrigin: '50% 100%', transform: `rotate(${angle}deg)` }}
              />
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
