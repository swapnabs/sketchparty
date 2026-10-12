'use strict';

const list = (s) => s.split(',').map((w) => w.trim()).filter(Boolean);

const EASY = list(`apple,banana,pizza,rocket,guitar,castle,dragon,rainbow,snowman,penguin,bicycle,sandwich,elephant,giraffe,
butterfly,backpack,campfire,hamburger,mushroom,popcorn,dinosaur,sunflower,toothbrush,unicorn,balloon,candle,dolphin,glasses,
orange,piano,pumpkin,scissors,spider,star,tiger,train,turtle,whale,zebra,airplane,broom,camera,carrot,clock,cloud,cookie,
crown,diamond,donut,drum,eagle,fence,football,frog,ghost,hat,ice cream,jacket,key,kite,lamp,lemon,moon,mountain,nest,owl,
pencil,pillow,ring,shark,shovel,sword`);

const MEDIUM = list(`bridge,volcano,umbrella,robot,lighthouse,telescope,pirate,cactus,helicopter,skateboard,waterfall,pyramid,
submarine,scarecrow,windmill,octopus,spaceship,treasure map,tornado,kangaroo,fireworks,jellyfish,tractor,hammock,parachute,
snowflake,crocodile,compass,lantern,mermaid,trampoline,vampire,wizard,anchor,envelope,flamingo,hedgehog,igloo,jigsaw,keyboard,
ladder,magnet,necklace,quilt,roller coaster,tent,violin,xylophone,ambulance,bookshelf,chimney,paintbrush,queen,saw,yo-yo,
zipper,fishing rod,hot dog,skeleton,tombstone,wheelchair,windshield`);

const HARD = list(`stethoscope,chandelier,escalator,accordion,periscope,avalanche,quicksand,hourglass,kaleidoscope,catapult,
scuba diver,drawbridge,blacksmith,constellation,hot air balloon,trapeze,megaphone,snorkel,bulldozer,cuckoo clock,gondola,harpoon,
jetpack,lawn mower,microscope,nutcracker,observatory,pendulum,reflection,shipwreck,sundial,tightrope,vending machine,waterwheel,
zeppelin,wheelbarrow,barcode,bagpipes,bonsai,cannon,crossbow,dentist,earthquake,eclipse,fountain,graveyard,handcuffs,iceberg,
jukebox,lifeguard,mannequin,orchestra,paparazzi,quicksilver,sleepwalking,tsunami,umpire,whirlpool,windchime,time machine`);

const DEFAULT_WORDS = [...EASY, ...MEDIUM, ...HARD];
const DIFFICULTIES = ['easy', 'medium', 'hard'];

function sample(arr, n, exclude = []) {
  const pool = [...new Set(arr)].filter((w) => !exclude.includes(w));
  const out = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Three choices for the drawer, mixed by difficulty:
 *  easy = 3 easy; medium (default) = 1 easy + 1 medium + 1 hard; hard = 1 medium + 2 hard. */
function pickByDifficulty(level = 'medium') {
  let out;
  if (level === 'easy') out = sample(EASY, 3);
  else if (level === 'hard') { const h = sample(HARD, 2); out = [...sample(MEDIUM, 1), ...h]; }
  else out = [...sample(EASY, 1), ...sample(MEDIUM, 1), ...sample(HARD, 1)];
  return shuffle(out);
}

/** Choices from a host-supplied custom list. */
function pickChoices(pool, n = 3) {
  const out = sample(pool, n);
  // Tiny custom pools: top up from the defaults so the drawer always sees n options
  while (out.length < n) {
    const w = DEFAULT_WORDS[Math.floor(Math.random() * DEFAULT_WORDS.length)];
    if (!out.includes(w)) out.push(w);
  }
  return out;
}

module.exports = { DEFAULT_WORDS, DIFFICULTIES, pickChoices, pickByDifficulty };
