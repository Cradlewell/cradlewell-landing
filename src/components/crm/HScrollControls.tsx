"use client";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Explicit horizontal-scroll controls for wide data views (leads table,
// pipeline board). Attach `ref` to the scroll container and render
// <HScrollButtons ctrl={...} /> below it. Buttons page the view left/right and
// disable themselves at each edge. Pass a `dep` (e.g. row count) so the reachable
// range is re-measured when the content changes.
export interface HScrollCtrl<T extends HTMLElement> {
  ref: RefObject<T | null>;
  atStart: boolean;
  atEnd: boolean;
  scrollable: boolean;
  scrollLeft: () => void;
  scrollRight: () => void;
}

export function useHScroll<T extends HTMLElement>(dep?: unknown): HScrollCtrl<T> {
  const ref = useRef<T>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [scrollable, setScrollable] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setScrollable(el.scrollWidth > el.clientWidth + 1);
    setAtStart(el.scrollLeft <= 0);
    setAtEnd(Math.ceil(el.scrollLeft + el.clientWidth) >= el.scrollWidth);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [update, dep]);

  const page = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.8), behavior: "smooth" });
  };

  return {
    ref,
    atStart,
    atEnd,
    scrollable,
    scrollLeft: () => page(-1),
    scrollRight: () => page(1),
  };
}

export function HScrollButtons<T extends HTMLElement>({ ctrl }: { ctrl: HScrollCtrl<T> }) {
  if (!ctrl.scrollable) return null;
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, padding: "12px 0" }}>
      <button
        className="crm-btn crm-btn-ghost crm-btn-sm"
        onClick={ctrl.scrollLeft}
        disabled={ctrl.atStart}
        aria-label="Scroll left"
      >
        <ChevronLeft size={16} /> Left
      </button>
      <button
        className="crm-btn crm-btn-ghost crm-btn-sm"
        onClick={ctrl.scrollRight}
        disabled={ctrl.atEnd}
        aria-label="Scroll right"
      >
        Right <ChevronRight size={16} />
      </button>
    </div>
  );
}
