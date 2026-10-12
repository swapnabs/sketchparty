import { useState } from 'react';
import { socket } from '../socket.js';
import Replay from './Replay.jsx';
import Avatar from './Avatar.jsx';
import Podium from './Podium.jsx';
import Confetti from './Confetti.jsx';
import CountUp from './CountUp.jsx';

export default function GameEnd({ room, end, onLeave }) {
  const isHost = room.youId === room.hostId;
  const [pick, setPick] = useState(0);
  const standings = end?.standings ?? [...room.players].sort((a, b) => b.score - a.score);
  const replay = end?.replay ?? [];
  const tie = standings.length > 1 && standings[0].score === standings[1].score;
  const again = () => socket.emit('game:lobby', {}, () => {});
  const listStart = Math.min(3, standings.length) * 0.7 + 1.2;    // after the podium has finished

  return (
    <div className="end">
      <Confetti />
      <div className="card podiumcard">
        <h2 className="winner">{tie ? "It's a tie!" : `${standings[0].name} wins!`}</h2>
        <Podium standings={standings} youId={room.youId} />
      </div>

      <div className="card rankcard">
        <h2>Final ranking</h2>
        <ol className="podium">
          {standings.map((p, i) => {
            const delay = listStart + i * 0.55;      // revealed one by one, highest to lowest
            return (
              <li key={p.id} className={'reveal' + (i === 0 ? ' first' : '')} style={{ animationDelay: `${delay}s` }}>
                <div className="rankrow">
                  <span className={`rank r${i + 1}`}>#{i + 1}</span><Avatar a={p.avatar} size={30} />
                  <span className="pname">{p.name}{p.id === room.youId ? ' (you)' : ''}</span>
                  <span className="score"><CountUp to={p.score} ms={900} delay={delay * 1000} /></span>
                </div>
              </li>
            );
          })}
        </ol>
        {isHost
          ? <button className="btn primary wide" onClick={again}>Play again</button>
          : <p className="muted">The host can start another game.</p>}
        <button className="btn ghost wide" onClick={onLeave}>Leave room</button>
      </div>

      <div className="card replay">
        <h2>Drawing replay</h2>
        {replay.length === 0 ? <p className="muted">No drawings were made this game.</p> : (
          <>
            <div className="turns" role="tablist">
              {replay.map((t, i) => (
                <button key={i} role="tab" aria-selected={pick === i} className={'chip' + (pick === i ? ' on' : '')} onClick={() => setPick(i)}>
                  R{t.round}: {t.drawerName}
                </button>
              ))}
            </div>
            <Replay key={pick} turn={replay[pick]} />
          </>
        )}
      </div>
    </div>
  );
}
