/* =========================================================================
   CONTENT · Daten und Musik für VOXEL RAGE
   Reines Datenmodul (keine Three.js-Abhängigkeit), damit game.js es importieren
   kann, ohne dass sich beide Module gegenseitig brauchen.
   ========================================================================= */

/* ------------------------------ Distrikte -------------------------------- */
// Jeder Distrikt ist ein Map-Thema: Himmel, Nebel, Straßenfarbe, Fassaden, Neon.
export const DISTRICTS = [
  {
    key: 'istanbul', name: 'KOSTANTINIYE', sub: 'STRASSE DER SCHMIEDE',
    sky: ['#160f22', '#4a2a4e', '#c25a3f'], fog: 0x3b2a52, road: 0x36304e,
    walk: 0x453d61, buildings: [0x40365c, 0x513a4a, 0x4d3f2f], neon: [0xff2f6d, 0xffd76e, 0x6be0ff],
    skyline: [0x2a2242, 0x302648], ground: 0x241f33, landmark: 'minarett',
  },
  {
    key: 'bazaar', name: 'GROSSER BASAR', sub: 'GEWÖLBE DER HÄNDLER',
    sky: ['#1b1026', '#6b3a2e', '#e08a3c'], fog: 0x4a2f33, road: 0x3d3040,
    walk: 0x533f45, buildings: [0x5a4030, 0x6b4a34, 0x4a3530], neon: [0xffb347, 0xff5f6d, 0x7be3ff],
    skyline: [0x33221f, 0x3d2a24], ground: 0x2a211f, landmark: 'markisen',
  },
  {
    key: 'hafen', name: 'GOLDENES HORN', sub: 'HAFENKAIS BEI NACHT',
    sky: ['#0a1220', '#173a52', '#3f7f9e'], fog: 0x1b3242, road: 0x2c3a48,
    walk: 0x36485a, buildings: [0x26384a, 0x2f4456, 0x1f2d3c], neon: [0x4fdfff, 0x9b6bff, 0xffd76e],
    skyline: [0x1b2a38, 0x22364a], ground: 0x18242e, landmark: 'kran',
  },
  {
    key: 'zistern', name: 'VERSUNKENE ZISTERNE', sub: 'UNTERIRDISCHE WASSER',
    sky: ['#080f14', '#12303a', '#2c6b6b'], fog: 0x16303a, road: 0x243a3e,
    walk: 0x2d4a4e, buildings: [0x1e3a3c, 0x264a4a, 0x1a2e33], neon: [0x4dffa8, 0x6be0ff, 0x9b6bff],
    skyline: [0x152a2e, 0x1b3438], ground: 0x142428, landmark: 'saeulen',
  },
  {
    key: 'wueste', name: 'ANATOLISCHE WÜSTE', sub: 'KARAWANENSTRASSE',
    sky: ['#2a1a12', '#8a4a2a', '#e8b06a'], fog: 0x6a4a34, road: 0x5a4638,
    walk: 0x6b5540, buildings: [0x7a5c42, 0x8a6a4a, 0x5f4834], neon: [0xffb347, 0xff6f6f, 0xfff1b8],
    skyline: [0x4a3626, 0x5a4230], ground: 0x3d2e22, landmark: 'palmen',
  },
  {
    key: 'hammam', name: 'DAMPFBAD', sub: 'KUPFERTÖPFE UND NEBEL',
    sky: ['#1a1420', '#4a3a52', '#9a7aa8'], fog: 0x4a3a52, road: 0x3a3444,
    walk: 0x4a4454, buildings: [0x564a64, 0x4a4058, 0x62546e], neon: [0x9b6bff, 0xff8fb3, 0x7be3ff],
    skyline: [0x322a3e, 0x3c3348], ground: 0x2a2433, landmark: 'kuppel',
  },
  {
    key: 'palast', name: 'PALASTGÄRTEN', sub: 'ZWISCHEN MAUERN UND ZYPRESSEN',
    sky: ['#0e1a16', '#1f4a3a', '#6bbf8a'], fog: 0x1f3f34, road: 0x2c4038,
    walk: 0x3a5448, buildings: [0x2f4a3e, 0x3a5a4a, 0x264036], neon: [0x4dffa8, 0xffd76e, 0x6be0ff],
    skyline: [0x1b2f28, 0x233a30], ground: 0x18291f, landmark: 'zypressen',
  },
  {
    key: 'schmiede', name: 'WAFFENSCHMIEDE', sub: 'GLUT UND AMBOSS',
    sky: ['#180d0d', '#5a1f18', '#e05a2a'], fog: 0x4a1f18, road: 0x3b2320,
    walk: 0x4a2c26, buildings: [0x4d2a24, 0x5c332a, 0x3a201c], neon: [0xff5f2a, 0xffd76e, 0xff2f6d],
    skyline: [0x2e1814, 0x3a201a], ground: 0x241312, landmark: 'amboss',
  },
  {
    key: 'friedhof', name: 'GRÄBERFELD', sub: 'NEBEL ÜBER STEINEN',
    sky: ['#0c1016', '#2a3346', '#5a6f8a'], fog: 0x26303f, road: 0x2a3038,
    walk: 0x343c46, buildings: [0x2f3742, 0x3a4450, 0x262e38], neon: [0x6be0ff, 0x9b6bff, 0xfff1b8],
    skyline: [0x1b2230, 0x232c3a], ground: 0x181d26, landmark: 'grabsteine',
  },
  {
    key: 'thron', name: 'THRONSAAL', sub: 'DAS LETZTE TOR',
    sky: ['#100a18', '#3a1f4a', '#a04a6a'], fog: 0x3a1f4a, road: 0x2f2438,
    walk: 0x3d3048, buildings: [0x3a2a4a, 0x4a3458, 0x2e2238], neon: [0xffd76e, 0xff2f6d, 0x9b6bff],
    skyline: [0x241a30, 0x2e223c], ground: 0x1e1728, landmark: 'thron',
  },
];

