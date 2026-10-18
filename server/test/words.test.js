'use strict';
const assert = require('assert');
const { DEFAULT_WORDS, EASY, MEDIUM, HARD, pickByDifficulty, pickChoices } = require('../src/words');

let passed = 0;
const ok = (name) => { passed++; console.log('  \u2713', name); };
const VALID = /^[\p{L}\p{N} '\-]+$/u;

// ── the bank itself
assert(DEFAULT_WORDS.length >= 1500, 'only ' + DEFAULT_WORDS.length + ' words');
ok('word bank is large (' + DEFAULT_WORDS.length + ' words: ' + EASY.length + ' easy, ' + MEDIUM.length + ' medium, ' + HARD.length + ' hard)');
const lower = DEFAULT_WORDS.map((w) => w.toLowerCase());
assert.equal(new Set(lower).size, lower.length);
ok('every word is unique across all difficulty levels');
assert(DEFAULT_WORDS.every((w) => w.length >= 2 && w.length <= 30 && VALID.test(w)));
ok('every word has a valid shape (2-30 characters, letters, spaces, hyphens)');

// ── no repeats inside a game
function simulate(level, turns) {
  const seen = new Set();
  const offered = [];
  for (let i = 0; i < turns; i++) {
    const c = pickByDifficulty(level, seen);
    assert.equal(c.length, 3);
    assert.equal(new Set(c).size, 3, 'duplicate inside one turn');
    offered.push(...c);
  }
  return offered;
}
for (const [level, turns] of [['easy', 200], ['medium', 300], ['hard', 250]]) {
  const offered = simulate(level, turns);
  assert.equal(new Set(offered).size, offered.length, level + ' repeated a word');
  ok(level + ': ' + turns + ' turns (' + offered.length + ' words offered) with no repeat');
}
// when a list runs out it starts over instead of failing
const long = simulate('hard', 600);
assert.equal(long.length, 1800);
ok('a very long game keeps offering 3 distinct words per turn (lists restart when used up)');

// ── custom lists
const custom = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel', 'india', 'juliet'];
const seen = new Set();
const firstThree = [];
for (let i = 0; i < 3; i++) { const c = pickChoices(custom, 3, seen); assert(c.every((w) => custom.includes(w))); firstThree.push(...c); }
assert.equal(new Set(firstThree).size, 9);
ok('custom list: first 3 turns use 9 different words');
for (let i = 0; i < 50; i++) assert.equal(new Set(pickChoices(custom, 3, seen)).size, 3);
ok('custom list: keeps working after it is used up');
const tiny = pickChoices(['only one', 'and two'], 3, new Set());
assert.equal(new Set(tiny).size, 3); assert(tiny.includes('only one') && tiny.includes('and two'));
ok('a tiny custom list is topped up to 3 choices');

console.log('\n' + passed + ' word checks passed');
