"use client";

import { useRef, useState, useEffect, type ReactNode } from "react";

export default function ScrollHint({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function update() {
    const el = ref.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);

  function scroll(direction: "left" | "right") {
    ref.current?.scrollBy({
      left: direction === "left" ? -340 : 340,
      behavior: "smooth",
    });
  }

  return (
    <div className="relative">
      <div ref={ref} className="overflow-x-auto pb-4">
        {children}
      </div>

      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[var(--th-scroll-fade)] to-transparent pointer-events-none" style={{ zIndex: 30 }} />
      )}
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[var(--th-scroll-fade)] to-transparent pointer-events-none" style={{ zIndex: 30 }} />
      )}

      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          className="fixed left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-[var(--th-arrow-bg)] hover:bg-[var(--th-arrow-hover)] backdrop-blur-sm flex items-center justify-center transition-colors cursor-pointer shadow-lg shadow-[var(--th-shadow)]"
          style={{ zIndex: 40 }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M14 5L7 12L14 19" stroke="var(--th-arrow-stroke)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          className="fixed right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-[var(--th-arrow-bg)] hover:bg-[var(--th-arrow-hover)] backdrop-blur-sm flex items-center justify-center transition-colors cursor-pointer shadow-lg shadow-[var(--th-shadow)]"
          style={{ zIndex: 40 }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M10 5L17 12L10 19" stroke="var(--th-arrow-stroke)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </div>
  );
}
