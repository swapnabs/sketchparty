'use strict';
/**
 * Room = one game. Everything that matters (word, timer, scores, canvas) lives here,
 * on the server. Clients only ever receive a personalised view of it.
 */
const { TokenBucket, LIMITS } = require('./limits');
const { DEFAULT_WORDS, DIFFICULTIES, pickChoices, pickByDifficulty } = require('./words');
const { normalize, isClose, sanitizeName, randomToken, randomId, isNum, HEX } = require('./util');

const WORD_RE = /^[\p{L}\p{N} '\-]+$/u;

const AVATAR_EMOJIS = ['🦊', '🐼', '🐸', '🦁', '🐙', '🦄', '🐧', '🐯', '🐨', '🐵', '🦉', '🐢', '🦋', '🐳', '🦖', '🐝', '🦩', '🐰', '🦔', '🐷', '🐻', '🦀', '🐞', '🦥'];   // keep in sync with client/src/avatars.js
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
function validAvatar(a) {
  return a && typeof a === 'object' && AVATAR_EMOJIS.includes(a.emoji) ? { emoji: a.emoji } : null;
}

function sanitizeSettings(input, prev) {
  const s = { ...prev };
  if (input && typeof input === 'object') {
    if (input.rounds !== undefined) {
      const r = Math.round(Number(input.rounds));
      if (!Number.isFinite(r) || r < LIMITS.ROUNDS[0] || r > LIMITS.ROUNDS[1]) throw new Error('Rounds must be 1–10');
      s.rounds = r;
    }
    if (input.drawTime !== undefined) {
      const t = Math.round(Number(input.drawTime));
      if (!Number.isFinite(t) || t < LIMITS.DRAW_TIME[0] || t > LIMITS.DRAW_TIME[1]) throw new Error('Draw time must be 20–240 seconds');
      s.drawTime = t;
    }
    if (input.difficulty !== undefined) {
      if (!DIFFICULTIES.includes(input.difficulty)) throw new Error('Difficulty must be easy, medium or hard');
      s.difficulty = input.difficulty;
    }
    if (input.words !== undefined) {
      const raw = Array.isArray(input.words) ? input.words : String(input.words).split(/[,\n]/);
      const words = [...new Set(
        raw.map((w) => String(w).replace(/\s+/g, ' ').trim()).filter(Boolean)
      )];
      if (words.length > LIMITS.MAX_CUSTOM_WORDS) throw new Error('Too many words (max 500)');
      for (const w of words) {
        if (w.length < LIMITS.WORD_LEN[0] || w.length > LIMITS.WORD_LEN[1] || !WORD_RE.test(w)) {
          throw new Error(`Invalid word: "${w.slice(0, 30)}"`);
        }
      }
      if (words.length > 0 && words.length < 3) throw new Error('Custom word list needs at least 3 words (or leave it empty for the default list)');
      s.words = words;
    }
  }
  return s;
}

class Room {
  constructor(io, id, settingsInput, onEmpty) {
    this.io = io;
    this.id = id;
    this.onEmpty = onEmpty;
    this.settings = sanitizeSettings(settingsInput, { rounds: 3, drawTime: 80, words: [], difficulty: 'medium' });
    this.players = new Map();     // playerId -> player (insertion order = turn order)
    this.hostId = null;
    this.phase = 'lobby';         // lobby | choosing | drawing | turnEnd | gameEnd
    this.round = 0;
    this.queue = [];
    this.turnId = 0;
    this.drawerId = null;
    this.drawerName = '';
    this.word = null;
    this.choices = null;
    this.revealed = new Set();
    this.guessed = new Set();
    this.turnDeltas = new Map();
    this.votes = new Map();       // playerId -> 'up' | 'down' for the current drawing
    this.phaseEndsAt = null;
    this.drawStartedAt = null;
    this.ops = [];
    this.seq = 0;
    this.log = [];
    this.logPts = 0;
    this.currentStroke = null;
    this.history = [];
    this.lastTurn = null;
    this.finalPayload = null;
    this.chatLog = [];            // recent public messages, replayed to anyone who (re)joins
    this.timers = {};
    this.lastActive = Date.now();
    this.createdAt = Date.now();
  }

  // ───────────────────────── players ─────────────────────────

  get connectedPlayers() {
    return [...this.players.values()].filter((p) => p.connected);
  }

  /** A chosen avatar is honoured only if it is from our palette and the emoji is still free in this room. */
  addPlayer(rawName, avatarInput) {
    if (this.players.size >= LIMITS.MAX_PLAYERS) throw new Error('Room is full');
    let name = sanitizeName(rawName);
    const taken = new Set([...this.players.values()].map((p) => p.name.toLowerCase()));
    if (taken.has(name.toLowerCase())) {
      let i = 2;
      while (taken.has(`${name} ${i}`.toLowerCase())) i++;
      name = `${name} ${i}`.slice(0, LIMITS.NAME_LEN + 2);
    }
    // Random cartoon avatar; emojis are unique within a room while any are free
    const usedEmojis = new Set([...this.players.values()].map((q) => q.avatar.emoji));
    const freeEmojis = AVATAR_EMOJIS.filter((e) => !usedEmojis.has(e));
    const wanted = validAvatar(avatarInput);
    const avatar = wanted && !usedEmojis.has(wanted.emoji)
      ? wanted
      : { emoji: pick(freeEmojis.length ? freeEmojis : AVATAR_EMOJIS) };
    const player = {
      id: randomId(8, 'abcdefghijklmnopqrstuvwxyz0123456789'),
      token: randomToken(),
      name,
      avatar,
      score: 0,
      socketId: null,
      connected: false,
      removeTimer: null,
      limits: {
        chat: new TokenBucket(4, 1.2),          // ~1 msg/s sustained, burst of 4
        draw: new TokenBucket(90, 60),          // draw events (batched by client at ~30/s)
        pts: new TokenBucket(800, 500),         // points/s
        resync: new TokenBucket(2, 0.5),
        vote: new TokenBucket(4, 0.8),
      },
      resyncTimer: null,
    };
    this.players.set(player.id, player);
    if (!this.hostId) this.hostId = player.id;
    // Late joiners get a turn this round too
    if (this.phase !== 'lobby' && this.phase !== 'gameEnd') this.queue.push(player.id);
    this.lastActive = Date.now();
    return player;
  }

  authenticate(playerId, token) {
    const p = this.players.get(playerId);
    return p && token && p.token === token ? p : null;
  }

  attach(player, socket) {
    if (player.socketId && player.socketId !== socket.id) {
      const old = this.io.sockets.sockets.get(player.socketId);
      if (old) { old.data = {}; old.disconnect(true); }   // same player opened a second tab
    }
    clearTimeout(player.removeTimer);
    player.removeTimer = null;
    player.socketId = socket.id;
    player.connected = true;
    socket.data = { roomId: this.id, playerId: player.id };
    socket.join(this.id);
    this.lastActive = Date.now();

    if (player.id === this.drawerId && this.timers.drawerGrace) {
      clearTimeout(this.timers.drawerGrace);
      this.timers.drawerGrace = null;
    }
    this.sendState(player);
    this.sendSnapshot(player);
    this.emitTo(player, 'chat:history', this.chatLog);
    if (this.phase === 'gameEnd' && this.finalPayload) this.emitTo(player, 'game:end', this.finalPayload);
    if (!player.announced) {
      player.announced = true;
      this.systemChat(`${player.name} joined`);
    }
    this.broadcastState();
  }

  onDisconnect(player) {
    player.connected = false;
    player.socketId = null;
    this.lastActive = Date.now();
    clearTimeout(player.removeTimer);
    player.removeTimer = setTimeout(() => this.removePlayer(player.id, 'timeout'), LIMITS.REJOIN_GRACE_MS);

    if (player.id === this.drawerId && (this.phase === 'choosing' || this.phase === 'drawing')) {
      const turnId = this.turnId;
      clearTimeout(this.timers.drawerGrace);
      this.timers.drawerGrace = setTimeout(() => {
        if (this.turnId === turnId && (this.phase === 'choosing' || this.phase === 'drawing')) {
          this.systemChat(`${this.drawerName} left, skipping their turn`);
          this.endTurn('drawer_left');
        }
      }, LIMITS.DRAWER_GRACE_MS);
    }
    this.broadcastState();
    this.checkAllGuessed();
  }

  removePlayer(id, reason = 'left') {
    const p = this.players.get(id);
    if (!p) return;
    clearTimeout(p.removeTimer);
    clearTimeout(p.resyncTimer);
    this.players.delete(id);
    this.queue = this.queue.filter((q) => q !== id);
    if (p.socketId) {
      const s = this.io.sockets.sockets.get(p.socketId);
      if (s) { s.leave(this.id); s.data = {}; }
    }
    if (this.players.size === 0) {
      this.destroy();
      this.onEmpty && this.onEmpty(this);
      return;
    }
    if (this.hostId === id) {
      const next = this.connectedPlayers[0] || [...this.players.values()][0];
      this.hostId = next.id;
    }
    this.systemChat(`${p.name} ${reason === 'timeout' ? 'disconnected' : 'left'}`);

    if (this.phase !== 'lobby' && this.phase !== 'gameEnd') {
      if (this.players.size < 2) {
        this.endTurnIfActive('drawer_left');
        this.endGame();
        return;
      }
      if (id === this.drawerId) this.endTurnIfActive('drawer_left');
    }
    this.broadcastState();
    this.checkAllGuessed();
  }

  destroy() {
    Object.values(this.timers).forEach(clearTimeout);
    this.timers = {};
    this.destroyed = true;
  }

  // ───────────────────────── settings / lifecycle ─────────────────────────

  updateSettings(player, input) {
    if (player.id !== this.hostId) throw new Error('Only the host can change settings');
    if (this.phase !== 'lobby') throw new Error('Settings are locked once the game starts');
    this.settings = sanitizeSettings(input, this.settings);
    this.broadcastState();
  }

  startGame(player) {
    if (player.id !== this.hostId) throw new Error('Only the host can start the game');
    if (this.phase !== 'lobby') throw new Error('Game already started');
    if (this.connectedPlayers.length < 2) throw new Error('Need at least 2 players');
    this.resetScores();
    this.round = 0;
    this.history = [];
    this.finalPayload = null;
    this.startRound();
  }

  resetToLobby(player) {
    if (player.id !== this.hostId) throw new Error('Only the host can do that');
    if (this.phase !== 'gameEnd') throw new Error('Game is still running');
    this.resetScores();
    this.phase = 'lobby';
    this.round = 0;
    this.history = [];
    this.finalPayload = null;
    this.drawerId = null;
    this.word = null;
    this.resetCanvas();
    this.broadcastSnapshot();
    this.broadcastState();
  }

  resetScores() {
    for (const p of this.players.values()) p.score = 0;
  }

  startRound() {
    this.round += 1;
    if (this.round > this.settings.rounds) return this.endGame();
    this.queue = [...this.players.keys()];
    this.nextTurn();
  }

  nextTurn() {
    if (this.destroyed) return;
    let drawer = null;
    while (this.queue.length) {
      const p = this.players.get(this.queue.shift());
      if (p && p.connected) { drawer = p; break; }     // skip anyone who is gone or still reconnecting
    }
    if (!drawer) {
      if (this.connectedPlayers.length < 2) return this.endGame();
      return this.startRound();
    }

    this.turnId += 1;
    const turnId = this.turnId;
    this.drawerId = drawer.id;
    this.drawerName = drawer.name;
    this.word = null;
    this.guessed = new Set();
    this.revealed = new Set();
    this.turnDeltas = new Map();
    this.votes = new Map();
    this.lastTurn = null;
    this.resetCanvas();
    const pool = this.settings.words.length ? this.settings.words : DEFAULT_WORDS;
    this.choices = this.settings.words.length ? pickChoices(pool, 3) : pickByDifficulty(this.settings.difficulty);
    this.phase = 'choosing';
    this.phaseEndsAt = Date.now() + LIMITS.CHOOSE_MS;
    this.timers.choose = setTimeout(() => {
      if (this.turnId === turnId && this.phase === 'choosing') {
        this.chooseWord(drawer, Math.floor(Math.random() * this.choices.length));
      }
    }, LIMITS.CHOOSE_MS);
    this.broadcastSnapshot();
    this.broadcastState();
  }

  chooseWord(player, index) {
    if (this.phase !== 'choosing' || player.id !== this.drawerId) return;
    const i = Math.floor(Number(index));
    if (!(i >= 0 && i < this.choices.length)) return;
    clearTimeout(this.timers.choose);
    this.word = this.choices[i];
    this.choices = null;
    this.phase = 'drawing';
    const total = this.settings.drawTime * 1000;
    this.drawStartedAt = Date.now();
    this.phaseEndsAt = this.drawStartedAt + total;
    const turnId = this.turnId;

    this.timers.end = setTimeout(() => {
      if (this.turnId === turnId && this.phase === 'drawing') this.endTurn('time');
    }, total);

    // Letter hints: up to 3, spread over 40% / 60% / 80% of the time
    const letters = [...this.word].map((c, i) => (/[\p{L}\p{N}]/u.test(c) ? i : -1)).filter((i) => i >= 0);
    const nHints = Math.min(3, Math.floor(letters.length / 2));
    this.timers.hints = [];
    for (let k = 0; k < nHints; k++) {
      const at = total * (0.4 + 0.2 * k);
      this.timers.hints.push(setTimeout(() => {
        if (this.turnId !== turnId || this.phase !== 'drawing') return;
        const hidden = letters.filter((i) => !this.revealed.has(i));
        if (hidden.length <= 1) return;
        this.revealed.add(hidden[Math.floor(Math.random() * hidden.length)]);
        this.broadcastState();
      }, at));
    }
    this.broadcastState();
  }

  endTurnIfActive(reason) {
    if (this.phase === 'choosing' || this.phase === 'drawing') this.endTurn(reason);
  }

  endTurn(reason) {
    if (this.phase !== 'choosing' && this.phase !== 'drawing') return;
    clearTimeout(this.timers.choose);
    clearTimeout(this.timers.end);
    clearTimeout(this.timers.drawerGrace);
    (this.timers.hints || []).forEach(clearTimeout);
    this.timers.hints = [];

    // Simple scoreboard for the turn-end screen: every player, what they earned this turn, and their total
    const deltas = [...this.players.values()].map((pl) => ({
      id: pl.id,
      name: pl.name,
      avatar: pl.avatar,
      delta: this.turnDeltas.get(pl.id) || 0,
      total: pl.score,
      guessed: this.guessed.has(pl.id),
      isDrawer: pl.id === this.drawerId,
    })).sort((a, b) => b.total - a.total);

    this.lastTurn = {
      reason,
      word: this.word,
      drawerId: this.drawerId,
      drawerName: this.drawerName,
      deltas,
      votes: this.voteCounts(),
    };
    if (this.word) {
      this.history.push({
        round: this.round,
        drawerName: this.drawerName,
        word: this.word,
        events: this.log,
      });
    }
    this.phase = 'turnEnd';
    this.phaseEndsAt = Date.now() + LIMITS.TURN_END_MS;
    const turnId = this.turnId;
    this.timers.next = setTimeout(() => {
      if (this.turnId === turnId && this.phase === 'turnEnd') this.nextTurn();
    }, LIMITS.TURN_END_MS);
    this.broadcastState();
  }

  endGame() {
    Object.values(this.timers).forEach((t) => Array.isArray(t) ? t.forEach(clearTimeout) : clearTimeout(t));
    this.timers = {};
    this.phase = 'gameEnd';
    this.phaseEndsAt = null;
    const standings = [...this.players.values()]
      .map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, score: p.score }))
      .sort((a, b) => b.score - a.score);
    this.finalPayload = { standings, replay: this.history };
    this.io.to(this.id).emit('game:end', this.finalPayload);
    this.broadcastState();
  }

  checkAllGuessed() {
    if (this.phase !== 'drawing') return;
    const guessers = this.connectedPlayers.filter((p) => p.id !== this.drawerId);
    if (guessers.length > 0 && guessers.every((p) => this.guessed.has(p.id))) this.endTurn('all_guessed');
  }

  // ───────────────────────── chat & guessing ─────────────────────────

  chat(player, rawText) {
    const text = String(rawText ?? '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, LIMITS.CHAT_LEN);
    if (!text) return;
    if (!player.limits.chat.take()) return this.emitTo(player, 'notice', 'Slow down, you are sending messages too fast');

    const isDrawer = player.id === this.drawerId;
    const drawing = this.phase === 'drawing';

    if (drawing && !isDrawer && !this.guessed.has(player.id)) {
      const g = normalize(text);
      const w = normalize(this.word);
      if (g && g === w) return this.correctGuess(player);
      if (isClose(g, w)) {
        // Only the guesser sees their near-miss: it must not leak the word's spelling to others
        return this.emitTo(player, 'chat', { id: randomId(8), kind: 'close', name: player.name, text });
      }
      return this.publicChat({ kind: 'wrong', name: player.name, text });   // a wrong guess, shown to everyone
    }

    if (drawing && isDrawer) {
      // The drawer can talk to everyone, but the server refuses anything containing the word.
      if (this.leaksWord(text)) return this.emitTo(player, 'notice', 'Message blocked: it contains the secret word');
      return this.publicChat({ kind: 'chat', name: player.name, text });
    }

    if (drawing && this.guessed.has(player.id)) {
      // People who already guessed talk in a private channel with the drawer, and still cannot type the word.
      if (this.leaksWord(text)) return this.emitTo(player, 'notice', 'Message blocked: it contains the secret word');
      const msg = { id: randomId(8), kind: 'private', name: player.name, text };
      for (const p of this.players.values()) {
        if (p.id === this.drawerId || this.guessed.has(p.id)) this.emitTo(p, 'chat', msg);
      }
      return;
    }
    this.publicChat({ kind: 'chat', name: player.name, text });
  }

  /** True if the text contains the word, ignoring case, spaces and punctuation ("a p-p l e"). */
  leaksWord(text) {
    const strip = (x) => normalize(x).replace(/ /g, '');
    const w = strip(this.word || '');
    return w.length > 0 && strip(text).includes(w);
  }

  publicChat(msg) {
    const full = { id: randomId(8), ...msg };
    this.chatLog.push(full);
    if (this.chatLog.length > 50) this.chatLog.shift();
    this.io.to(this.id).emit('chat', full);
  }

  correctGuess(player) {
    const total = this.settings.drawTime * 1000;
    const remaining = Math.max(0, this.phaseEndsAt - Date.now());
    const base = 50;
    const speed = Math.round(450 * (remaining / total));      // up to 450 extra for guessing fast
    const points = base + speed;
    this.guessed.add(player.id);
    player.score += points;
    this.turnDeltas.set(player.id, points);
    const drawer = this.players.get(this.drawerId);
    if (drawer) {
      const bonus = Math.round(points * 0.3);
      drawer.score += bonus;
      this.turnDeltas.set(drawer.id, (this.turnDeltas.get(drawer.id) || 0) + bonus);
    }
    this.emitTo(player, 'chat', { id: randomId(8), kind: 'yours' });   // confirmation only: the word is never put in chat
    this.systemChat(`${player.name} guessed the word!`, 'correct');
    this.broadcastState();
    this.checkAllGuessed();
  }

  voteCounts() {
    let up = 0, down = 0;
    for (const [id, v] of this.votes) {
      if (!this.players.has(id)) continue;
      if (v === 'up') up++; else down++;
    }
    return { up, down };
  }

  /** Thumbs up/down on the current drawing. One vote per player (changeable); the drawer cannot vote. */
  vote(player, value) {
    if (value !== 'up' && value !== 'down') return;
    if (player.id === this.drawerId) return;
    if (this.phase !== 'drawing' && this.phase !== 'turnEnd') return;
    if (!player.limits.vote.take()) return;
    const prev = this.votes.get(player.id);
    if (prev === value) return;
    this.votes.set(player.id, value);
    if (!prev) this.publicChat({ kind: 'vote', value, text: `${player.name} ${value === 'up' ? 'liked' : 'disliked'} the drawing` });
    this.broadcastState();
  }

  setAvatar(player, input) {
    const a = validAvatar(input);
    if (!a) throw new Error('Invalid avatar');
    for (const q of this.players.values()) {
      if (q.id !== player.id && q.avatar.emoji === a.emoji) throw new Error('Someone in the room already has that avatar');
    }
    player.avatar = a;
    this.broadcastState();
  }

  systemChat(text, kind = 'system') {
    this.publicChat({ kind, text });
  }

  // ───────────────────────── canvas ─────────────────────────

  resetCanvas() {
    this.ops = [];
    this.seq = 0;
    this.log = [];
    this.logPts = 0;
    this.currentStroke = null;
  }

  sendSnapshot(player) {
    this.emitTo(player, 'canvas:snapshot', { seq: this.seq, ops: this.ops });
  }

  broadcastSnapshot() {
    this.io.to(this.id).emit('canvas:snapshot', { seq: this.seq, ops: this.ops });
  }

  requestResync(player) {
    if (!player.limits.resync.take()) return;
    this.sendSnapshot(player);
  }

  /** Validate + apply + fan out one drawing event from the drawer. */
  draw(player, socket, ev) {
    if (this.phase !== 'drawing' || player.id !== this.drawerId) return;
    if (!ev || typeof ev !== 'object') return;
    if (!player.limits.draw.take()) return this.scheduleResync(player);
    if (this.log.length >= LIMITS.MAX_LOG_EVENTS) return;

    const inCanvas = (p) => Array.isArray(p) && p.length === 2 && isNum(p[0]) && isNum(p[1])
      && p[0] >= 0 && p[0] <= LIMITS.CANVAS_W && p[1] >= 0 && p[1] <= LIMITS.CANVAS_H;
    const round1 = (p) => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10];
    let out = null;

    switch (ev.type) {
      case 'start': {
        if (typeof ev.id !== 'string' || ev.id.length > 24) return;
        if (ev.tool !== 'pen' && ev.tool !== 'eraser') return;
        if (!HEX.test(ev.color || '') || !isNum(ev.size) || ev.size < 1 || ev.size > 60) return;
        if (!inCanvas(ev.pt) || this.ops.length >= LIMITS.MAX_OPS) return;
        const color = ev.tool === 'eraser' ? '#ffffff' : ev.color.toLowerCase();
        const pt = round1(ev.pt);
        const op = { t: 'stroke', id: ev.id, tool: ev.tool, color, size: Math.round(ev.size), pts: [pt] };
        this.ops.push(op);
        this.currentStroke = op;
        this.logPts += 1;
        out = { type: 'start', id: op.id, tool: op.tool, color, size: op.size, pt };
        break;
      }
      case 'pts': {
        const st = this.currentStroke;
        if (!st || st.id !== ev.id || !Array.isArray(ev.pts)) return;
        if (ev.pts.length === 0 || ev.pts.length > LIMITS.MAX_PTS_PER_MSG) return;
        if (!ev.pts.every(inCanvas)) return;
        if (st.pts.length + ev.pts.length > LIMITS.MAX_PTS_PER_STROKE) return;
        if (this.logPts + ev.pts.length > LIMITS.MAX_PTS_PER_TURN) return;
        if (!player.limits.pts.take(ev.pts.length)) return this.scheduleResync(player);
        const pts = ev.pts.map(round1);
        st.pts.push(...pts);
        this.logPts += pts.length;
        out = { type: 'pts', id: st.id, pts };
        break;
      }
      case 'end':
        this.currentStroke = null;
        return;
      case 'fill': {
        if (!inCanvas([ev.x, ev.y]) || !HEX.test(ev.color || '')) return;
        if (this.ops.length >= LIMITS.MAX_OPS) return;
        const op = { t: 'fill', x: Math.floor(ev.x), y: Math.floor(ev.y), color: ev.color.toLowerCase() };
        this.ops.push(op);
        this.currentStroke = null;
        out = { type: 'fill', x: op.x, y: op.y, color: op.color };
        break;
      }
      case 'undo':
        if (!this.ops.length) return;
        this.ops.pop();
        this.currentStroke = null;
        out = { type: 'undo' };
        break;
      case 'clear':
        this.ops = [];
        this.currentStroke = null;
        out = { type: 'clear' };
        break;
      default:
        return;
    }

    out.seq = ++this.seq;
    this.log.push({ t: Date.now() - this.drawStartedAt, ...out });
    socket.to(this.id).emit('draw', out);     // everyone except the drawer, who already drew locally
  }

  scheduleResync(player) {
    if (player.resyncTimer) return;
    player.resyncTimer = setTimeout(() => {
      player.resyncTimer = null;
      this.sendSnapshot(player);     // drawer's local canvas may have diverged after dropped events
    }, 400);
  }

  // ───────────────────────── state out ─────────────────────────

  emitTo(player, event, payload) {
    if (player.socketId) this.io.to(player.socketId).emit(event, payload);
  }

  hintArray() {
    if (!this.word || this.phase !== 'drawing') return null;
    return [...this.word].map((c, i) => (!/[\p{L}\p{N}]/u.test(c) ? c : this.revealed.has(i) ? c : '_'));
  }

  stateFor(p) {
    const isDrawer = p.id === this.drawerId;
    const knowsWord = isDrawer || this.phase === 'turnEnd' || this.phase === 'gameEnd';   // guessers see it only when the turn is over
    return {
      youId: p.id,
      roomId: this.id,
      hostId: this.hostId,
      phase: this.phase,
      round: this.round,
      totalRounds: this.settings.rounds,
      settings: {
        rounds: this.settings.rounds,
        drawTime: this.settings.drawTime,
        difficulty: this.settings.difficulty,
        wordCount: this.settings.words.length,
        words: p.id === this.hostId ? this.settings.words : undefined,
      },
      drawerId: this.drawerId,
      players: [...this.players.values()].map((q) => ({
        id: q.id,
        name: q.name,
        avatar: q.avatar,
        score: q.score,
        connected: q.connected,
        guessed: this.guessed.has(q.id),
      })),
      votes: this.voteCounts(),
      myVote: this.votes.get(p.id) || null,
      hint: this.hintArray(),
      word: knowsWord && this.word ? this.word : null,
      choices: isDrawer && this.phase === 'choosing' ? this.choices : null,
      phaseEndsAt: this.phaseEndsAt,
      serverNow: Date.now(),
      lastTurn: this.phase === 'turnEnd' ? this.lastTurn : null,
    };
  }

  sendState(p) {
    this.emitTo(p, 'room:state', this.stateFor(p));
  }

  broadcastState() {
    if (this.destroyed) return;
    for (const p of this.players.values()) if (p.connected) this.sendState(p);
  }
}

module.exports = { Room, AVATAR_EMOJIS };
