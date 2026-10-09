'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// The trial-class button (Figma 16:942 / 21:2593). Its hard shadow is its own layer so it can use `multiply`
// (a CSS drop-shadow can't pick a blend mode, and normal blending looks dirty over light backgrounds).
const SIZE = 'w-[285px] max-w-full md:w-[402px]';
const ROUND = 'rounded-[10px] md:rounded-2xl';
const FACE =
  'flex min-h-[43px] w-full flex-wrap items-center justify-center gap-x-2.5 border border-[#66793a] bg-gradient-to-b from-[#99c82a] from-[66.4%] to-[#4b6215] to-[145%] px-4 py-2.5 text-center text-sm text-moss-900 transition-[color,filter,translate] duration-200 hover:-translate-y-px hover:text-white hover:brightness-110 active:translate-y-px md:min-h-[70px] md:px-6 md:text-lg';
// 4px 4px, blur 2.85px, #304400 — multiplied into whatever is behind
const SHADOW = 'pointer-events-none absolute inset-0 translate-x-1 translate-y-1 bg-[#304400] blur-[2.85px] mix-blend-multiply transition-[translate] duration-200';

/**
 * The hero's CTA, plus a copy fixed to the screen that fades in once the original has scrolled out above the viewport
 * and fades out again when it is back. The copy sits at the same X as the original (same column, same alignment per
 * breakpoint); only Y is fixed. It lives in <body> (portal) so no section can clip or cover it, and its shadow is a
 * second fixed layer: a `fixed` element is its own stacking context, so a blend mode inside it couldn't reach the page.
 */
export function CtaButton({ href, label, badge }: { href: string; label: string; badge: string }) {
  const original = useRef<HTMLAnchorElement>(null);
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    setMounted(true);
    const el = original.current;
    if (!el) return;
    // shown only when the original is out of view *above* (scrolled past), never while it is still below the fold
    const io = new IntersectionObserver(([e]) => setShow(!e!.isIntersecting && e!.boundingClientRect.bottom < 0));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const content = (
    <>
      <span className="font-medium">{label}</span>
      <span className="font-black">{badge}</span>
    </>
  );
  // same column and gutters as the hero; same alignment as the original at each breakpoint
  const column = 'container-col flex justify-center px-10 md:justify-start md:px-6 lg:justify-end';

  return (
    <>
      <div className={`group relative mx-auto mt-[87px] md:mx-0 md:mt-10 lg:mt-0 ${SIZE}`}>
        <span aria-hidden className={`${SHADOW} ${ROUND} group-hover:translate-x-[3px] group-hover:translate-y-[3px]`} />
        <a ref={original} href={href} target="_blank" rel="noopener noreferrer" className={`relative ${FACE} ${ROUND}`}>
          {content}
        </a>
      </div>
      {mounted &&
        createPortal(
          <>
            {/* shadow layer (multiply against the page) */}
            <div aria-hidden className="sticky-layer sticky-cta-shadow pointer-events-none fixed inset-x-0 z-[39] mix-blend-multiply" data-show={show}>
              <div className={column}>
                <div className={`relative ${SIZE}`}>
                  <span className={`${SHADOW} ${ROUND}`} />
                  {/* invisible twin: gives the shadow the exact size of the button, even if its text wraps */}
                  <span className={`invisible ${FACE} ${ROUND}`}>{content}</span>
                </div>
              </div>
            </div>
            <div className="sticky-layer sticky-cta pointer-events-none fixed inset-x-0 z-40" data-show={show}>
              <div className={column}>
                <div className={`pointer-events-auto ${SIZE}`}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    tabIndex={show ? 0 : -1}
                    aria-hidden={!show}
                    className={`${FACE} ${ROUND}`}
                  >
                    {content}
                  </a>
                </div>
              </div>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