/* ------------------------------ Gegner ----------------------------------- */
// Werte bewusst data-driven: die Figuren-Fabrik in game.js liest nur Palette,
// Größe und Tempo. Sonderverhalten über Flags (ranged/block/dash/...).
export const ENEMIES = {
  punk: {
    hp: 46, speed: 2.55, reach: 1.55, dmg: 8, scale: 0.95, bulk: 1.0, score: 150, attack: 'swing',
    pal: { skin: 0xc98d68, hair: 0x4fd36b, shirt: 0x6a4fd6, shirt2: 0x3a2a7a, pants: 0x2a2a38, shoe: 0x101018, band: 0x9dff6b },
  },
  runner: {
    hp: 34, speed: 3.5, reach: 1.4, dmg: 7, scale: 0.9, bulk: 0.9, score: 160, dash: true, attack: 'leap',
    pal: { skin: 0xd9a06f, hair: 0xffd23f, shirt: 0xd9d23f, shirt2: 0x8a7a20, pants: 0x2a2a38, shoe: 0x1a1a1a },
  },
  brute: {
    hp: 86, speed: 2.1, reach: 1.75, dmg: 13, scale: 1.12, bulk: 1.2, score: 300, attack: 'smash',
    pal: { skin: 0x9c6b4a, hair: 0x241a16, shirt: 0x8f8f99, shirt2: 0x5f5f6b, pants: 0x40404a, shoe: 0x16141f },
  },
  guard: {
    hp: 72, speed: 2.0, reach: 1.8, dmg: 11, scale: 1.05, bulk: 1.15, score: 260, block: 0.55, attack: 'bash',
    pal: { skin: 0xb98a63, hair: 0x2a2a2a, shirt: 0x59616e, shirt2: 0x8f9aa8, pants: 0x333a44, shoe: 0x14161c },
  },
  knife: {
    hp: 40, speed: 3.2, reach: 1.5, dmg: 12, scale: 0.95, bulk: 0.95, score: 220, attack: 'stab',
    pal: { skin: 0xd79b73, hair: 0xd23a3a, shirt: 0x1f2430, shirt2: 0xd23a3a, pants: 0x1a1e28, shoe: 0x0d0d14 },
  },
  gunner: {
    hp: 42, speed: 2.2, reach: 1.5, dmg: 9, scale: 0.97, bulk: 1.0, score: 280, ranged: 6.5, attack: 'shoot',
    pal: { skin: 0xb98a63, hair: 0x3a2a20, shirt: 0x4a5a3a, shirt2: 0x2f3a24, pants: 0x2a3030, shoe: 0x141414 },
  },
  bomber: {
    hp: 50, speed: 1.9, reach: 1.5, dmg: 10, scale: 1.0, bulk: 1.05, score: 260, aoe: true, attack: 'swing',
    pal: { skin: 0xc98d68, hair: 0x222222, shirt: 0x8a4a1f, shirt2: 0xffb347, pants: 0x3a2a20, shoe: 0x141210 },
  },
  shield: {
    hp: 96, speed: 1.7, reach: 1.7, dmg: 12, scale: 1.08, bulk: 1.18, score: 320, block: 0.75, shield: true, attack: 'bash',
    pal: { skin: 0x9c6b4a, hair: 0x1a1a1a, shirt: 0x2f4a5a, shirt2: 0x8fa8b8, pants: 0x243438, shoe: 0x101418 },
  },
  ninja: {
    hp: 46, speed: 3.8, reach: 1.6, dmg: 10, scale: 0.93, bulk: 0.9, score: 300, dash: true, attack: 'stab',
    pal: { skin: 0x8a5a3a, hair: 0x101018, shirt: 0x1a1a24, shirt2: 0x3a3a5a, pants: 0x12121a, shoe: 0x0a0a10 },
  },
  // Griechische Miliz: wattierter Rock, Stirnband, kein Helm. Zäher als die
  // Marodeure, aber klar schwächer als die byzantinische Linie.
  greek: {
    hp: 104, speed: 2.4, reach: 1.85, dmg: 14, scale: 1.04, bulk: 1.1, score: 360, block: 0.3, attack: 'swing',
    pal: { skin: 0xd0a078, hair: 0x2a1a12, shirt: 0x4a6a8a, shirt2: 0xd9c9a0, pants: 0x2a2a32, shoe: 0x14141a, band: 0x8a2b2f, mustache: 0x2a1a12 },
  },
  // Byzantinische Truppen sind die Linie der Gegenwehr: Kettenpanzer, Helm
  // mit Wangenklappen und ein Messingband.
  byzantin: {
    hp: 84, speed: 2.3, reach: 1.8, dmg: 13, scale: 1.06, bulk: 1.14, score: 340, block: 0.25, attack: 'swing',
    pal: { skin: 0xc08a5c, hair: 0x2a1a10, shirt: 0x7b8592, shirt2: 0xc9a24a, pants: 0x3a3d48, shoe: 0x1a1a22, helmet: 0x9aa6b4, band: 0x8a6a2a },
  },
  // Marodeure: barhäuptig, ohne Panzer, mit Turban und Schärpe. Sie fallen
  // mit zwei Treffern und tauchen nur gelegentlich zwischen den Trupps auf.
  marodeur: {
    hp: 26, speed: 3.0, reach: 1.45, dmg: 5, scale: 0.9, bulk: 0.88, score: 80, attack: 'swing',
    pal: { skin: 0xb9814f, hair: 0x2a1a12, shirt: 0xb9814f, shirt2: 0x8a5a34, pants: 0x6a5a44, shoe: 0x2a2018, turban: 0xe9e0c8, mustache: 0x2a1a12, scarf: 0xd9c9a0 },
  },
  // Schatzwächter: schwarzer Mantel, hohe Pelzmütze, schwer zu treffen und
  // selten. Die Mütze fällt beim K.O., und er lässt immer Gold liegen.
  schatzwaechter: {
    hp: 130, speed: 2.15, reach: 1.75, dmg: 14, scale: 1.02, bulk: 1.04, score: 520, attack: 'smash',
    pal: { skin: 0xc99a72, hair: 0x14141a, shirt: 0x1c1c22, shirt2: 0x32323c, pants: 0x16161c, shoe: 0x0a0a10, furhat: 0x211a14, mustache: 0x14141a, scarf: 0x3a3a46 },
    hatOff: true, goldDrop: true, rare: true,
  },
};

