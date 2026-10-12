import { useState } from 'react';
import AvatarPicker from './AvatarPicker.jsx';
import { loadAvatar, saveAvatar } from '../avatars.js';

export default function Home({ roomId, hasSeat, error, online, initialName, onCreate, onJoin }) {
  const [name, setName] = useState(initialName || '');
  const [code, setCode] = useState('');
  const [avatar, setAvatar] = useState(loadAvatar);
  const n = name.trim();
  const change = (a) => { setAvatar(a); saveAvatar(a); };

  return (
    <div className="home">
      <div className="logo">
        <svg viewBox="0 0 64 64" width="56" height="56" aria-hidden="true">
          <rect x="6" y="8" width="52" height="42" rx="4" fill="#fbf9f2" stroke="#14212b" strokeWidth="3" />
          <path d="M14 38c6-14 12 6 18-8s10 6 18-6" fill="none" stroke="#ef476f" strokeWidth="4" strokeLinecap="round" />
          <path d="M20 58l8-8m16 8l-8-8" stroke="#14212b" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <h1>SketchParty</h1>
      </div>
      <p className="tagline">One person draws, everyone else guesses. Faster guesses score more.</p>

      <div className="card">
        <label htmlFor="name">Your name</label>
        <input id="name" value={name} maxLength={20} autoFocus placeholder="e.g. Swapna"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && n && (roomId ? onJoin(roomId, n, avatar) : onCreate(n, avatar))} />

        <label>Your avatar</label>
        <AvatarPicker value={avatar} onChange={change} />

        {roomId ? (
          <button className="btn primary wide" disabled={!n || !online} onClick={() => onJoin(roomId, n, avatar)}>
            {hasSeat ? `Rejoin room ${roomId}` : `Join room ${roomId}`}
          </button>
        ) : (
          <>
            <button className="btn primary wide" disabled={!n || !online} onClick={() => onCreate(n, avatar)}>Create a room</button>
            <div className="or"><span>or join with a code</span></div>
            <div className="row">
              <input value={code} maxLength={10} placeholder="Room code" aria-label="Room code"
                onChange={(e) => setCode(e.target.value.toUpperCase())} />
              <button className="btn" disabled={!n || code.length < 4 || !online} onClick={() => onJoin(code, n, avatar)}>Join</button>
            </div>
          </>
        )}
        {roomId && hasSeat && <p className="muted small">You were in this room. If you were disconnected less than 30 seconds ago, you get your seat and score back.</p>}
        {error && <p className="error" role="alert">{error}</p>}
        {!online && <p className="muted">Connecting to the server…</p>}
      </div>
    </div>
  );
}
