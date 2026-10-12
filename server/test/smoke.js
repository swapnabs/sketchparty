'use strict';
/**
 * End-to-end test: starts the real server on a random port and drives it with
 * 4 socket.io clients. Verifies the "server is the authority" requirements.
 */
const assert = require('assert');
const { spawn } = require('child_process');
const path = require('path');
const { io } = require('socket.io-client');

const PORT = 4100 + Math.floor(Math.random() * 500);
const URL = `http://localhost:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let passed = 0;
const ok = (name) => { passed++; console.log('  ✓', name); };

function client() {
  const s = io(URL, { transports: ['websocket'], forceNew: true });
  s.state = null; s.chats = []; s.snapshot = null; s.draws = []; s.end = null; s.notices = [];
  s.on('room:state', (st) => (s.state = st));
  s.on('chat', (m) => s.chats.push(m));
  s.on('canvas:snapshot', (c) => (s.snapshot = c));
  s.on('draw', (d) => s.draws.push(d));
  s.on('game:end', (e) => (s.end = e));
  s.on('notice', (n) => s.notices.push(n));
  s.call = (ev, data) => new Promise((res) => s.emit(ev, data, res));
  return s;
}
const until = async (fn, ms = 4000) => {
  const t = Date.now();
  while (Date.now() - t < ms) { if (fn()) return; await sleep(20); }
  throw new Error('timeout waiting for condition: ' + fn.toString());
};

(async () => {
  const srv = spawn('node', [path.join(__dirname, '..', 'src', 'index.js')], { env: { ...process.env, PORT }, stdio: 'inherit' });
  await sleep(800);
  try {
    const a = client(), b = client(), c = client(), d = client();
    await until(() => a.connected && b.connected && c.connected && d.connected);

    // ── rooms + settings
    const bad = await a.call('room:create', { name: 'Ann', settings: { rounds: 99 } });
    assert.equal(bad.ok, false); ok('rejects invalid host settings');
    const created = await a.call('room:create', { name: 'Ann', avatar: { emoji: '🦊' }, settings: { rounds: 2, drawTime: 30, words: 'cat, dog, fish, bird' } });
    assert(created.ok && created.roomId.length === 6); ok('host creates room');
    const roomId = created.roomId;
    const jb = await b.call('room:join', { roomId, name: 'Bob', avatar: { emoji: '🦊' } });
    const jc = await c.call('room:join', { roomId, name: 'Cy', avatar: { emoji: '💩' } });
    assert(jb.ok && jc.ok); ok('players join by room id');
    await a.call('chat', { text: 'hello from the host lobby' });
    await until(() => b.chats.some((m) => m.text === 'hello from the host lobby') && c.chats.some((m) => m.text === 'hello from the host lobby'));
    ok('host lobby chat reaches all players');
    assert(a.chats.some((m) => m.text === 'Bob joined')); ok('join announcements are sent');
    assert.equal((await d.call('room:join', { roomId: 'ZZZZZZ', name: 'X' })).ok, false); ok('unknown room is rejected');
    assert.deepEqual(a.state.settings.words, ['cat', 'dog', 'fish', 'bird']); assert.equal(b.state.settings.words, undefined);
    ok('custom word list visible to host only');
    const av = a.state.players.map((x) => x.avatar && x.avatar.emoji);
    assert(av.every(Boolean) && new Set(av).size === av.length); ok('every player gets a distinct avatar');
    assert.equal(a.state.players[0].avatar.emoji, '🦊'); ok('a chosen avatar is honoured');
    assert.notEqual(b.state.players[1].avatar.emoji, '🦊'); ok('a taken emoji falls back to a free one');
    assert(c.state.players[2].avatar.emoji !== '💩'); ok('an avatar outside the palette is ignored');
    assert.equal((await b.call('player:avatar', { emoji: '🦊' })).ok, false); ok('cannot take another player avatar');
    assert.equal((await b.call('player:avatar', { emoji: '🐻' })).ok, true); ok('players can change their avatar in the room');
    assert.equal((await a.call('room:settings', { difficulty: 'impossible' })).ok, false);
    assert.equal((await a.call('room:settings', { difficulty: 'hard' })).ok, true); ok('difficulty setting is validated');
    assert.equal((await b.call('game:start')).ok, false); ok('non-host cannot start');
    assert.equal((await a.call('game:start')).ok, true); ok('host starts the game');

    // ── choosing: only drawer gets choices; nobody gets a word
    await until(() => a.state.phase === 'choosing');
    const clients = { [a.state.youId]: a, [b.state.youId]: b, [c.state.youId]: c };
    const drawer = clients[a.state.drawerId];
    const guessers = Object.values(clients).filter((x) => x !== drawer);
    assert.equal(drawer.state.choices.length, 3);
    assert(guessers.every((g) => g.state.choices === null && g.state.word === null)); ok('only the drawer sees word choices');
    await drawer.call('word:choose', { index: 0 });
    await until(() => drawer.state.phase === 'drawing' && guessers.every((g) => g.state.phase === 'drawing'));
    const word = drawer.state.word;
    assert(word);
    assert(guessers.every((g) => g.state.word === null && Array.isArray(g.state.hint)));
    assert(!JSON.stringify(guessers.map((g) => g.state)).includes(`"${word}"`)); ok('guessers never receive the secret word');

    // ── drawing: only drawer may draw; strokes reach others in order
    guessers[0].emit('draw', { type: 'start', id: 'x1', tool: 'pen', color: '#ff0000', size: 4, pt: [10, 10] });
    await sleep(100);
    assert.equal(guessers[1].draws.length, 0); ok('non-drawer cannot draw');
    drawer.emit('draw', { type: 'start', id: 's1', tool: 'pen', color: '#112233', size: 5, pt: [10, 10] });
    drawer.emit('draw', { type: 'pts', id: 's1', pts: [[11, 11], [12, 12]] });
    drawer.emit('draw', { type: 'pts', id: 's1', pts: [[9999, 5]] });                 // out of bounds -> dropped
    drawer.emit('draw', { type: 'start', id: 's2', tool: 'pen', color: 'red', size: 5, pt: [1, 1] }); // bad colour -> dropped
    drawer.emit('draw', { type: 'fill', x: 100, y: 100, color: '#00ff00' });
    await until(() => guessers[0].draws.length === 3);
    assert.deepEqual(guessers[0].draws.map((x) => x.seq), [1, 2, 3]);
    assert.deepEqual(guessers[0].draws.map((x) => x.type), ['start', 'pts', 'fill']); ok('strokes validated, sequenced and relayed in order');

    // ── late joiner sees the canvas as it stands
    const late = client(); await until(() => late.connected);
    const jl = await late.call('room:join', { roomId, name: 'Late' }); assert(jl.ok);
    await until(() => late.snapshot);
    assert.equal(late.snapshot.ops.length, 2); assert.equal(late.snapshot.seq, 3); ok('mid-round joiner receives canvas snapshot');
    assert.equal(late.state.word, null);

    // ── guessing: wrong, close, and correct
    const g0 = guessers[0], g1 = guessers[1];
    await g0.call('chat', { text: 'zzzzzz' });
    await until(() => g1.chats.some((m) => m.text === 'zzzzzz')); ok('wrong guesses are public chat');
    const near = word.slice(0, -1) + (word.endsWith('x') ? 'y' : 'x');
    await g0.call('chat', { text: near });
    await until(() => g0.chats.some((m) => m.kind === 'close'));
    await sleep(100);
    assert(!g1.chats.some((m) => m.text === near)); ok('"close!" is shown only to the guesser');

    await g0.call('chat', { text: word.toUpperCase() });
    await until(() => g1.state.players.find((p) => p.id === g0.state.youId).guessed);
    assert(g1.chats.some((m) => m.text === 'zzzzzz' && m.kind === 'wrong')); ok('wrong guesses are tagged as wrong');
    assert(g0.chats.some((m) => m.kind === 'yours') && !g1.chats.some((m) => m.kind === 'yours'));
    assert(![...g0.chats, ...g1.chats].some((m) => m.text && m.text.toLowerCase().includes(word.toLowerCase())));
    ok('the guesser gets a confirmation, and the word never appears in chat');
    const gp = g1.state.players.find((p) => p.id === g0.state.youId);
    assert(gp.score > 0); ok('server awards points for a correct guess');
    assert(!g1.chats.some((m) => normalizeEq(m.text, word)));
    function normalizeEq(t, w) { return typeof t === 'string' && t.toLowerCase() === w.toLowerCase(); }
    ok('correct guess text is not broadcast');
    assert.equal(g0.state.word, null); ok('the word stays off the screen until the turn ends, even for people who guessed');

    await g0.call('chat', { text: `it is ${word}!!` });
    await sleep(150);
    assert(!g1.chats.some((m) => m.text && m.text.includes(word)));
    assert(!late.chats.some((m) => m.text && m.text.includes(word))); ok('players who guessed cannot leak the word to others');

    // ── a player who already guessed typing again is not a guess and scores nothing
    const scoreAfter = () => g1.state.players.find((p) => p.id === g0.state.youId).score;
    assert.equal(scoreAfter(), gp.score); ok('typing the word again after guessing does not score twice');

    // ── likes / dislikes
    await g1.call('vote', { value: 'up' });
    await until(() => drawer.state.votes.up === 1 && g1.state.myVote === 'up');
    await drawer.call('vote', { value: 'down' });
    await sleep(100);
    assert.equal(drawer.state.votes.down, 0); ok('guessers can like the drawing, the drawer cannot vote');
    assert(g0.chats.some((m) => m.kind === 'vote' && /liked/.test(m.text))); ok('votes are announced in chat');

    // ── drawer chat reaches everyone, but never with the word in it
    await drawer.call('chat', { text: 'it is something you can hold' });
    await until(() => g1.chats.some((m) => m.text === 'it is something you can hold') && late.chats.some((m) => m.text === 'it is something you can hold'));
    ok('drawer (often the host) messages reach players who have not guessed');
    await drawer.call('chat', { text: word.split('').join(' ') });
    await sleep(150);
    assert(!g1.chats.some((m) => m.name && m.text === word.split('').join(' ')) && drawer.notices.length > 0);
    ok('drawer message containing the word is blocked by the server');

    // ── abuse limits on strokes and message size
    const relayed = () => g1.draws.filter((x) => x.type === 'pts').length;
    drawer.emit('draw', { type: 'start', id: 'flood', tool: 'pen', color: '#112233', size: 5, pt: [5, 5] });
    await sleep(100);
    const r0 = relayed();
    for (let i = 0; i < 400; i++) drawer.emit('draw', { type: 'pts', id: 'flood', pts: [[20, 20], [21, 21]] });
    await sleep(500);
    const got = relayed() - r0;
    assert(got > 0 && got < 200, 'relayed ' + got); ok('stroke flood is rate limited (400 sent, ' + got + ' relayed)');
    const r1 = relayed();
    drawer.emit('draw', { type: 'pts', id: 'flood', pts: Array.from({ length: 41 }, () => [30, 30]) });
    await sleep(200);
    assert.equal(relayed(), r1); ok('a stroke batch over the size limit is dropped');
    let closed = false;
    d.on('disconnect', () => (closed = true));
    d.emit('chat', { text: 'x'.repeat(20000) });
    await until(() => closed); ok('a message over 16 KB closes the connection');
    await g1.call('chat', { text: 'a'.repeat(300) });
    await until(() => late.chats.some((m) => m.text && /^a+$/.test(m.text)));
    assert.equal(late.chats.find((m) => m.text && /^a+$/.test(m.text)).text.length, 100); ok('chat messages are cut to 100 characters');
    await sleep(1800);   // let the chat bucket refill before the next test

    // ── rate limiting
    const before = g1.chats.length;
    for (let i = 0; i < 20; i++) g1.emit('chat', { text: 'spam ' + i });
    await sleep(300);
    assert(g1.chats.length - before < 10 && g1.notices.length > 0); ok('chat is rate limited');
    await g1.call('chat', { text: 'x'.repeat(5000) }).catch(() => {});

    // ── refresh / reconnect keeps score
    const scoreBefore = gp.score;
    g0.disconnect();
    await until(() => !a.state.players.find((p) => p.id === g0.state.youId).connected);
    const g0b = client(); await until(() => g0b.connected);
    const rj = await g0b.call('room:join', { roomId, playerId: jb.playerId === g0.state.youId ? jb.playerId : jc.playerId, token: jb.playerId === g0.state.youId ? jb.token : jc.token, name: 'ignored' });
    assert(rj.ok && rj.playerId === g0.state.youId);
    await until(() => g0b.state && g0b.state.players.find((p) => p.id === g0.state.youId).score === scoreBefore);
    assert.equal(g0b.state.word, null); ok('rejoin within grace keeps identity and score');
    const fake = client(); await until(() => fake.connected);
    const fj = await fake.call('room:join', { roomId, playerId: g0.state.youId, token: 'wrong', name: 'Imposter' });
    assert(fj.ok && fj.playerId !== g0.state.youId); ok('wrong token cannot hijack a seat');

    // ── a new tab (weak claim) cannot steal a live seat, but can reclaim a dropped one
    const seatTok = jb.playerId === g0.state.youId ? jb : jc;
    const tabLive = client(); await until(() => tabLive.connected);
    const wl = await tabLive.call('room:join', { roomId, playerId: seatTok.playerId, token: seatTok.token, weak: true, name: 'NewTab' });
    assert(wl.ok && wl.playerId !== seatTok.playerId); ok('a second tab cannot take over a seat that is still connected');
    g0b.disconnect();
    await until(() => !a.state.players.find((p) => p.id === seatTok.playerId).connected);
    const tabBack = client(); await until(() => tabBack.connected);
    const wb = await tabBack.call('room:join', { roomId, playerId: seatTok.playerId, token: seatTok.token, weak: true, name: 'Reopened' });
    assert(wb.ok && wb.playerId === seatTok.playerId);
    await until(() => tabBack.state && tabBack.state.players.find((p) => p.id === seatTok.playerId).score === scoreBefore);
    ok('closing a tab and reopening the link within the grace period gets the seat and score back');

    // ── drawer leaves mid-turn: game recovers
    const turnBefore = a.state.round;
    const drawerId = drawer.state.youId;
    drawer.disconnect();
    await until(() => ['turnEnd'].includes(a.state.phase === 'turnEnd' ? 'turnEnd' : (g1.state.phase)), 15000);
    assert.equal(g1.state.lastTurn.reason, 'drawer_left');
    const dl = g1.state.lastTurn.deltas;
    assert(dl.length === g1.state.players.length && dl.every((d) => typeof d.delta === 'number' && typeof d.total === 'number'));
    assert(dl.some((d) => d.guessed && d.delta > 0)); assert(g1.state.lastTurn.word === word);
    ok('turn-end screen lists every player with their points, and reveals the word'); ok('drawer leaving ends the turn instead of getting stuck');
    await until(() => g1.state.phase === 'choosing' && g1.state.drawerId !== drawerId, 12000);
    ok('game moves on to the next drawer');

    [a, b, c, d, late, g0b, fake, tabLive, tabBack].forEach((x) => x.disconnect());
    console.log(`\n${passed} checks passed`);
  } catch (e) {
    console.error('\nFAILED:', e);
    process.exitCode = 1;
  } finally {
    srv.kill();
    setTimeout(() => process.exit(process.exitCode || 0), 200);
  }
})();