/* ------------------------------- Bosse ----------------------------------- */
// Ein Boss pro Distrikt. Gleiche Figur-Fabrik, aber deutlich größer/robuster.
const bossPal = (skin, hair, shirt, shirt2, pants, extra = {}) => ({
  skin, hair, shirt, shirt2, pants, shoe: 0x121018, ...extra,
});

export const BOSSES = {
  boss_kilic: {
    name: 'KILIC DER SCHMIED', hp: 340, speed: 2.4, reach: 2.1, dmg: 18, scale: 1.42, bulk: 1.35,
    score: 1200, boss: true, attack: 'smash',
    pal: bossPal(0xb98a63, 0x141414, 0x6a2a2a, 0xffb347, 0x2a1a1a, { pads: 0xffb347 }),
  },
  boss_vezir: {
    name: 'VEZIR AL-KABIR', hp: 380, speed: 2.2, reach: 2.15, dmg: 20, scale: 1.45, bulk: 1.4,
    score: 1400, boss: true, attack: 'bash',
    pal: bossPal(0xc99a6a, 0x2a1a10, 0x4a2a6a, 0xffd76e, 0x2a1f3a, { pads: 0xffd76e }),
  },
  boss_korsan: {
    name: 'KORSAR BAHRI', hp: 360, speed: 2.6, reach: 2.1, dmg: 19, scale: 1.4, bulk: 1.32,
    score: 1300, boss: true, attack: 'stab',
    pal: bossPal(0xa87a5a, 0x101018, 0x1f3a52, 0x6be0ff, 0x1a2836, { band: 0x6be0ff }),
  },
  boss_muhafiz: {
    name: 'WÄCHTER DER ZISTERNE', hp: 420, speed: 1.9, reach: 2.2, dmg: 21, scale: 1.5, bulk: 1.45,
    score: 1600, boss: true, attack: 'bash',
    pal: bossPal(0x8a9a9a, 0x0a1414, 0x1e3a3c, 0x4dffa8, 0x14282a, { pads: 0x4dffa8 }),
  },
  boss_serdar: {
    name: 'SERDAR DER WÜSTE', hp: 400, speed: 2.5, reach: 2.15, dmg: 20, scale: 1.44, bulk: 1.36,
    score: 1500, boss: true, attack: 'swing',
    pal: bossPal(0xd9a06f, 0x3a2414, 0x8a5c2a, 0xffb347, 0x4a3420, { band: 0xffb347 }),
  },
  boss_cellat: {
    name: 'CELLAT IM DAMPF', hp: 440, speed: 2.3, reach: 2.2, dmg: 22, scale: 1.46, bulk: 1.4,
    score: 1700, boss: true, attack: 'smash',
    pal: bossPal(0x9a8aa8, 0x1a1420, 0x4a3a62, 0xff8fb3, 0x2e2438, { pads: 0xff8fb3 }),
  },
  boss_bahci: {
    name: 'GARTENMEISTER NAR', hp: 430, speed: 2.4, reach: 2.1, dmg: 21, scale: 1.42, bulk: 1.34,
    score: 1650, boss: true, attack: 'stab',
    pal: bossPal(0xb98a63, 0x1f3a2a, 0x2f5a3a, 0xffd76e, 0x1e3a2a, { band: 0xffd76e }),
  },
  boss_demirci: {
    name: 'DEMIRCI DER GLÜHENDE', hp: 470, speed: 2.2, reach: 2.25, dmg: 23, scale: 1.5, bulk: 1.46,
    score: 1800, boss: true, attack: 'smash',
    pal: bossPal(0xa86a4a, 0x1a0e0a, 0x5a1f18, 0xe05a2a, 0x2e1612, { pads: 0xe05a2a }),
  },
  boss_azrail: {
    name: 'AZRAIL VON DEN GRÄBERN', hp: 500, speed: 2.6, reach: 2.2, dmg: 24, scale: 1.48, bulk: 1.38,
    score: 2000, boss: true, attack: 'stab',
    pal: bossPal(0x8a9aa8, 0x08080e, 0x262e3a, 0x6be0ff, 0x1a2028, { pads: 0x6be0ff }),
  },
  boss_padischah: {
    name: 'PADISCHAH DER LETZTEN PFORTE', hp: 700, speed: 2.5, reach: 2.3, dmg: 26, scale: 1.55, bulk: 1.5,
    score: 3000, boss: true, attack: 'swing',
    pal: bossPal(0xc99a6a, 0x0a0a10, 0x3a1f4a, 0xffd76e, 0x241a30, { pads: 0xffd76e, band: 0xff2f6d }),
  },
};

