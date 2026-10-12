import { useEffect, useMemo, useRef, useState } from 'react';
import { socket } from '../socket.js';
import Board from './Board.jsx';
import Chat from './Chat.jsx';
import Players from './Players.jsx';
import Avatar from './Avatar.jsx';
import CountUp from './CountUp.jsx';

function useSecondsLeft(endsAt, offset) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  return endsAt ? Math.max(0, Math.ceil((endsAt - (now + offset)) / 1000)) : 0;
}

const REASONS = {
  time: "Time's up!",
  all_guessed: 'Everyone got it!',
  drawer_left: 'The drawer left, skipping this turn.',
};

export default function Game({ room, chat, offset, onLeave }) {
  const secs = useSecondsLeft(room.phaseEndsAt, offset);
  const isDrawer = room.youId === room.drawerId;
  const drawer = room.players.find((p) => p.id === room.drawerId);
  const me = room.players.find((p) => p.id === room.youId);
  const drawing = room.phase === 'drawing';
  const knowsWord = !!room.word;
  const canVote = !isDrawer && (drawing || room.phase === 'turnEnd');

  // Floating 👍/👎 whenever somebody votes
  const [bursts, setBursts] = useState([]);
  const prevVotes = useRef(room.votes);
  useEffect(() => {
    const prev = prevVotes.current;
    const add = [];
    for (let i = 0; i < room.votes.up - prev.up; i++) add.push('👍');
    for (let i = 0; i < room.votes.down - prev.down; i++) add.push('👎');
    prevVotes.current = room.votes;
    if (!add.length) return undefined;
    const items = add.map((emoji) => ({ emoji, id: Math.random(), x: 10 + Math.random() * 80 }));
    setBursts((b) => [...b, ...items]);
    const t = setTimeout(() => setBursts((b) => b.filter((x) => !items.includes(x))), 2200);
    return () => clearTimeout(t);
  }, [room.votes]);

  const headline = useMemo(() => {
    if (room.phase === 'choosing') return <span className="hint muted">{isDrawer ? 'Pick a word to draw' : `${drawer?.name ?? 'Someone'} is choosing a word…`}</span>;
    if (room.phase === 'turnEnd') return <span className="hint">{room.word}</span>;
    if (knowsWord) return <span className="hint"><small>{isDrawer ? 'Draw' : 'Word'}</small> {room.word}</span>;
    if (room.hint) {
      return (
        <span className="hint" aria-label={`${room.hint.filter((c) => c !== ' ').length} letter word`}>
          {room.hint.map((c, i) => <span key={i} className={'ch' + (c === ' ' ? ' gap' : c === '_' ? ' blank' : '')}>{c === ' ' ? '' : c}</span>)}
          {me?.guessed && <span className="gotit">✓ You got it!</span>}
        </span>
      );
    }
    return null;
  }, [room.phase, room.word, room.hint, knowsWord, isDrawer, drawer, me?.guessed]);

  const chooseWord = (index) => socket.emit('word:choose', { index }, () => {});
  const vote = (value) => socket.emit('vote', { value }, () => {});
  const placeholder = isDrawer ? 'Chat with everyone (not the word!)…' : me?.guessed ? 'You got it! Chat with other guessers…' : drawing ? 'Type your guess…' : 'Say something…';

  return (
    <div className="game">
      <header className="hud">
        <div className="round">Round {room.round}<small>/{room.totalRounds}</small></div>
        <div className="word" aria-live="polite">{headline}</div>
        <div className={'clock' + (secs <= 10 && room.phase !== 'turnEnd' ? ' low' : '')} aria-label="Seconds left">{room.phase === 'turnEnd' ? '' : secs}</div>
      </header>

      <aside className="side-left">
        <Players room={room} />
        <button className="btn ghost small" onClick={onLeave}>Leave game</button>
      </aside>

      <main className="main">
        <Board canDraw={drawing && isDrawer} isDrawer={isDrawer}>
          {(drawing || room.phase === 'turnEnd') && (
            <div className="votes onscreen" role="group" aria-label="Rate the drawing">
              <button className={'vote up' + (room.myVote === 'up' ? ' on' : '')} disabled={!canVote} aria-pressed={room.myVote === 'up'}
                aria-label="Like the drawing" onClick={() => vote('up')}>👍 <span>{room.votes.up}</span></button>
              <button className={'vote down' + (room.myVote === 'down' ? ' on' : '')} disabled={!canVote} aria-pressed={room.myVote === 'down'}
                aria-label="Dislike the drawing" onClick={() => vote('down')}>👎 <span>{room.votes.down}</span></button>
            </div>
          )}
          <div className="reactions" aria-hidden="true">
            {bursts.map((b) => <span key={b.id} style={{ left: `${b.x}%` }}>{b.emoji}</span>)}
          </div>
          {room.phase === 'choosing' && isDrawer && (
            <div className="overlay">
              <h3>Choose a word</h3>
              <div className="choices">
                {room.choices?.map((w, i) => <button key={w} className="btn primary" onClick={() => chooseWord(i)}>{w}</button>)}
              </div>
              <p className="muted">A random one is picked in {secs}s</p>
            </div>
          )}
          {room.phase === 'choosing' && !isDrawer && (
            <div className="overlay light"><p><b>{drawer?.name}</b> is choosing a word…</p></div>
          )}
          {room.phase === 'turnEnd' && room.lastTurn && (
            <div className="overlay">
              <p className="muted">{REASONS[room.lastTurn.reason]}</p>
              {room.lastTurn.word && <h3>The word was <mark>{room.lastTurn.word}</mark></h3>}
              {room.lastTurn.word && <p className="votesum">Drawing by {room.lastTurn.drawerName}: 👍 {room.lastTurn.votes.up} &nbsp; 👎 {room.lastTurn.votes.down}</p>}
              <ul className="deltas">
                {room.lastTurn.deltas.map((d, i) => (
                  <li key={d.id} className={'slidein' + (d.guessed ? ' got' : '')} style={{ animationDelay: `${i * 0.12}s` }}>
                    <Avatar a={d.avatar} size={26} />
                    <span className="dname">{d.guessed && <span className="tick">✓ </span>}{d.name}{d.id === room.youId ? ' (you)' : ''}</span>
                    <span className={'dgain' + (d.delta ? '' : ' zero')}>+{d.delta}</span>
                    <b className="dtotal"><CountUp to={d.total} ms={900} initial={d.total - d.delta} delay={i * 120 + 200} /></b>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Board>

        {isDrawer && drawing && <p className="muted center small">You are drawing. Guessers can't see the word, only the letters revealed over time.</p>}
      </main>

      <aside className="side-right">
        <Chat messages={chat} players={room.players} placeholder={placeholder} />
      </aside>
    </div>
  );
}
