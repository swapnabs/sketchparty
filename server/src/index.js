'use strict';
const http = require('http');
const path = require('path');
const fs = require('fs');
const express = require('express');
const { Server } = require('socket.io');
const { monitorEventLoopDelay } = require('perf_hooks');
const { Room } = require('./game');
const { TokenBucket, LIMITS } = require('./limits');
const { randomId } = require('./util');

const PORT = Number(process.env.PORT) || 3001;
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  maxHttpBufferSize: 16 * 1024,        // hard cap on any single incoming message (16 KB)
  pingInterval: 5000,
  pingTimeout: 8000,
  perMessageDeflate: false,            // less CPU per message; strokes are tiny anyway
});

const rooms = new Map();
const loop = monitorEventLoopDelay({ resolution: 10 });
loop.enable();

// ───────── HTTP: health, metrics, static client ─────────
app.get('/healthz', (_req, res) => res.json({ ok: true }));
app.get('/metrics', (_req, res) => {
  const mem = process.memoryUsage();
  res.json({
    rooms: rooms.size,
    sockets: io.engine.clientsCount,
    rssMB: Math.round(mem.rss / 1048576),
    heapMB: Math.round(mem.heapUsed / 1048576),
    cpuMs: Math.round((process.cpuUsage().user + process.cpuUsage().system) / 1000),
    loopLagMs: { p50: loop.percentile(50) / 1e6, p99: loop.percentile(99) / 1e6, max: loop.max / 1e6 },
    uptimeS: Math.round(process.uptime()),
  });
});
app.post('/metrics/reset', (_req, res) => { loop.reset(); res.json({ ok: true }); });

const dist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
} else {
  app.get('/', (_req, res) => res.send('Client not built. Run `npm start` from the repo root (or `npm run dev`).'));
}

// ───────── helpers ─────────
function ctxOf(socket) {
  const { roomId, playerId } = socket.data || {};
  const room = roomId && rooms.get(roomId);
  const player = room && room.players.get(playerId);
  return room && player && player.socketId === socket.id ? { room, player } : null;
}

/** Wrap a handler: ack-safe, never throws into the event loop. */
function handler(fn) {
  return (...args) => {
    const cb = typeof args[args.length - 1] === 'function' ? args[args.length - 1] : () => {};
    try {
      const out = fn(...args.filter((a) => typeof a !== 'function'));
      cb({ ok: true, ...(out || {}) });
    } catch (err) {
      cb({ ok: false, error: err.message || 'Something went wrong' });
    }
  };
}

function newRoom(settings) {
  if (rooms.size >= LIMITS.MAX_ROOMS) throw new Error('Server is busy, try again soon');
  let id;
  do { id = randomId(6); } while (rooms.has(id));
  const room = new Room(io, id, settings, (r) => rooms.delete(r.id));
  rooms.set(id, room);
  return room;
}

// ───────── sockets ─────────
io.on('connection', (socket) => {
  socket.data = {};
  const flood = new TokenBucket(300, 200);     // catch-all limiter on every incoming event
  let violations = 0;
  socket.use((_packet, next) => {
    if (flood.take()) return next();
    if (++violations > 300) socket.disconnect(true);
  });
  const joinLimit = new TokenBucket(5, 0.2);

  socket.on('latency', (cb) => typeof cb === 'function' && cb());

  socket.on('room:create', handler((data) => {
    if (!joinLimit.take()) throw new Error('Too many attempts, wait a moment');
    const room = newRoom(data?.settings);
    const player = room.addPlayer(data?.name, data?.avatar);
    room.attach(player, socket);
    return { roomId: room.id, playerId: player.id, token: player.token };
  }));

  socket.on('room:join', handler((data) => {
    if (!joinLimit.take()) throw new Error('Too many attempts, wait a moment');
    const room = rooms.get(String(data?.roomId || '').toUpperCase());
    if (!room) throw new Error('Room not found. It may have ended or the server restarted.');
    let player = room.authenticate(data?.playerId, data?.token);     // refresh / reconnect
    // A fresh tab only has the browser-wide "last seat" token (weak). It may reclaim a seat that is
    // currently disconnected (tab closed, network dropped), but never steal one another live tab is using.
    if (player && data?.weak && player.connected) player = null;
    if (!player) player = room.addPlayer(data?.name, data?.avatar);                // brand-new player
    room.attach(player, socket);
    return { roomId: room.id, playerId: player.id, token: player.token };
  }));

  socket.on('room:settings', handler((data) => {
    const c = ctxOf(socket); if (!c) throw new Error('Not in a room');
    c.room.updateSettings(c.player, data);
  }));
  socket.on('game:start', handler(() => {
    const c = ctxOf(socket); if (!c) throw new Error('Not in a room');
    c.room.startGame(c.player);
  }));
  socket.on('game:lobby', handler(() => {
    const c = ctxOf(socket); if (!c) throw new Error('Not in a room');
    c.room.resetToLobby(c.player);
  }));
  socket.on('word:choose', handler((data) => {
    const c = ctxOf(socket); if (!c) return;
    c.room.chooseWord(c.player, data?.index);
  }));
  socket.on('chat', handler((data) => {
    const c = ctxOf(socket); if (!c) return;
    c.room.chat(c.player, data?.text);
  }));
  socket.on('draw', (ev) => {
    const c = ctxOf(socket); if (!c) return;
    try { c.room.draw(c.player, socket, ev); } catch { /* malformed input is dropped */ }
  });
  socket.on('canvas:resync', () => {
    const c = ctxOf(socket); if (c) c.room.requestResync(c.player);
  });
  socket.on('vote', handler((data) => {
    const c = ctxOf(socket); if (!c) return;
    c.room.vote(c.player, data?.value);
  }));
  socket.on('player:avatar', handler((data) => {
    const c = ctxOf(socket); if (!c) throw new Error('Not in a room');
    c.room.setAvatar(c.player, data);
  }));
  socket.on('room:leave', handler(() => {
    const c = ctxOf(socket); if (!c) return;
    c.room.removePlayer(c.player.id, 'left');
  }));

  socket.on('disconnect', () => {
    const c = ctxOf(socket);
    if (c) c.room.onDisconnect(c.player);
  });
});

// Reap rooms nobody has been connected to for a while
setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    if (room.connectedPlayers.length === 0 && now - room.lastActive > 5 * 60 * 1000) {
      room.destroy();
      rooms.delete(room.id);
    }
  }
}, 30000).unref();

server.listen(PORT, () => console.log(`SketchParty server on http://localhost:${PORT}`));

process.on('SIGTERM', () => { console.log('SIGTERM: shutting down (in-memory rooms are lost)'); process.exit(0); });