/* ------------------------------- Waffen ---------------------------------- */
// munition = Schüsse, haltbarkeit = Treffer bei Nahkampf. reach/dmg skalieren.
export const WEAPONS = {
  pistole: { name: 'PISTOLE', kind: 'gun', ammo: 12, dmg: 16, cooldown: 0.28, speed: 26, color: 0xd9d9e6 },
  gewehr: { name: 'GEWEHR', kind: 'gun', ammo: 8, dmg: 26, cooldown: 0.55, speed: 34, pierce: true, color: 0x8a6a3a },
  bazooka: { name: 'BAZOOKA', kind: 'gun', ammo: 3, dmg: 42, cooldown: 1.0, speed: 16, aoe: 2.4, color: 0x4a6a3a },
  baseball: { name: 'BASEBALLSCHLÄGER', kind: 'melee', uses: 14, dmg: 24, reach: 2.5, color: 0xb98a4a },
  schlagring: { name: 'SCHLAGRING', kind: 'melee', uses: 22, dmg: 18, reach: 1.9, rate: 0.22, color: 0xc0c0cc },
  kusarigama: { name: 'KUSARIGAMA', kind: 'melee', uses: 10, dmg: 22, reach: 3.4, pull: true, color: 0x9a9aa8 },
};

/* -------------------------------- Items ---------------------------------- */
export const ITEMS = {
  doner: { name: 'DÖNER', heal: 40, color: 0xd9a04a, score: 0 },
  ayran: { name: 'AYRAN', heal: 15, color: 0xeef2f8, score: 0 },
  gold: { name: 'GOLD', heal: 0, color: 0xffd76e, score: 50 },
};

