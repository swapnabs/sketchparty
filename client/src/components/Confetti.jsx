import { useEffect, useMemo, useState } from 'react';
import { reducedMotion } from '../hooks.js';

const COLORS = ['#ffd93d', '#ef476f', '#3a86ff', '#06d6a0', '#8338ec', '#ff8a3d', '#ff7ab6'];

export default function Confetti({ delay = 1.0 }) {
  const [on, setOn] = useState(!reducedMotion());
  const pieces = useMemo(() => Array.from({ length: 90 }, (_, i) => ({
    left: Math.random() * 100,
    d: delay + Math.random() * 1.5,
    dur: 2.8 + Math.random() * 2.2,
    color: COLORS[i % COLORS.length],
    w: 6 + Math.random() * 6,
    rot: Math.random() * 360,
    drift: (Math.random() - 0.5) * 180,
  })), [delay]);
  useEffect(() => {
    const t = setTimeout(() => setOn(false), (delay + 7) * 1000);
    return () => clearTimeout(t);
  }, [delay]);
  if (!on) return null;
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <i key={i} style={{
          left: `${p.left}%`, width: p.w, height: p.w * 1.6, background: p.color,
          animationDelay: `${p.d}s`, animationDuration: `${p.dur}s`, '--drift': `${p.drift}px`, '--rot': `${p.rot}deg`,
        }} />
      ))}
    </div>
  );
}
