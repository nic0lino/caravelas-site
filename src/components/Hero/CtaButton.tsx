'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// The look of the trial-class button (Figma 16:942 / 21:2593). Hover turns the label white.
const LOOK =
  'flex min-h-[43px] w-[285px] max-w-full shrink-0 flex-wrap items-center justify-center gap-x-2.5 rounded-[10px] border border-[#66793a] bg-gradient-to-b from-[#99c82a] from-[66.4%] to-[#4b6215] to-[145%] px-4 py-2.5 text-center text-sm text-moss-900 drop-shadow-[4px_4px_2.85px_#304400] transition-[color,filter,translate] duration-200 hover:-translate-y-px hover:text-white hover:brightness-110 active:translate-y-px md:min-h-[70px] md:w-[402px] md:rounded-2xl md:px-6 md:text-lg';

/**
 * The hero's CTA, plus a copy fixed to the screen that fades in once the original has scrolled out above the viewport
 * and fades out again when the original comes back. The copy sits at the same X as the original (same column, same
 * alignment per breakpoint); only Y is fixed to the screen. It is rendered in <body> so no section can clip or cover it.
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

  return (
    <>
      <a
        ref={original}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`${LOOK} mx-auto mt-[87px] md:mx-0 md:mt-10 lg:mt-0`}
      >
        {content}
      </a>
      {mounted &&
        createPortal(
          <div className="sticky-cta pointer-events-none fixed inset-x-0 z-40" data-show={show}>
            {/* same column and gutters as the hero; same alignment as the original at each breakpoint */}
            <div className="container-col flex justify-center px-10 md:justify-start md:px-6 lg:justify-end">
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                tabIndex={show ? 0 : -1}
                aria-hidden={!show}
                className={`${LOOK} pointer-events-auto`}
              >
                {content}
              </a>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
