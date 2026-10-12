import { useEffect, useRef, useState } from 'react';

export const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Smoothly counts a number up/down to `target` (ease-out). Skips animation if the user prefers reduced motion. */
export function useCountUp(target, ms = 800, initial = target, delay = 0) {
  const [val, setVal] = useState(initial);
  const from = useRef(initial);
  const raf = useRef(0);
  useEffect(() => {
    if (reducedMotion() || from.current === target) { setVal(target); from.current = target; return undefined; }
    const a = from.current;
    let start = 0;
    const step = (t) => {
      if (!start) start = t;
      const k = Math.min(1, (t - start) / ms);
      const v = Math.round(a + (target - a) * (1 - Math.pow(1 - k, 3)));
      setVal(v);
      from.current = v;
      if (k < 1) raf.current = requestAnimationFrame(step); else from.current = target;
    };
    const timer = setTimeout(() => { raf.current = requestAnimationFrame(step); }, delay);
    return () => { clearTimeout(timer); cancelAnimationFrame(raf.current); };
  }, [target, ms, delay]);
  return val;
}
