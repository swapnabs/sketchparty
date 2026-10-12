import Avatar from './Avatar.jsx';
import CountUp from './CountUp.jsx';

/** Top 3 on a podium. Bars rise from 3rd to 1st, then the winner's crown drops in. */
export default function Podium({ standings, youId }) {
  const top = standings.slice(0, 3);
  const order = top.length === 1 ? [0] : top.length === 2 ? [1, 0] : [1, 0, 2];
  const heights = [170, 125, 90];
  return (
    <div className="podium3" role="list" aria-label="Top players">
      {order.map((i) => {
        const p = top[i];
        const d = i * 0.7 + 0.2;     // reveal from highest to lowest
        return (
          <div key={p.id} role="listitem" className={`step s${i + 1}`} style={{ '--d': `${d + 0.5}s` }}>
            {i === 0 && <span className="crown" aria-hidden="true">👑</span>}
            <div className="pav"><Avatar a={p.avatar} size={i === 0 ? 68 : 54} /></div>
            <div className="pn">{p.name}{p.id === youId ? ' (you)' : ''}</div>
            <div className="pbar" style={{ height: heights[i], animationDelay: `${d}s` }}>
              <span className="place">{i + 1}</span>
              <b><CountUp to={p.score} ms={1200} delay={d * 1000} /></b>
            </div>
          </div>
        );
      })}
    </div>
  );
}