/* ------------------------------- Wellen ---------------------------------- */
// 30 Wellen, 10 Distrikte à 3 Wellen. Jede dritte Welle ist ein Boss.
// Jede Welle bekommt einen neuen Seed -> neue Map-Geometrie.
const WAVE_POOL = [
  ['byzantin', 'marodeur'],
  ['byzantin', 'runner', 'marodeur'],
  ['byzantin', 'knife', 'runner'],
  ['guard', 'byzantin', 'knife'],
  ['gunner', 'byzantin', 'runner'],
  ['bomber', 'guard', 'marodeur'],
  ['shield', 'knife', 'runner'],
  ['ninja', 'gunner', 'byzantin'],
  ['greek', 'guard', 'brute'],
  ['ninja', 'shield', 'bomber'],
];

export const WAVES = Array.from({ length: 30 }, (_, i) => {
  const district = Math.floor(i / 3);
  const boss = i % 3 === 2;
  const base = WAVE_POOL[(i + district) % WAVE_POOL.length];
  const size = boss ? 0 : Math.min(5, 3 + Math.floor(i / 6));
  const comp = [];
  for (let k = 0; k < size; k++) comp.push(base[(k + district) % base.length]);
  return {
    index: i,
    district,
    boss: boss ? `boss_${['kilic', 'vezir', 'korsan', 'muhafiz', 'serdar', 'cellat', 'bahci', 'demirci', 'azrail', 'padischah'][district]}` : null,
    comp,
    seed: 1000 + i * 977,
  };
});

