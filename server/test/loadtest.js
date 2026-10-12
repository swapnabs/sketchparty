'use strict';
/**
 * Capacity test. For each step, starts a FRESH server, creates N rooms of 4 bots each
 * (1 drawer streaming ~60 points/s in 30ms batches, 3 guessers chatting every ~3s), lets it run,
 * then reports: round-trip latency percentiles seen by the bots, server CPU (fraction of one core),
 * RSS memory, event-loop lag, and message throughput.
 *
 *   node server/test/loadtest.js                      # default steps
 *   node server/test/loadtest.js --steps 50,200,400 --secs 20
 *   node server/test/loadtest.js --url http://host:3001 --steps 100   # test an already running server
 */
const { spawn } = require('child_process');
const path = require('path');
const { io } = require('socket.io-client');

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > -1 ? process.argv[i + 1] : d; };
const STEPS = arg('steps', '25,50,100,200,400').split(',').map(Number);
const SECS = Number(arg('secs', 20));
const PLAYERS = Number(arg('players', 4));
const EXTERNAL = arg('url', null);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pct = (arr, p) => (arr.length ? arr.slice().sort((a, b) => a - b)[Math.min(arr.length - 1, Math.floor((p / 100) * arr.length))] : 0);

async function startServer() {
  if (EXTERNAL) return { url: EXTERNAL, stop() {} };
  const port = 5000 + Math.floor(Math.random() * 2000);
  const proc = spawn('node', [path.join(__dirname, '..', 'src', 'index.js')], { env: { ...process.env, PORT: port }, stdio: 'ignore' });
  let exited = false;
  proc.on('exit', () => { exited = true; });
  const url = `http://localhost:${port}`;
  for (let i = 0; i < 50; i++) {                       // wait up to ~10 s for the server to come up
    if (exited) throw new Error('the game server process exited right after starting');
    try { if ((await fetch(url + '/healthz')).ok) return { url, stop: () => proc.kill() }; } catch { /* not up yet */ }
    await sleep(200);
  }
  proc.kill();
  throw new Error('the game server did not start within 10 seconds');
}

function bot(url, stats) {
  const s = io(url, { transports: ['websocket'], forceNew: true, reconnection: false });
  s.me = null; s.drawLoop = null; s.rtt = [];
  s.on('draw', () => stats.drawRecv++);
  s.on('chat', () => stats.chatRecv++);
  s.on('room:state', (st) => {
    s.me = st;
    if (st.phase === 'choosing' && st.drawerId === st.youId && !s.chose) { s.chose = true; s.emit('word:choose', { index: 0 }); }
    if (st.phase === 'drawing' && st.drawerId === st.youId && !s.drawLoop) startDrawing(s, stats);
  });
  // emit with an acknowledgement, but give up after 10 s instead of waiting forever
  s.call = (ev, data) => new Promise((res, rej) => s.timeout(10000).emit(ev, data, (err, out) => (err ? rej(new Error(`no reply to "${ev}" within 10 s (server overloaded?)`)) : res(out))));
  s.ready = () => new Promise((res, rej) => {
    if (s.connected) return res();
    const t = setTimeout(() => rej(new Error('a bot could not connect within 10 s')), 10000);
    s.once('connect', () => { clearTimeout(t); res(); });
    s.once('connect_error', (e) => { clearTimeout(t); rej(new Error('a bot could not connect: ' + e.message)); });
  });
  return s;
}

function startDrawing(s, stats) {
  const base = 'b' + Math.random().toString(36).slice(2, 8);
  let id = base;
  let x = 400, y = 300;
  s.emit('draw', { type: 'start', id, tool: 'pen', color: '#112233', size: 6, pt: [x, y] });
  let strokes = 0, n = 0;
  s.drawLoop = setInterval(() => {
    const pts = [];
    for (let i = 0; i < 2; i++) { x = Math.min(790, Math.max(10, x + (Math.random() - 0.5) * 30)); y = Math.min(590, Math.max(10, y + (Math.random() - 0.5) * 30)); pts.push([x, y]); }
    s.emit('draw', { type: 'pts', id, pts });
    stats.drawSent++;
    if (++n % 90 === 0) { s.emit('draw', { type: 'clear' }); id = base + (++strokes); s.emit('draw', { type: 'start', id, tool: 'pen', color: '#112233', size: 6, pt: [x, y] }); }
  }, 30);
}

