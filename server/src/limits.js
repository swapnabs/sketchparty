'use strict';

/** Simple token bucket: `capacity` burst, refilled at `perSec` tokens per second. */
class TokenBucket {
  constructor(capacity, perSec) {
    this.capacity = capacity;
    this.perSec = perSec;
    this.tokens = capacity;
    this.last = Date.now();
  }
  take(n = 1) {
    const now = Date.now();
    this.tokens = Math.min(this.capacity, this.tokens + ((now - this.last) / 1000) * this.perSec);
    this.last = now;
    if (this.tokens >= n) {
      this.tokens -= n;
      return true;
    }
    return false;
  }
}

const LIMITS = {
  MAX_PLAYERS: Math.min(20, Math.max(2, Number(process.env.MAX_PLAYERS) || 12)),   // override with MAX_PLAYERS=16 (cap 20)
  MAX_ROOMS: 5000,
  NAME_LEN: 20,
  CHAT_LEN: 100,
  ROUNDS: [1, 10],
  DRAW_TIME: [20, 240],
  CHOOSE_MS: 15000,
  TURN_END_MS: 6000,
  REJOIN_GRACE_MS: 30000,   // dropped player keeps their seat + score this long
  DRAWER_GRACE_MS: 8000,    // a dropped drawer gets this long before the turn is skipped
  CANVAS_W: 800,
  CANVAS_H: 600,
  MAX_PTS_PER_MSG: 40,
  MAX_PTS_PER_STROKE: 3000,
  MAX_PTS_PER_TURN: 60000,
  MAX_OPS: 600,
  MAX_LOG_EVENTS: 12000,
  MAX_CUSTOM_WORDS: 500,
  WORD_LEN: [2, 30],
};

module.exports = { TokenBucket, LIMITS };
