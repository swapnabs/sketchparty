import { useCallback, useEffect, useRef, useState } from 'react';
import { socket } from './socket.js';
import { canvasStore } from './canvasStore.js';
import { loadAvatar } from './avatars.js';
import Home from './components/Home.jsx';
import Lobby from './components/Lobby.jsx';
import Game from './components/Game.jsx';
import GameEnd from './components/GameEnd.jsx';

const urlRoom = () => {
  const m = window.location.pathname.match(/^\/r\/([A-Za-z0-9]{4,10})\/?$/);
  return m ? m[1].toUpperCase() : null;
};
// The seat token lives in sessionStorage: it survives a refresh of THIS tab, but a second tab or window
// of the same browser is a separate player instead of stealing the first tab's seat.
const loadSession = (id) => { try { return JSON.parse(sessionStorage.getItem('sp:' + id)); } catch { return null; } };
// Also remember the last seat browser-wide, so closing a tab and reopening the link within 30 s can reclaim it.
const loadSeat = (id) => { try { return JSON.parse(localStorage.getItem('sp:seat:' + id)); } catch { return null; } };
const saveSession = (id, s) => {
  sessionStorage.setItem('sp:' + id, JSON.stringify(s));
  try { localStorage.setItem('sp:seat:' + id, JSON.stringify(s)); } catch { /* storage unavailable */ }
};

export default function App() {
  const [roomId, setRoomId] = useState(urlRoom());
  const [joined, setJoined] = useState(false);
  const [room, setRoom] = useState(null);
  const [chat, setChat] = useState([]);
  const [end, setEnd] = useState(null);
  const [offset, setOffset] = useState(0);
  const [online, setOnline] = useState(socket.connected);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [gone, setGone] = useState(false);

  const roomRef = useRef(roomId);
  const joinedRef = useRef(false);
  const nameRef = useRef(localStorage.getItem('sp:name') || '');
  roomRef.current = roomId;
  joinedRef.current = joined;

  const showToast = useCallback((t) => {
    setToast(t);
    clearTimeout(showToast.t);
    showToast.t = setTimeout(() => setToast(''), 2500);
  }, []);

  const join = useCallback((id, name, avatar) => {
    const s = loadSession(id);              // this tab's own seat (survives a refresh)
    const seat = s || loadSeat(id);         // otherwise the browser's last seat, claimed only if nobody is using it
    socket.emit('room:join', { roomId: id, name, avatar: avatar || loadAvatar(), playerId: seat?.playerId, token: seat?.token, weak: !s }, (res) => {
      if (!res.ok) {
        setError(res.error);
        if (joinedRef.current || s) setGone(/not found/i.test(res.error));
        setJoined(false);
        return;
      }
      saveSession(id, { playerId: res.playerId, token: res.token });
      localStorage.setItem('sp:name', name);
      nameRef.current = name;
      setError(''); setGone(false); setJoined(true); setRoomId(id);
      if (urlRoom() !== id) window.history.pushState(null, '', `/r/${id}`);
    });
  }, []);

  const create = useCallback((name, avatar) => {
    socket.emit('room:create', { name, avatar: avatar || loadAvatar() }, (res) => {
      if (!res.ok) return setError(res.error);
      saveSession(res.roomId, { playerId: res.playerId, token: res.token });
      localStorage.setItem('sp:name', name);
      nameRef.current = name;
      setError(''); setGone(false); setJoined(true); setRoomId(res.roomId);
      window.history.pushState(null, '', `/r/${res.roomId}`);
    });
  }, []);

  useEffect(() => {
    canvasStore.onNeedResync = () => socket.emit('canvas:resync');

    socket.on('connect', () => {
      setOnline(true);
      const id = roomRef.current;
      // Reconnect/refresh: silently take our old seat back using the stored token
      if (id && nameRef.current && (joinedRef.current || loadSession(id))) join(id, nameRef.current);
    });
    socket.on('disconnect', () => setOnline(false));
    socket.on('room:state', (s) => {
      setRoom(s);
      setOffset(s.serverNow - Date.now());
      if (s.phase !== 'gameEnd') setEnd(null);
    });
    socket.on('chat:history', (h) => setChat(h));
    socket.on('chat', (m) => setChat((c) => [...c.slice(-149), m]));
    socket.on('notice', showToast);
    socket.on('game:end', setEnd);
    socket.on('canvas:snapshot', (s) => canvasStore.snapshot(s));
    socket.on('draw', (ev) => canvasStore.remote(ev));
    socket.connect();
    return () => { socket.removeAllListeners(); socket.disconnect(); };
  }, [join, showToast]);

  const leave = () => {
    socket.emit('room:leave', {}, () => {});
    if (roomId) { sessionStorage.removeItem('sp:' + roomId); localStorage.removeItem('sp:seat:' + roomId); }   // leaving on purpose gives the seat up
    setJoined(false); setRoom(null); setRoomId(null); setChat([]); setEnd(null); setGone(false);
    window.history.pushState(null, '', '/');
  };

  let body;
  if (!joined || !room) {
    body = gone ? (
      <div className="card center">
        <h2>This room has ended</h2>
        <p>The server no longer has room {roomId}. It may have been idle too long or the server restarted.</p>
        <button className="btn primary" onClick={leave}>Start a new room</button>
      </div>
    ) : (
      <Home roomId={roomId} hasSeat={!!(roomId && loadSeat(roomId))} error={error} online={online} initialName={nameRef.current} onCreate={create} onJoin={join} />
    );
  } else if (room.phase === 'lobby') {
    body = <Lobby room={room} chat={chat} onLeave={leave} />;
  } else if (room.phase === 'gameEnd') {
    body = <GameEnd room={room} end={end} onLeave={leave} />;
  } else {
    body = <Game room={room} chat={chat} offset={offset} onLeave={leave} />;
  }

  return (
    <div className="app">
      {joined && !online && <div className="banner">Connection lost. Reconnecting, your seat and score are kept for 30 seconds…</div>}
      {body}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