async function step(nRooms) {
  const srv = await startServer();
  const stats = { drawRecv: 0, drawSent: 0, chatRecv: 0 };
  const bots = [];
  const t0 = Date.now();
  // ramp in batches of 10 rooms so connection storms don't dominate the result
  const hosts = [];
  for (let r = 0; r < nRooms; r += 10) {
    await Promise.all(Array.from({ length: Math.min(10, nRooms - r) }, async () => {
      const host = bot(srv.url, stats); bots.push(host);
      await host.ready();
      const c = await host.call('room:create', { name: 'host', settings: { rounds: 3, drawTime: 240 } });
      if (!c.ok) throw new Error('create failed: ' + c.error);
      const others = [];
      for (let i = 1; i < PLAYERS; i++) {
        const b = bot(srv.url, stats); bots.push(b); others.push(b);
        await b.ready();
        const j = await b.call('room:join', { roomId: c.roomId, name: 'p' + i });
        if (!j.ok) throw new Error('join failed: ' + j.error);
      }
      hosts.push(host);
      await host.call('game:start');
    }));
    process.stdout.write(`${Math.min(r + 10, nRooms)}/${nRooms} `);
    await sleep(50);
  }
  const setup = Date.now() - t0;
  // guessers chat, everyone pings
  const timers = [];
  for (const b of bots) {
    timers.push(setInterval(() => { const t = process.hrtime.bigint(); b.emit('latency', () => b.rtt.push(Number(process.hrtime.bigint() - t) / 1e6)); }, 1000));
    if (b.me && b.me.youId !== b.me.drawerId) timers.push(setInterval(() => b.emit('chat', { text: 'is it ' + Math.random().toString(36).slice(2, 6) }), 3000 + Math.random() * 1000));
  }
  await sleep(3000);                                    // warm-up
  bots.forEach((b) => (b.rtt = []));
  stats.drawRecv = stats.drawSent = stats.chatRecv = 0;
  const m0 = await (await fetch(srv.url + '/metrics')).json();
  await fetch(srv.url + '/metrics/reset', { method: 'POST' });
  await sleep(SECS * 1000);
  const m1 = await (await fetch(srv.url + '/metrics')).json();
  const rtt = bots.flatMap((b) => b.rtt);
  const cpu = (m1.cpuMs - m0.cpuMs) / (SECS * 1000);
  const res = {
    rooms: m1.rooms, sockets: m1.sockets,
    'RTT p50 ms': +pct(rtt, 50).toFixed(1), 'RTT p95 ms': +pct(rtt, 95).toFixed(1), 'RTT p99 ms': +pct(rtt, 99).toFixed(1),
    'server CPU (1 core=100%)': Math.round(cpu * 100) + '%',
    'loop lag p99 ms': +m1.loopLagMs.p99.toFixed(1),
    'RSS MB': m1.rssMB,
    'draw msgs in/s': Math.round(stats.drawSent / SECS), 'draw msgs out/s': Math.round(stats.drawRecv / SECS),
    'setup s': +(setup / 1000).toFixed(1),
  };
  timers.forEach(clearInterval);
  bots.forEach((b) => { clearInterval(b.drawLoop); b.disconnect(); });
  srv.stop();
  await sleep(500);
  return res;
}

(async () => {
  console.log(`Load test: ${PLAYERS} bots/room, ${SECS}s measurement per step${EXTERNAL ? ' (external server)' : ''}`);
  const rows = [];
  for (const n of STEPS) {
    process.stdout.write(`  ${n} rooms … `);
    try { const r = await step(n); rows.push({ target: n, ...r }); console.log(' done'); }
    catch (e) {
      console.log('\n  FAILED:', e.message);
      console.log('  Tip: on Mac/Linux run `ulimit -n 10000` in this terminal first (default limits are low), then try again with fewer rooms, e.g. --steps 10,25,50.');
      break;
    }
  }
  if (rows.length) console.table(rows);
  process.exit(rows.length ? 0 : 1);
})();