/* -------------------------------- Musik ---------------------------------- */
// Kleiner Schritt-Sequencer: pro Distrikt ein eigener Track, für Bosse ein
// schnellerer Moll-Track. Alles synthetisch (keine Audiodateien nötig).
const SCALES = [
  [0, 2, 3, 5, 7, 8, 10], // natürlich moll
  [0, 2, 3, 5, 7, 9, 10], // dorisch
  [0, 1, 4, 5, 7, 8, 11], // phrygisch (orientalisch)
];

function mulberry(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeTrack(district) {
  const r = mulberry(4242 + district * 131);
  const root = 33 + (district % 5) * 2;
  const scale = SCALES[district % SCALES.length];
  const bass = [];
  const lead = [];
  for (let i = 0; i < 16; i++) {
    const step = scale[Math.floor(r() * scale.length)];
    bass.push(i % 4 === 0 ? root : root + (i % 8 === 6 ? 5 : 0));
    lead.push(r() > 0.42 ? 12 + root + step + (r() > 0.8 ? 12 : 0) : null);
  }
  return { bpm: 96 + (district % 4) * 8, bass, lead, drums: district % 2 ? 'boom' : 'four' };
}

export function makeBossTrack(district) {
  const t = makeTrack(district);
  return { bpm: 138, bass: t.bass.map((n) => n - 2), lead: t.lead.map((n) => (n ? n + 1 : null)), drums: 'drive' };
}

export function createMusic() {
  let ctx = null;
  let master = null;
  let timer = null;
  let track = null;
  let step = 0;
  let nextTime = 0;

  const ensure = () => {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.16;
    master.connect(ctx.destination);
    return ctx;
  };

  const note = (midi, when, dur, type, gain) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(gain, when + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g).connect(master);
    o.start(when);
    o.stop(when + dur + 0.02);
  };

  const kick = (when) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(120, when);
    o.frequency.exponentialRampToValueAtTime(42, when + 0.16);
    g.gain.setValueAtTime(0.9, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.2);
    o.connect(g).connect(master);
    o.start(when);
    o.stop(when + 0.22);
  };

  const hat = (when, gain = 0.25) => {
    const len = Math.floor(ctx.sampleRate * 0.05);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'highpass';
    bp.frequency.value = 6000;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(bp).connect(g).connect(master);
    src.start(when);
  };

  const scheduled = () => {
    if (!ctx || !track) return;
    while (nextTime < ctx.currentTime + 0.25) {
      const beat = 60 / track.bpm / 2;
      const bassNote = track.bass[step % 16];
      if (bassNote) note(bassNote, nextTime, beat * 1.6, 'triangle', 0.35);
      const lead = track.lead[step % 16];
      if (lead) note(lead, nextTime, beat * 0.9, 'square', 0.12);
      if (track.drums === 'four') {
        if (step % 4 === 0) kick(nextTime);
        if (step % 2 === 1) hat(nextTime);
      } else if (track.drums === 'boom') {
        if (step % 8 === 0 || step % 8 === 6) kick(nextTime);
        hat(nextTime, 0.18);
      } else {
        kick(nextTime);
        hat(nextTime, 0.22);
        if (step % 4 === 2) kick(nextTime + beat * 0.5);
      }
      nextTime += beat;
      step += 1;
    }
  };

  return {
    start(def) {
      if (!ensure()) return;
      if (ctx.state === 'suspended') ctx.resume();
      this.stop();
      track = def;
      step = 0;
      nextTime = ctx.currentTime + 0.08;
      timer = setInterval(scheduled, 60);
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
      track = null;
    },
    setMuted(muted) {
      if (master) master.gain.value = muted ? 0 : 0.16;
    },
    // Pause friert den AudioContext ein: keine Noten, kein Nachlaufen.
    pause() {
      if (ctx && ctx.state === 'running') ctx.suspend();
    },
    resume() {
      if (ctx && ctx.state === 'suspended') ctx.resume();
    },
    get playing() { return !!track; },
  };
}
