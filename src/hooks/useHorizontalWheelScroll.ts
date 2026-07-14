"use client";
import { useEffect, useRef, type RefObject } from "react";

// Lets a plain mouse (vertical wheel only) scroll a horizontally-overflowing
// container sideways. Attach the returned ref to the scroll container.
//
// It's boundary-aware: when the container is already at its far-left or far-right
// edge, the wheel event is left alone so the page keeps scrolling vertically as
// usual. Trackpad horizontal gestures (deltaX dominant) are also left to the
// browser's native handling.
export function useHorizontalWheelScroll<T extends HTMLElement>(): RefObject<T | null> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return;
      // Native horizontal intent (trackpad) — don't interfere.
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (el.scrollWidth <= el.clientWidth) return; // nothing to scroll sideways

      const atLeft = el.scrollLeft <= 0;
      const atRight = Math.ceil(el.scrollLeft + el.clientWidth) >= el.scrollWidth;
      // At a horizontal edge in the wheel's direction → let the page scroll.
      if ((e.deltaY < 0 && atLeft) || (e.deltaY > 0 && atRight)) return;

      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };

    // passive:false so preventDefault takes effect.
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  return ref;
}
