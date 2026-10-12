import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Avatar from './Avatar.jsx';
import { reducedMotion, useCountUp } from '../hooks.js';

function Row({ p, rank, room, setRef }) {
  const shown = useCountUp(p.score, 900);
  const prev = useRef(p.score);
  const [gain, setGain] = useState(null);
  useEffect(() => {
    if (p.score > prev.current) {
      setGain({ n: p.score - prev.current, k: Math.random() });
      const t = setTimeout(() => setGain(null), 1800);
      prev.current = p.score;
      return () => clearTimeout(t);
    }
    prev.current = p.score;
    return undefined;
  }, [p.score]);

  return (
    <li ref={setRef} className={[p.connected ? '' : 'off', p.id === room.drawerId ? 'drawer' : '', p.guessed ? 'guessed' : '', gain ? 'flash' : ''].join(' ')}>
      <span className={`rank r${rank}`}>#{rank}</span>
      <Avatar a={p.avatar} />
      <span className="pname">
        <span className="nm">
          {p.guessed && <span className="tick" aria-label="guessed">✓ </span>}{p.name}{p.id === room.youId ? ' (you)' : ''}
          {p.id === room.hostId && <small title="Host"> host</small>}
        </span>
        <em className="status">{p.id === room.drawerId ? 'drawing' : p.guessed ? 'guessed' : !p.connected ? 'offline' : ''}</em>
      </span>
      <span className="score">
        {shown}
        {gain && <span key={gain.k} className="gain">+{gain.n}</span>}
      </span>
    </li>
  );
}

export default function Players({ room }) {
  const sorted = [...room.players].sort((a, b) => b.score - a.score);
  const els = useRef(new Map());
  const tops = useRef(new Map());

  // FLIP: when scores reorder the board, rows slide to their new place instead of jumping
  useLayoutEffect(() => {
    els.current.forEach((el, id) => {
      const top = el.offsetTop;
      const before = tops.current.get(id);
      if (before !== undefined && before !== top && !reducedMotion() && el.animate) {
        el.animate([{ transform: `translateY(${before - top}px)` }, { transform: 'none' }], { duration: 500, easing: 'cubic-bezier(.2,.8,.2,1)' });
      }
      tops.current.set(id, top);
    });
  });

  return (
    <ol className="players" aria-label="Scoreboard">
      {sorted.map((p, i) => (
        <Row key={p.id} p={p} rank={i + 1} room={room}
          setRef={(el) => (el ? els.current.set(p.id, el) : els.current.delete(p.id))} />
      ))}
    </ol>
  );
}
