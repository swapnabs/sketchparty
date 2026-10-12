'use strict';
const crypto = require('crypto');

function normalize(s) {
  return String(s)
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ');
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = cur;
  }
  return prev[b.length];
}

/** "close!" = one edit away (two edits for long words), but not equal. */
function isClose(guess, word) {
  if (guess.length < 3 || guess === word) return false;
  const d = levenshtein(guess, word);
  return d === 1 || (word.length >= 8 && d === 2);
}

function sanitizeName(raw) {
  const name = String(raw ?? '')
    .replace(/[\u0000-\u001f<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 20);
  return name || 'Player';
}

function randomId(len = 6, alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789') {
  const bytes = crypto.randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

function randomToken() {
  return crypto.randomBytes(24).toString('hex');
}

const isNum = (n) => typeof n === 'number' && Number.isFinite(n);
const HEX = /^#[0-9a-fA-F]{6}$/;

module.exports = { normalize, levenshtein, isClose, sanitizeName, randomId, randomToken, isNum, HEX };
