import { useEffect, useRef, useState } from 'react';
import { socket } from '../socket.js';
import Chat from './Chat.jsx';
import Avatar from './Avatar.jsx';
import AvatarPicker from './AvatarPicker.jsx';
import { saveAvatar } from '../avatars.js';

export default function Lobby({ room, chat, onLeave }) {
  const isHost = room.youId === room.hostId;
  const me = room.players.find((p) => p.id === room.youId);
  const taken = new Set(room.players.filter((p) => p.id !== room.youId).map((p) => p.avatar.emoji));
  const [rounds, setRounds] = useState(room.settings.rounds);
  const [drawTime, setDrawTime] = useState(room.settings.drawTime);
  const [difficulty, setDifficulty] = useState(room.settings.difficulty);
  const [words, setWords] = useState((room.settings.words || []).join(', '));
  const [err, setErr] = useState('');
  const [avErr, setAvErr] = useState('');
  const [copied, setCopied] = useState(false);
  const first = useRef(true);
  const shown = isHost
    ? { rounds, drawTime, difficulty }
    : { rounds: room.settings.rounds, drawTime: room.settings.drawTime, difficulty: room.settings.difficulty };

  // If the host leaves and this player becomes host, start from the room's current settings (no echo to the server)
  useEffect(() => {
    if (!isHost) return;
    first.current = true;
    setRounds(room.settings.rounds);
    setDrawTime(room.settings.drawTime);
    setDifficulty(room.settings.difficulty);
    setWords((room.settings.words || []).join(', '));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost]);
  const link = `${window.location.origin}/r/${room.roomId}`;

  // Host edits are pushed to the server (debounced); the server validates and broadcasts.
  useEffect(() => {
    if (!isHost) return undefined;
    if (first.current) { first.current = false; return undefined; }
    const t = setTimeout(() => {
      socket.emit('room:settings', { rounds, drawTime, words, difficulty }, (res) => setErr(res.ok ? '' : res.error));
    }, 350);
    return () => clearTimeout(t);
  }, [rounds, drawTime, words, difficulty, isHost]);

  const changeAvatar = (a) => {
    socket.emit('player:avatar', a, (res) => {
      setAvErr(res.ok ? '' : res.error);
      if (res.ok) saveAvatar(a);
    });
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); } catch {
      const ta = document.createElement('textarea'); ta.value = link; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); ta.remove();
    }
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };
  const start = () => socket.emit('game:start', {}, (res) => !res.ok && setErr(res.error));
  const connected = room.players.filter((p) => p.connected).length;

  return (
    <div className="lobby">
      <div className="card">
        <h2>Room {room.roomId}</h2>
        <label>Invite link</label>
        <div className="row">
          <input readOnly value={link} onFocus={(e) => e.target.select()} />
          <button className="btn" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
        </div>

        <h3>Players ({room.players.length})</h3>
        <ul className="plist">
          {room.players.map((p) => (
            <li key={p.id} className={p.connected ? '' : 'off'}>
              <Avatar a={p.avatar} size={30} />
              <span>{p.name}{p.id === room.youId ? ' (you)' : ''}</span>
              {p.id === room.hostId && <span className="tag">host</span>}
              {!p.connected && <span className="tag muted">reconnecting</span>}
            </li>
          ))}
        </ul>
        {me && (
          <details className="avatardetails">
            <summary>Change my avatar</summary>
            <AvatarPicker value={me.avatar} onChange={changeAvatar} taken={taken} />
            {avErr && <p className="error" role="alert">{avErr}</p>}
          </details>
        )}
      </div>

      <div className="card">
        <h3>Game settings {!isHost && <span className="muted small">(set by host)</span>}</h3>
        <label htmlFor="rounds">Rounds: <b>{shown.rounds}</b></label>
        <input id="rounds" type="range" min="1" max="10" value={shown.rounds} disabled={!isHost} onChange={(e) => setRounds(+e.target.value)} />
        <label htmlFor="dt">Draw time: <b>{shown.drawTime}s</b></label>
        <input id="dt" type="range" min="20" max="240" step="10" value={shown.drawTime} disabled={!isHost} onChange={(e) => setDrawTime(+e.target.value)} />
        <label htmlFor="diff">Word difficulty</label>
        <select id="diff" value={shown.difficulty} disabled={!isHost} onChange={(e) => setDifficulty(e.target.value)}>
          <option value="easy">Easy: everyday objects</option>
          <option value="medium">Medium: a mix of easy, medium and hard</option>
          <option value="hard">Hard: tricky words</option>
        </select>
        {isHost ? (
          <>
            <label htmlFor="words">Custom words <span className="muted small">(comma or line separated, at least 3; blank uses the built-in list and difficulty above)</span></label>
            <textarea id="words" rows="4" value={words} placeholder="rocket, dragon, pizza…" onChange={(e) => setWords(e.target.value)} />
          </>
        ) : (
          <p className="muted">{room.settings.wordCount ? `Using a custom list of ${room.settings.wordCount} words.` : 'Using the built-in word list.'}</p>
        )}
        {err && <p className="error" role="alert">{err}</p>}
        {isHost ? (
          <button className="btn primary wide" disabled={connected < 2} onClick={start}>
            {connected < 2 ? 'Waiting for another player…' : 'Start game'}
          </button>
        ) : (
          <p className="muted">Waiting for the host to start…</p>
        )}
        <button className="btn ghost wide" onClick={onLeave}>Leave room</button>
      </div>

      <div className="card lobbychat">
        <h3>Chat</h3>
        <Chat messages={chat} players={room.players} placeholder="Say hi before the game starts…" />
      </div>
    </div>
  );
}
