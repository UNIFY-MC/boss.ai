"use client";
// Animated number that ticks from its previous value to the target value
// over ~700ms with an ease-out curve. Used on dashboard stat cards so
// the page feels alive on first paint and when polls update counts.
//
// Respects prefers-reduced-motion. SSR-safe (initial render = target).

import { useEffect, useRef, useState } from "react";

const DURATION_MS = 700;

function easeOutQuart(t) {
  return 1 - Math.pow(1 - t, 4);
}

export default function CountUp({ value, className }) {
  const target = Number(value) || 0;
  // Start from 0 so first-paint always animates up; subsequent updates
  // animate from whatever the previous displayed value was.
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    // Respect reduced-motion users — set value instantly.
    const reduce = typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduce) {
      prevRef.current = target;
      setDisplay(target);
      return;
    }
    const from = prevRef.current;
    const to = target;
    const start = performance.now();

    const tick = (now) => {
      const t = Math.min(1, (now - start) / DURATION_MS);
      const eased = easeOutQuart(t);
      const next = Math.round(from + (to - from) * eased);
      setDisplay(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        prevRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target]);

  return <span className={className}>{display.toLocaleString()}</span>;
}
