'use strict';
const assert = require('assert');
const { TIERS, DEFAULT_WORDS, DROPPED_DUPLICATES, pickByDifficulty, pickChoices } = require('../src/words');

const { EASY, MEDIUM, HARD } = TIERS;
console.log(`  words: ${EASY.length} easy, ${MEDIUM.length} medium, ${HARD.length} hard = ${DEFAULT_WORDS.length} total (${DROPPED_DUPLICATES} repeated entries ignored)`);
assert(DEFAULT_WORDS.length >= 3000, 'dictionary should be huge'); console.log('  ✓ dictionary has 3000+ words');
assert(EASY.length >= 900 && MEDIUM.length >= 900 && HARD.length >= 900); console.log('  ✓ every difficulty has 900+ words');
assert.equal(new Set(DEFAULT_WORDS).size, DEFAULT_WORDS.length); console.log('  ✓ no word appears in two tiers');
assert(DEFAULT_WORDS.every((w) => w.length >= 2 && w.length <= 22 && /^[a-z0-9 '\-]+$/.test(w))); console.log('  ✓ every word is lowercase, short, simple characters');
assert(DEFAULT_WORDS.every((w) => w.split(' ').length <= 4)); assert(DEFAULT_WORDS.filter((w) => w.split(' ').length > 2).length <= 20); console.log('  ✓ plain nouns: almost every entry is 1-2 words, none is a long phrase');

for (const [level, turns] of [['easy', 300], ['medium', 300], ['hard', 350]]) {
  const used = new Set(); const offered = [];
  for (let i = 0; i < turns; i++) {
    const c = pickByDifficulty(level, used);
    assert.equal(c.length, 3); assert.equal(new Set(c).size, 3);
    offered.push(...c);
  }
  assert.equal(new Set(offered).size, offered.length, level + ' repeated a word');
  console.log(`  ✓ ${level}: ${turns} turns in a row (${offered.length} words), zero repeats`);
}
const used = new Set();
for (let i = 0; i < 3000; i++) { const c = pickByDifficulty('medium', used); assert.equal(new Set(c).size, 3); }
console.log('  ✓ 3000 turns without errors (tiers refill automatically)');

const custom = ['a1', 'b2', 'c3', 'd4', 'e5', 'f6'];
const u2 = new Set(); const first = pickChoices(custom, 3, u2); const second = pickChoices(custom, 3, u2);
assert.equal(new Set([...first, ...second]).size, 6); console.log('  ✓ custom word lists do not repeat either');
console.log('words ok');
