// Keep in sync with AVATAR_EMOJIS in server/src/game.js (the server validates against its copy).
export const EMOJIS = ['🦊', '🐼', '🐸', '🦁', '🐙', '🦄', '🐧', '🐯', '🐨', '🐵', '🦉', '🐢', '🦋', '🐳', '🦖', '🐝', '🦩', '🐰', '🦔', '🐷', '🐻', '🦀', '🐞', '🦥'];

const pick = (a) => a[Math.floor(Math.random() * a.length)];

export function randomAvatar(taken = new Set()) {
  const free = EMOJIS.filter((e) => !taken.has(e));
  return { emoji: pick(free.length ? free : EMOJIS) };
}

export function saveAvatar(a) {
  try { localStorage.setItem('sp:avatar', JSON.stringify({ emoji: a.emoji })); } catch { /* storage unavailable */ }
}

/** The player's chosen avatar (kept in this browser); a random one is picked and remembered the first time. */
export function loadAvatar() {
  try {
    const a = JSON.parse(localStorage.getItem('sp:avatar'));
    if (a && EMOJIS.includes(a.emoji)) return { emoji: a.emoji };
  } catch { /* fall through */ }
  const a = randomAvatar();
  saveAvatar(a);
  return a;
}
