import { useEffect, useMemo, useRef, useState } from 'react';
import { CanvasModel } from '../canvasModel.js';

const MAX_GAP = 1200;   // squash long pauses so replays stay watchable

export default function Replay({ turn }) {
  const host = useRef(null);
  const model = useRef(null);
  const run = useRef({ idx: 0, elapsed: 0, last: 0, raf: 0 });
  const speedRef = useRef(4);
  const [speed, setSpeed] = useState(4);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(1);

  // Re-time events: same order, but with pauses longer than MAX_GAP squashed.
  const events = useMemo(() => {
    let prev = 0, shift = 0;
    return turn.events.map((e) => {
      const gap = e.t - prev;
      if (gap > MAX_GAP) shift += gap - MAX_GAP;
      prev = e.t;
      return { ...e, t: e.t - shift };
    });
  }, [turn]);
  const duration = events.length ? events[events.length - 1].t : 0;

  const stop = () => { cancelAnimationFrame(run.current.raf); setPlaying(false); };
  const showFinal = () => {
    model.current.setOps([]);
    for (const e of events) model.current.apply(e);
    run.current.idx = events.length;
    setProgress(1);
  };

  useEffect(() => {
    const canvas = document.createElement('canvas');
    host.current.appendChild(canvas);
    model.current = new CanvasModel(canvas);
    showFinal();
    return () => { cancelAnimationFrame(run.current.raf); canvas.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  const loop = (ts) => {
    const r = run.current;
    r.elapsed += (ts - r.last) * speedRef.current;
    r.last = ts;
    while (r.idx < events.length && events[r.idx].t <= r.elapsed) model.current.apply(events[r.idx++]);
    setProgress(duration ? Math.min(1, r.elapsed / duration) : 1);
    if (r.idx >= events.length) return setPlaying(false);
    r.raf = requestAnimationFrame(loop);
  };

  const play = () => {
    const r = run.current;
    cancelAnimationFrame(r.raf);
    model.current.setOps([]);
    r.idx = 0; r.elapsed = 0; r.last = performance.now();
    setProgress(0); setPlaying(true);
    r.raf = requestAnimationFrame(loop);
  };

  return (
    <div className="replayer">
      <p className="muted">{turn.drawerName} drew <mark>{turn.word}</mark> ({turn.events.length} strokes and actions)</p>
      <div className="paper" ref={host} />
      <div className="controls">
        <button className="btn primary" onClick={play}>{playing ? 'Restart' : 'Replay'}</button>
        {playing && <button className="btn" onClick={() => { stop(); showFinal(); }}>Skip to end</button>}
        <label className="small">Speed
          <select value={speed} onChange={(e) => { setSpeed(+e.target.value); speedRef.current = +e.target.value; }}>
            <option value="1">1×</option><option value="2">2×</option><option value="4">4×</option><option value="8">8×</option>
          </select>
        </label>
        <progress value={progress} max="1" aria-label="Replay progress" />
      </div>
    </div>
  );
}
