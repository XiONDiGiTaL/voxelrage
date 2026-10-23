import * as THREE from './vendor/three.module.js';
import { DISTRICTS, ENEMIES, BOSSES, WEAPONS, ITEMS, WAVES, makeTrack, makeBossTrack, createMusic } from './content.js';

/* =========================================================================
   VOXEL RAGE — Block 7
   Ein Beat-'em-up-Prototyp, bei dem ALLES aus Würfeln besteht:
   Figuren, Straße, Häuser, Requisiten, Partikel.
   Figuren werden prozedural animiert (keine Sprite-Sheets).
   ========================================================================= */

/* ------------------------------ Konfiguration ---------------------------- */
const VOX = 0.1;            // 1 Voxel = 0.1 Welteinheit
const LANE = 2.35;          // begehbare Tiefe (z) für Beute/Spawns
const WALK_LANE = 4.55;     // Spieler und Gegner dürfen über den Bordstein
const SIDEWALK_Y = 0.3;     // Oberkante des Bürgersteigs
const CURB_Z = 4.05;        // hier beginnt die Bordsteinkante
// Sanfte Stufe vom Asphalt (y=0) auf den Gehweg (y=0.3).
function groundYAt(z) {
  const d = Math.abs(z);
  if (d <= CURB_Z) return 0;
  const t = clamp((d - CURB_Z) / 0.3, 0, 1);
  return SIDEWALK_Y * t * t * (3 - 2 * t);
}
const XMIN = -8, XMAX = 340; // Eine Map-Runde = 348 Einheiten lange Straße, drei Abschnitte

/* ------------------------------ Renderer --------------------------------- */
const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
app.appendChild(renderer.domElement);

const SKY = 0x2a1f3d;
const scene = new THREE.Scene();
scene.background = new THREE.Color(SKY);
scene.fog = new THREE.Fog(0x3b2a52, 20, 62);

// Alles, was pro Welle neu aufgebaut wird, hängt in dieser Gruppe.
const world = new THREE.Group();
scene.add(world);
let THEME = DISTRICTS[0];

const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
camera.position.set(1.2, 5.0, 12.2);

/* ------------------------------ Licht ------------------------------------ */
scene.add(new THREE.HemisphereLight(0x9d86ff, 0x53406d, 1.75));

const sun = new THREE.DirectionalLight(0xffb277, 2.7);
sun.position.set(9, 18, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -18;
sun.shadow.camera.right = 18;
sun.shadow.camera.top = 18;
sun.shadow.camera.bottom = -18;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 70;
sun.shadow.bias = -0.0008;
sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);

const rim = new THREE.DirectionalLight(0x5ad9ff, 0.8);
rim.position.set(-12, 7, -10);
scene.add(rim);

// Himmel als Farbverlauf hinter der Häuserzeile — pro Distrikt neu gebaut
function buildSky() {
  const cv = document.createElement('canvas');
  cv.width = 16; cv.height = 256;
  const ctx = cv.getContext('2d');
  const grd = ctx.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, THEME.sky[0]);
  grd.addColorStop(0.5, THEME.sky[1]);
  grd.addColorStop(0.82, THEME.sky[2]);
  grd.addColorStop(1, THEME.sky[2]);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 16, 256);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 80),
    new THREE.MeshBasicMaterial({ map: tex, fog: false, depthWrite: false }),
  );
  plane.position.set(20, 26, -46);
  world.add(plane);
}

/* ------------------------------ Helpers ---------------------------------- */
const BOX = new THREE.BoxGeometry(1, 1, 1);
const lamCache = new Map();
const basCache = new Map();

function lam(color) {
  let m = lamCache.get(color);
  if (!m) { m = new THREE.MeshLambertMaterial({ color }); lamCache.set(color, m); }
  return m;
}
function bas(color) {
  let m = basCache.get(color);
  if (!m) { m = new THREE.MeshBasicMaterial({ color }); basCache.set(color, m); }
  return m;
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = (t) => 1 - (1 - t) * (1 - t);

// Voxel im lokalen Figuren-Raster (Einheit = 1 Voxel)
function vox(parent, x, y, z, w, h, d, color, glow = false) {
  const m = new THREE.Mesh(BOX, glow ? bas(color) : lam(color));
  m.scale.set(w * VOX, h * VOX, d * VOX);
  m.position.set(x * VOX, y * VOX, z * VOX);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

// Box in Weltkoordinaten
let WOFF = 0; // X-Versatz, damit Wahrzeichen mehrfach auf der langen Straße stehen
function wbox(x, y, z, w, h, d, color, opt = {}) {
  const m = new THREE.Mesh(BOX, opt.glow ? bas(color) : lam(color));
  m.scale.set(w, h, d);
  m.position.set(x + WOFF, y, z);
  m.castShadow = opt.cast !== false;
  m.receiveShadow = opt.receive !== false;
  world.add(m);
  return m;
}

// deterministischer Zufall für den Weltaufbau
let seed = 20261022;
function rnd() {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const rndRange = (a, b) => a + rnd() * (b - a);
const choose = (arr) => arr[Math.floor(rnd() * arr.length)];

/* ============================== WELT ===================================== */
const LEN = XMAX - XMIN + 46;
const CX = (XMIN + XMAX) / 2;

function buildStreet() {
  buildSky();

  // Grundfläche unter allem
  const base = new THREE.Mesh(new THREE.PlaneGeometry(430, 90), lam(THEME.ground));
  base.rotation.x = -Math.PI / 2;
  base.position.set(CX, -0.02, -8);
  base.receiveShadow = true;
  world.add(base);

  // Asphalt
  const road = new THREE.Mesh(new THREE.BoxGeometry(LEN, 0.4, 9.4), lam(THEME.road));
  road.position.set(CX, -0.2, 0);
  road.receiveShadow = true;
  world.add(road);

  // Bürgersteige
  for (const z of [-6.5, 6.5]) {
    const sw = new THREE.Mesh(new THREE.BoxGeometry(LEN, 0.5, 4.8), lam(THEME.walk));
    sw.position.set(CX, 0.05, z);
    sw.receiveShadow = true;
    world.add(sw);
    const curb = new THREE.Mesh(new THREE.BoxGeometry(LEN, 0.3, 0.4), lam(0x4a4566));
    curb.position.set(CX, 0.15, z - Math.sign(z) * 2.2);
    curb.receiveShadow = true;
    world.add(curb);
  }

  // Fahrbahnmarkierungen
  for (let x = XMIN - 10; x < XMAX + 20; x += 3.4) {
    wbox(x, 0.005, 3.5, 1.6, 0.02, 0.16, 0x585273, { cast: false });
    wbox(x, 0.005, -3.5, 1.6, 0.02, 0.16, 0x585273, { cast: false });
  }
  // Zebrastreifen
  for (let i = 0; i < 8; i++) {
    wbox(5.2, 0.008, -3.6 + i * 1.05, 2.6, 0.02, 0.5, 0x6b6588, { cast: false });
  }

  // Pfützen, die das Neonlicht spiegeln
  for (let i = 0; i < 34; i++) {
    const px = XMIN + i * 6 + rndRange(-1.6, 1.6);
    const pz = rndRange(-3.4, 3.4);
    const m = new THREE.Mesh(BOX, new THREE.MeshBasicMaterial({
      color: THEME.buildings[0], transparent: true, opacity: 0.55,
    }));
    m.scale.set(rndRange(1.4, 3.2), 0.01, rndRange(0.8, 1.8));
    m.material.opacity = 0.3;
    m.position.set(px, 0.012, pz);
    world.add(m);
  }
  // Asphalt-Flicken
  for (let i = 0; i < 48; i++) {
    wbox(XMIN + i * 4 + rndRange(-1.5, 1.5), 0.006, rndRange(-4, 4),
      rndRange(1, 3), 0.012, rndRange(0.6, 2), THEME.road,
      { cast: false, receive: false });
  }

  // Gullideckel
  wbox(-2.5, 0.01, 1.2, 1.1, 0.02, 1.1, 0x1b1928, { cast: false });

  // Häuserzeile (Rückseite)
  const buildings = [];
  let bx = XMIN - 12;
  while (bx < XMAX + 18) {
    const w = rndRange(5, 9);
    const h = rndRange(3.6, 6.4);
    const d = rndRange(5, 8);
    buildings.push({ x: bx + w / 2, w, h, d, col: choose(THEME.buildings) });
    bx += w + rndRange(0.4, 1.6);
  }

  for (const b of buildings) {
    wbox(b.x, b.h / 2, -8.8 - b.d / 2, b.w, b.h, b.d, b.col);
    // Dachkante
    wbox(b.x, b.h + 0.15, -8.8 - b.d / 2, b.w + 0.3, 0.3, b.d + 0.3, 0x52466d);
    // Dachaufbau
    if (rnd() > 0.45) {
      wbox(b.x + rndRange(-1.5, 1.5), b.h + 0.9, -8.8 - b.d / 2 + rndRange(-1, 1),
        rndRange(1.2, 2.4), 1.4, rndRange(1.2, 2.2), 0x3b3350);
    }
    // Feuerleitern als Detail
  if (rnd() > 0.45) {
    const fx = b.x + rndRange(-1.2, 1.2);
    const fy = rndRange(3.4, Math.max(4, b.h - 3));
    wbox(fx, fy, -8.45, 1.9, 0.12, 0.9, 0x1b1728, { cast: false });
    wbox(fx, fy + 0.55, -8.0, 1.9, 0.08, 0.08, 0x1b1728, { cast: false });
    wbox(fx, fy + 1.35, -8.45, 1.9, 0.12, 0.9, 0x1b1728, { cast: false });
    wbox(fx + 0.9, fy + 0.95, -8.45, 0.1, 1.0, 0.1, 0x1b1728, { cast: false });
    wbox(fx - 0.9, fy + 0.95, -8.45, 0.1, 1.0, 0.1, 0x1b1728, { cast: false });
  }

  // Erdgeschoss: Ladenfront mit warmem Licht
    wbox(b.x, 1.25, -8.72, b.w - 0.25, 2.5, 0.2, 0x211b34, { cast: false });
    const shopW = Math.max(1.0, b.w * 0.3);
    const shopX = b.x + rndRange(-0.9, 0.9);
    const shopCol = choose([0xc98a45, 0xd9a866, 0x8c6bb0, 0xb8794e]);
    wbox(shopX, 1.05, -8.62, shopW + 0.16, 1.5, 0.06, 0x141124, { cast: false });
    wbox(shopX, 1.05, -8.59, shopW, 1.3, 0.05, shopCol, { glow: true, cast: false });
    wbox(shopX, 1.05, -8.56, 0.09, 1.3, 0.04, 0x211b34, { cast: false });
    wbox(shopX, 1.42, -8.56, shopW, 0.09, 0.04, 0x211b34, { cast: false });
    wbox(shopX, 2.02, -8.56, shopW + 0.3, 0.24, 0.5, 0x2c2340, { cast: false });
    // Stockwerk-Sims
    for (let y = 3.2; y < b.h - 1; y += 3.8) {
      wbox(b.x, y, -8.74, b.w - 0.1, 0.16, 0.18, 0x4b4066, { cast: false });
    }
  }

  // Mond
  const moon = new THREE.Mesh(
    new THREE.CircleGeometry(2.6, 24),
    new THREE.MeshBasicMaterial({ color: 0xfff2d8, fog: false }),
  );
  moon.position.set(26, 21, -45);
  world.add(moon);

  // Ferne Skyline (vom Nebel verschluckt = Tiefe)
  for (let x = -40; x < XMAX + 40; x += 6.5) {
    const sh = rndRange(5, 14);
    wbox(x + rndRange(-1, 1), sh / 2, -34 - rndRange(0, 8),
      rndRange(4.5, 8), sh, 6, choose(THEME.skyline),
      { cast: false, receive: false });
  }

  // Fenster als ein einziges InstancedMesh
  const winGeo = WIN_GEO;
  const winMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const slots = [];
  for (const b of buildings) {
    for (let y = 2.2; y < b.h - 1.2; y += 1.9) {
      for (let x = b.x - b.w / 2 + 0.9; x < b.x + b.w / 2 - 0.7; x += 1.5) {
        slots.push({ x, y, on: rnd() > 0.42 });
      }
    }
  }
  const wins = new THREE.InstancedMesh(winGeo, winMat, slots.length);
  const dummy = new THREE.Object3D();
  const warm = [0xffc36b, 0xffd99a, 0xffa94d];
  const cool = [0x64e6ff, 0x8f7bff, 0xff5fa8];
  slots.forEach((s, i) => {
    dummy.position.set(s.x, s.y, -8.72);
    dummy.updateMatrix();
    wins.setMatrixAt(i, dummy.matrix);
    const c = s.on ? new THREE.Color(choose(rnd() > 0.6 ? cool : warm)) : new THREE.Color(0x1a1730);
    wins.setColorAt(i, c);
  });
  wins.instanceMatrix.needsUpdate = true;
  if (wins.instanceColor) wins.instanceColor.needsUpdate = true;
  world.add(wins);

  // Neonschilder
  const neon = THEME.neon;
  let ni = 0;
  for (let x = XMIN - 4; x < XMAX; x += 9.0) {
    ni++;
    x += rndRange(-1.4, 1.4);
    const y = rndRange(3.5, 7.0);
    const c = choose(neon);
    const w = rndRange(1.2, 2.2);
    wbox(x, y, -8.66, w + 0.3, 0.86, 0.12, 0x14111f, { cast: false });
    wbox(x, y, -8.57, w, 0.32, 0.06, c, { glow: true, cast: false });
    if (ni % 3 === 0) {
      const l = new THREE.PointLight(c, 7, 9, 2);
      l.position.set(x, y, -7.9);
      world.add(l);
    }
  }

  // Straßenlaternen + Requisiten
  buildProps();
  buildCars();
}

/* --------------------------- Requisiten ---------------------------------- */
const destructibles = [];

// Einheitliches Requisiten-Register: alles hier landet in `destructibles` und
// kann von Schlägen, Spezial und Bazooka beschädigt bzw. zerstört werden.
function registerProp(kind, x, z, meshes, opt = {}) {
  const d = {
    kind, x, z, dead: false,
    hp: opt.hp || 1, maxhp: opt.hp || 1,
    halfW: opt.halfW || 0.45, halfD: opt.halfD || 0.45,
    y: opt.y || 0.6,
    colors: opt.colors || [0x7a5a35, 0x4f3a22, 0xd9a04a],
    meshes, light: opt.light || null, carBlock: opt.carBlock || null,
    isCar: !!opt.isCar,
    stage: 0, dmgParts: [[], [], []], smokeT: 0,
    baseLight: opt.light ? opt.light.intensity : 0,
  };
  destructibles.push(d);
  return d;
}

// Ein Schadenspart hängt an einer Stufe (1–3) und wird erst mit ihr sichtbar.
function damagePart(d, stage, mesh) {
  mesh.visible = false;
  d.meshes.push(mesh);
  d.dmgParts[stage - 1].push(mesh);
  return mesh;
}

// Riss als dünner dunkler Voxel; `top` liegt flach auf einer Oberseite.
function crackLine(d, stage, x, y, z, len, rot = 0, top = false) {
  const m = new THREE.Mesh(BOX, bas(0x100c16));
  if (top) {
    m.scale.set(len, 0.035, 0.045);
    m.rotation.y = rot;
  } else {
    m.scale.set(len, 0.045, 0.03);
    m.rotation.z = rot;
  }
  m.position.set(x, y, z);
  m.castShadow = false;
  m.receiveShadow = false;
  world.add(m);
  return damagePart(d, stage, m);
}

function addCarDamage(d) {
  const x = d.x, z = d.z, col = d.colors[0], side = z + 0.96;
  // Stufe 1: erste Risse an Tür, Haube und Frontscheibe.
  crackLine(d, 1, x - 0.9, 0.58, side, 0.62, 0.32);
  crackLine(d, 1, x - 0.35, 0.5, side, 0.42, -0.55);
  crackLine(d, 1, x - 0.35, 0.864, z + 0.28, 0.58, 0.45, true);
  crackLine(d, 1, x + 0.15, 1.2, z + 0.936, 0.42, -0.4);
  // Stufe 2: Stoßstange hängt, mehr Risse, rußige Delle.
  crackLine(d, 2, x + 0.75, 0.6, side, 0.5, -0.45);
  crackLine(d, 2, x + 1.55, 0.48, side, 0.36, 0.7);
  crackLine(d, 2, x - 0.25, 0.864, z - 0.18, 0.44, -0.6, true);
  crackLine(d, 2, x + 0.1, 1.3, z + 0.936, 0.32, 0.55);
  const bumper = damagePart(d, 2, wbox(x + 2.28, 0.32, z, 1.6, 0.16, 0.22, col, { cast: false }));
  bumper.rotation.z = 0.17;
  const dent = damagePart(d, 2, wbox(x + 1.55, 0.62, side + 0.01, 0.7, 0.26, 0.02, 0x19141f, { cast: false }));
  dent.rotation.z = -0.08;
  // Stufe 3: Haube aufgerissen, Kabine schief, Glut im Motorraum.
  const hood = damagePart(d, 3, wbox(x + 1.15, 0.97, z, 1.5, 0.1, 1.42, col));
  hood.rotation.z = 0.27;
  damagePart(d, 3, wbox(x + 1.1, 0.855, z, 1.3, 0.04, 1.32, 0x14111b, { cast: false }));
  damagePart(d, 3, wbox(x + 1.05, 0.92, z + 0.35, 0.18, 0.08, 0.18, 0xff6f2a, { glow: true, cast: false }));
  crackLine(d, 3, x + 1.2, 1.24, z + 0.936, 0.5, -0.25);
}

function addLampDamage(d) {
  const x = d.x, z = d.z + 1.325;
  // Risse im Leuchtenglas und ein herunterhängendes Bruchstück.
  crackLine(d, 1, x - 0.16, 4.72, z, 0.2, 0.6);
  crackLine(d, 1, x + 0.06, 4.7, z, 0.17, -0.55);
  crackLine(d, 1, x + 0.13, 4.77, z, 0.1, 1.25);
  const soot = damagePart(d, 1, wbox(x - 0.02, 4.79, z + 0.01, 0.42, 0.12, 0.02, 0x1a141c, { cast: false }));
  soot.rotation.z = 0.12;
  const shard = damagePart(d, 1, wbox(x + 0.2, 4.4, d.z + 1.08, 0.3, 0.07, 0.07, 0x2f2b42, { cast: false }));
  shard.rotation.z = -0.55;
}

function addBenchDamage(d) {
  const x = d.x, z = d.z;
  crackLine(d, 1, x - 0.55, 0.624, z + 0.08, 0.58, 0.28, true);
  crackLine(d, 1, x + 0.2, 0.624, z - 0.12, 0.4, -0.6, true);
  const board = damagePart(d, 1, wbox(x + 0.86, 0.46, z + 0.24, 0.56, 0.08, 0.34, 0x7a5a35));
  board.rotation.z = -0.4;
  board.rotation.y = 0.18;
  damagePart(d, 1, wbox(x + 0.65, 0.64, z - 0.05, 0.26, 0.03, 0.06, 0xd9a04a, { cast: false }));
  damagePart(d, 1, wbox(x - 0.8, 0.64, z + 0.14, 0.18, 0.03, 0.04, 0xd9a04a, { cast: false }));
}


function lamp(x) {
  const z = -5.4;
  const meshes = [
    wbox(x, 2.4, z, 0.16, 4.8, 0.16, 0x2f2b42),
    wbox(x, 4.85, z + 0.55, 0.16, 0.16, 1.2, 0x2f2b42),
    wbox(x, 4.72, z + 1.15, 0.7, 0.22, 0.34, 0xffd08a, { glow: true }),
    wbox(x, 0.45, z, 0.5, 0.2, 0.5, 0x3b3654),
  ];
  const l = new THREE.PointLight(0xffb066, 7, 9, 2);
  l.position.set(x, 4.6, z + 1.1);
  world.add(l);
  const d = registerProp('lamp', x, z, meshes, {
    hp: 2, halfW: 0.45, halfD: 0.45, y: 2.6, light: l,
    colors: [0xffd08a, 0xfff1b8, 0x9fe8ff],
  });
  addLampDamage(d);
}

function trashCan(x, z) {
  registerProp('trash', x, z, [
    wbox(x, 0.62, z, 0.66, 1.0, 0.66, 0x3f4a5a),
    wbox(x, 1.18, z, 0.78, 0.14, 0.78, 0x55637a),
    wbox(x, 0.95, z, 0.72, 0.1, 0.72, 0x2b3340),
  ], { hp: 1, halfW: 0.4, halfD: 0.4, y: 0.7, colors: [0x3f4a5a, 0x55637a, 0x9fb0c8] });
}

function barrel(x, z) {
  registerProp('barrel', x, z, [
    wbox(x, 0.55, z, 0.7, 1.1, 0.7, 0x8c3b3b),
    wbox(x, 0.35, z, 0.76, 0.14, 0.76, 0x5e2626),
    wbox(x, 0.85, z, 0.76, 0.14, 0.76, 0x5e2626),
  ], { hp: 1, halfW: 0.45, halfD: 0.45, y: 0.55, colors: [0x8c3b3b, 0xff8f4a, 0x5e2626] });
}

function crate(x, z, s = 1) {
  registerProp('crate', x, z, [
    wbox(x, 0.45 * s, z, 0.9 * s, 0.9 * s, 0.9 * s, 0x7a5a35),
    wbox(x, 0.45 * s, z, 0.94 * s, 0.12 * s, 0.94 * s, 0x4f3a22),
  ], { hp: 1, halfW: 0.5 * s, halfD: 0.5 * s, y: 0.5 * s, colors: [0x7a5a35, 0x4f3a22, 0xd9a04a] });
}

function dumpster(x, z) {
  registerProp('dumpster', x, z, [
    wbox(x, 0.8, z, 2.2, 1.4, 1.1, 0x2f6b4a),
    wbox(x, 1.55, z, 2.3, 0.16, 1.2, 0x3d8a5f),
    wbox(x - 0.7, 0.25, z, 0.3, 0.5, 0.3, 0x1d1b28),
    wbox(x + 0.7, 0.25, z, 0.3, 0.5, 0.3, 0x1d1b28),
  ], { hp: 2, halfW: 1.15, halfD: 0.65, y: 0.8, colors: [0x2f6b4a, 0x3d8a5f, 0x9fb0c8] });
}

function hydrant(x, z) {
  registerProp('hydrant', x, z, [
    wbox(x, 0.35, z, 0.34, 0.7, 0.34, 0xc0392b),
    wbox(x, 0.78, z, 0.44, 0.16, 0.44, 0xe04a37),
    wbox(x, 0.5, z, 0.6, 0.12, 0.22, 0xa32d20),
  ], { hp: 1, halfW: 0.4, halfD: 0.35, y: 0.45, colors: [0xc0392b, 0xe04a37, 0x9fe8ff] });
}

function cone(x, z) {
  registerProp('cone', x, z, [
    wbox(x, 0.28, z, 0.4, 0.4, 0.4, 0xff7a1a),
    wbox(x, 0.6, z, 0.26, 0.34, 0.26, 0xff7a1a),
    wbox(x, 0.42, z, 0.42, 0.1, 0.42, 0xf2f2f2, { cast: false }),
  ], { hp: 1, halfW: 0.35, halfD: 0.35, y: 0.35, colors: [0xff7a1a, 0xf2f2f2, 0xd9a04a] });
}

function bench(x, z) {
  const d = registerProp('bench', x, z, [
    wbox(x, 0.55, z, 2.0, 0.14, 0.7, 0x7a5a35),
    wbox(x, 0.9, z - 0.32, 2.0, 0.5, 0.12, 0x7a5a35),
    wbox(x - 0.8, 0.28, z, 0.16, 0.5, 0.6, 0x3b3654),
    wbox(x + 0.8, 0.28, z, 0.16, 0.5, 0.6, 0x3b3654),
  ], { hp: 2, halfW: 1.05, halfD: 0.5, y: 0.65, colors: [0x7a5a35, 0x4f3a22, 0xd9a04a] });
  addBenchDamage(d);
}

// Schaden an Requisiten: kleine Props fallen mit einem Treffer, Autos,
// Laternen und Bänke brauchen mehrere (schwere Treffer zählen doppelt).
function damageProp(d, amount, p) {
  if (!d || d.dead) return false;
  d.hp -= amount;
  if (d.hp > 0) {
    burst(d.x + rndRange(-0.3, 0.3), (d.y || 0.6) + rndRange(-0.2, 0.2), d.z,
      d.colors || [0xffffff, 0xffd76e], 10, 3, 0.09);
    impact(d.x, d.y || 0.6, d.z, 0xffffff, 0.36);
    shake = Math.max(shake, 0.07);
    shakeT = Math.max(shakeT, 0.14);
    sfx.hit();
    refreshPropDamage(d, true);
    return false;
  }
  smashProp(d, p);
  return true;
}

// Sichtbare Schadensstufe: Autos 1–3, Laternen und Bänke eine Stufe.
function refreshPropDamage(d, hit = false) {
  if (!d || d.dead || !d.dmgParts) return;
  const stage = d.isCar ? clamp(d.maxhp - d.hp, 0, 3)
    : (d.kind === 'lamp' || d.kind === 'bench') ? (d.hp < d.maxhp ? 1 : 0) : 0;
  if (stage === d.stage) return;
  const firstDamage = d.stage === 0;
  d.stage = stage;
  if (firstDamage) d.smokeT = smokeRand(0.15, 0.6);
  for (let i = 0; i < d.dmgParts.length; i++) {
    for (const m of d.dmgParts[i]) m.visible = i < stage;
  }
  if (d.isCar) {
    const cab = d.meshes[1];
    if (cab) cab.rotation.z = stage >= 3 ? -0.06 : stage >= 2 ? -0.025 : 0;
  } else if (d.kind === 'bench') {
    const back = d.meshes[1];
    if (back) back.rotation.z = 0.05;
  } else if (d.kind === 'lamp' && d.light) {
    d.light.intensity = d.baseLight * 0.45;
  }
  if (!hit) return;
  // Trefferfeedback passend zum Werkstoff.
  if (d.isCar) {
    smokePuff(d.x + 1.1, 0.95, d.z + 0.5, 0xcac4d6, 0.42, 1.2, 0.75);
    burst(d.x + 0.4, 0.9, d.z + 0.4, [0x9a8f9f, 0x3a3342], 6, 2.2, 0.07);
  } else if (d.kind === 'lamp') {
    burst(d.x, 4.55, d.z + 1.05, [0x9fe8ff, 0xfff1b8], 8, 3.2, 0.06);
    smokePuff(d.x, 4.9, d.z + 1.0, 0xd6d0e0, 0.32, 1.1, 0.6);
  } else if (d.kind === 'bench') {
    burst(d.x, 0.72, d.z, [0x7a5a35, 0xd9a04a], 8, 2.4, 0.08);
    smokePuff(d.x, 0.95, d.z + 0.25, 0xd8c6a2, 0.3, 1.0, 0.45);
  }
}

// Rauch und Flackern der beschädigten Requisiten; läuft mit dem Spieltempo.
function updatePropDamageVisuals(dt) {
  for (const d of destructibles) {
    if (d.dead || !d.stage) continue;
    // Nur in Kameranähe rauchen, damit die Straße nicht überall qualmt.
    if (Math.abs(d.x - camX) > 32) continue;
    if (d.kind === 'lamp' && d.light) {
      const t = performance.now() * 0.001;
      const f = 0.38 + 0.22 * Math.sin(t * 13 + d.x)
        - (Math.sin(t * 37 + d.x * 3) > 0.55 ? 0.22 : 0);
      d.light.intensity = d.baseLight * clamp(f, 0.12, 0.72);
    }
    d.smokeT -= dt;
    if (d.smokeT > 0) continue;
    if (d.isCar) {
      d.smokeT = (d.stage === 3 ? 0.35 : d.stage === 2 ? 0.6 : 1.0) * smokeRand(0.8, 1.2);
      smokePuff(d.x + smokeRand(0.2, 1.3), 0.98 + d.stage * 0.05, d.z + smokeRand(0.35, 0.85),
        d.stage === 3 ? 0xb9b2c4 : d.stage === 2 ? 0xcac4d6 : 0xded8e8,
        0.34 + d.stage * 0.07, 1.5, 0.65);
      if (d.stage === 3 && Math.random() < 0.45) {
        smokePuff(d.x - 0.4, 1.2, d.z + 0.5, 0xb0a9bd, 0.5, 1.6, 0.7);
      }
      if (d.stage === 3 && Math.random() < 0.4) {
        burst(d.x + 1.0, 0.95, d.z, [0xff8f4a, 0xffd76e], 2, 1.4, 0.05);
      }
    } else if (d.kind === 'lamp') {
      d.smokeT = smokeRand(0.55, 0.85);
      smokePuff(d.x + smokeRand(-0.1, 0.15), 4.88, d.z + smokeRand(0.95, 1.15),
        0xd6d0e0, 0.32, 1.3, 0.5);
      if (Math.random() < 0.35) {
        burst(d.x, 4.5, d.z + 1.08, [0x9fe8ff, 0xfff1b8], 2, 1.5, 0.04);
      }
    } else if (d.kind === 'bench') {
      d.smokeT = smokeRand(0.8, 1.3);
      smokePuff(d.x + smokeRand(-0.6, 0.6), 0.92, d.z + smokeRand(0.1, 0.4),
        0xd8c6a2, 0.32, 1.4, 0.45);
    }
  }
  updateSmokePuffs(dt);
}

// Requisiten zerbrechen, wenn sie genug Schaden genommen haben.
function smashProp(d, p) {
  if (d.dead) return;
  d.dead = true;
  for (const m of d.meshes || []) if (m && m.parent) m.parent.remove(m);
  if (d.light && d.light.parent) d.light.parent.remove(d.light);
  if (d.carBlock) {
    const i = carBlocks.indexOf(d.carBlock);
    if (i >= 0) carBlocks.splice(i, 1);
  }
  const cols = d.colors || [0x7a5a35, 0x4f3a22, 0xd9a04a];
  const y = d.y || 0.7;

  if (d.isCar) {
    // Auto explodiert: Wrack bleibt stehen, Trümmer und Schockwellen.
    burst(d.x, 0.9, d.z, [0xffb347, 0xff6f2a, 0x14121c, 0xfff1b8], 42, 8, 0.14);
    ring(d.x, 0.5, d.z, 0xff8f4a, 4.5, 0.5);
    ring(d.x, 1.0, d.z, 0xffd76e, 2.6, 0.36);
    screenFlash('#ffb066', 0.45, 0.28);
    shake = 0.5; shakeT = 0.5; hitstop = 0.12;
    sfx.boom();
    startCarAlarm(d.x, d.z);
    // Ausgebranntes Wrack: Karosserie, leere Kabine, Reifen und Glut bleiben liegen.
    wbox(d.x, 0.2, d.z, 3.8, 0.4, 1.5, 0x2a2530);
    wbox(d.x + 0.15, 0.52, d.z, 2.4, 0.42, 1.6, 0x3b3440);
    wbox(d.x - 0.35, 0.9, d.z, 1.5, 0.4, 1.35, 0x332c3a, { cast: false });
    wbox(d.x - 0.35, 0.9, d.z + 0.68, 1.2, 0.24, 0.06, 0x15121c, { cast: false });
    for (const dx of [-1.45, 1.25]) {
      for (const dz of [-0.82, 0.82]) {
        wbox(d.x + dx, 0.26, d.z + dz, 0.6, 0.46, 0.24, 0x1a1720, { cast: false });
      }
    }
    // Glut auf Motorhaube und Dach: bleibt als Feuerstelle sichtbar.
    wbox(d.x + 0.85, 0.82, d.z, 0.36, 0.3, 0.36, 0xff6f2a, { glow: true, cast: false });
    wbox(d.x + 0.85, 0.99, d.z, 0.2, 0.22, 0.2, 0xffd76e, { glow: true, cast: false });
    wbox(d.x - 0.45, 1.1, d.z, 0.26, 0.18, 0.26, 0xff8f4a, { glow: true, cast: false });
    for (let i = 0; i < 9; i++) {
      const ey = i < 6 ? rndRange(0.72, 0.95) : rndRange(0.14, 0.28);
      wbox(d.x + rndRange(-1.5, 1.5), ey, d.z + rndRange(-0.55, 0.55),
        0.17, 0.12, 0.17, i % 2 ? 0xff8f4a : 0xffd76e, { glow: true, cast: false });
    }
    for (const e of enemies) {
      if (e.dead || e.state === 'ko') continue;
      if (Math.hypot(e.pos.x - d.x, e.pos.z - d.z) < 3.6) {
        damageEnemy(e, 55, true, Math.sign(e.pos.x - d.x) || 1, 8, p || P);
      }
    }
    spawnPickup('gold', d.x, clamp(d.z, -1.4, 1.4));
  } else if (d.kind === 'lamp') {
    burst(d.x, 3.0, d.z, cols, 30, 5, 0.1);
    burst(d.x, 0.8, d.z, [0xffd08a, 0xfff1b8], 14, 3.5, 0.08);
    ring(d.x, 3.4, d.z, 0xfff1b8, 2.0, 0.3);
    screenFlash('#fff1b8', 0.14, 0.14);
    shake = 0.16; shakeT = 0.24;
    sfx.glass();
    // Abgeknickter Mast liegt auf dem Gehweg, die Lampe ist zerbrochen.
    wbox(d.x, 0.18, d.z, 0.5, 0.35, 0.5, 0x3b3654);
    wbox(d.x + 1.15, 0.1, d.z + 0.35, 2.3, 0.14, 0.14, 0x2f2b42);
    wbox(d.x + 2.25, 0.2, d.z + 0.42, 0.3, 0.22, 0.3, 0xffd08a, { glow: true, cast: false });
    for (let i = 0; i < 4; i++) {
      wbox(d.x + rndRange(0.4, 2.2), 0.09, d.z + rndRange(-0.1, 0.7),
        0.12, 0.06, 0.12, 0x9fe8ff, { glow: true, cast: false });
    }
  } else {
    burst(d.x, y, d.z, cols, d.kind === 'bench' ? 24 : 18, 4, 0.1);
    ring(d.x, 0.35, d.z, 0xffd76e, 1.5, 0.2);
    shake = Math.max(shake, 0.06);
    shakeT = Math.max(shakeT, 0.12);
    sfx.hit();
    if (d.kind === 'bench') {
      // Zerbrochene Bretter bleiben auf dem Gehweg liegen.
      wbox(d.x - 0.55, 0.1, d.z + 0.1, 1.5, 0.16, 0.5, 0x4f3a22, { cast: false });
      wbox(d.x + 0.6, 0.08, d.z - 0.2, 1.1, 0.14, 0.42, 0x7a5a35, { cast: false });
    }
  }

  addMeter(p, 3);
  const cfg = diffCfg();
  if (Math.random() < cfg.propDrop) {
    const r = Math.random();
    spawnPickup(r < 0.45 ? 'doner' : r < 0.72 ? 'ayran' : 'gold', d.x, clamp(d.z, -1.4, 1.4));
  }
  if (Math.random() < cfg.propWeapon) {
    spawnPickup('weapon', d.x + rndRange(-0.6, 0.6), clamp(d.z, -1.4, 1.4));
  }
}

function buildProps() {
  for (let x = XMIN - 4; x < XMAX + 10; x += 11.5) lamp(x);
  const layout = [
    { fn: trashCan, z: -5.2 }, { fn: crate, z: -5.0 }, { fn: dumpster, z: -6.2 },
    { fn: bench, z: -6.0 }, { fn: hydrant, z: 5.7 }, { fn: cone, z: 5.9 },
  ];
  for (let x = XMIN - 2; x < XMAX + 8; x += 7.3) {
    const it = layout[Math.floor(rnd() * layout.length)];
    it.fn(x + rndRange(-1, 1), it.z);
    if (rnd() > 0.6) barrel(x + rndRange(1.5, 3), rnd() > 0.5 ? 4.6 : -4.4);
  }
  // Zerbrechliche Requisiten am Rand der Laufgasse: dort kommt man mit
  // Schlägen ran, und sie lassen garantiert Döner/Ayran/Gold fallen.
  for (let x = XMIN + 16; x < XMAX - 8; x += 21) {
    if (rnd() > 0.45) barrel(x + rndRange(-1.2, 1.2), rnd() > 0.5 ? 2.15 : -2.15);
    else crate(x + rndRange(-1.2, 1.2), rnd() > 0.5 ? 2.15 : -2.15);
  }
}

/* ------------------------------ Autos ------------------------------------ */
const carBlocks = [];
function car(x, z, col) {
  const block = { x1: x - 2.4, x2: x + 2.4, z1: z - 1.1, z2: z + 1.1 };
  carBlocks.push(block);
  const meshes = [
    wbox(x, 0.55, z, 4.4, 0.6, 1.9, col),
    wbox(x - 0.3, 1.15, z, 2.2, 0.6, 1.75, col),
    wbox(x - 0.3, 1.15, z + 0.9, 2.0, 0.42, 0.06, 0x9fd8ff, { glow: false }),
    wbox(x - 0.3, 1.15, z - 0.9, 2.0, 0.42, 0.06, 0x9fd8ff),
    wbox(x + 2.2, 0.55, z + 0.6, 0.2, 0.24, 0.3, 0xffe9b0, { glow: true, cast: false }),
    wbox(x + 2.2, 0.55, z - 0.6, 0.2, 0.24, 0.3, 0xffe9b0, { glow: true, cast: false }),
  ];
  for (const dx of [-1.5, 1.4]) {
    for (const dz of [-0.85, 0.85]) {
      meshes.push(wbox(x + dx, 0.28, z + dz, 0.7, 0.56, 0.28, 0x14121c));
    }
  }
  const d = registerProp('car', x, z, meshes, {
    hp: 4, halfW: 2.25, halfD: 1.05, y: 0.7, isCar: true, carBlock: block,
    colors: [col, 0x14121c, 0xff8f4a, 0xffd76e],
  });
  addCarDamage(d);
}
function blockedByCar(x, z, r = 0.45) {
  for (const b of carBlocks) {
    if (x > b.x1 - r && x < b.x2 + r && z > b.z1 - r && z < b.z2 + r) return true;
  }
  return false;
}

function buildCars() {
  carBlocks.length = 0;
  const cols = [0x2f5d8c, 0x7a2f4a, 0x2f7a5a, 0x5a4a2f, 0x4a2f5a];
  let i = 0;
  for (let x = -4.5; x < XMAX - 6; x += 24) {
    car(x + rndRange(-2, 2), -4.0, cols[i % cols.length]);
    i++;
  }
}

/* ----------------------------- Auto-Alarm -------------------------------- */
// Ein zerstörtes Auto heult kurz auf: rot/blaue Warnlichter am Wrack, ein
// Zweiklang alle ~0,6 s und eine Bodenwelle. Gegner in der Nähe lassen für die
// Dauer ihren Spieler stehen und laufen zum Wrack – Bosse bleiben unbeirrt.
const CAR_ALARM_TIME = 3.6;
const CAR_ALARM_RADIUS = 13;
const CAR_ALARM_LURE_SPEED = 1.45;
// Der Alarm ruft eine kleine Verstärkungswelle herbei: höchstens zwei Trupps
// pro Abschnitt, 14 s Abstand, damit mehrere Wracks nicht die Straße fluten.
const ALARM_SQUAD_CD = 14;
const ALARM_SQUADS_PER_SECTION = 2;
const ALARM_SQUAD_MAX_ALIVE = 18;
const carAlarms = [];
let alarmSquadCd = 0;
let alarmSquadsLeft = ALARM_SQUADS_PER_SECTION;

function startCarAlarm(x, z) {
  // Zwei Warnleuchten auf dem Dach, jeweils mit schmaler Lichtsäule, damit der
  // Alarm auch hinter einer Gruppe Gegner noch auffällt.
  const build = (color, dz) => {
    const lamp = wbox(x - 0.35, 1.48, z + dz, 0.34, 0.22, 0.34, color, { glow: true, cast: false });
    const beam = new THREE.Mesh(BOX, new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    beam.scale.set(0.3, 2.6, 0.3);
    beam.position.set(x - 0.35, 2.8, z + dz * 0.7);
    world.add(beam);
    return [lamp, beam];
  };
  const red = build(0xff2f6d, 0.34);
  const blue = build(0x6be0ff, -0.34);
  const beams = [red[1], blue[1]];
  carAlarms.push({ x, z, t: CAR_ALARM_TIME, pulse: 0.62, red, blue, beams, lights: red.concat(blue) });
  ring(x, 0.2, z, 0xff2f6d, 5.4, 0.5);
  sfx.alarm();
  toast('AUTO-ALARM');
  // Verstärkung: nur mitten in einem laufenden Abschnitt, nicht nach dem
  // Räumen und nicht während der Sieges-/Distriktsequenz.
  const alive = enemies.filter((e) => !e.dead).length;
  if (waveActive && !districtCleared && !victory &&
      alarmSquadCd <= 0 && alarmSquadsLeft > 0 && alive < ALARM_SQUAD_MAX_ALIVE) {
    alarmSquadCd = ALARM_SQUAD_CD;
    alarmSquadsLeft -= 1;
    spawnAlarmSquad(x);
  }
}

// Kleine Gegnerwelle aus beiden Straßenrichtungen. Sie rennt zuerst zum
// heulenden Wrack (der Alarm lockt), danach wieder auf die Spieler.
function spawnAlarmSquad(x) {
  const sec = wave % 3;
  const [lo, hi] = SECTION_BOUNDS[sec] || SECTION_BOUNDS[0];
  const district = WAVE_DEFS[wave] ? WAVE_DEFS[wave].district : 0;
  const pool = district >= 6 ? ['punk', 'runner', 'knife', 'guard']
    : district >= 3 ? ['punk', 'runner', 'knife']
    : ['punk', 'runner'];
  // Bosswellen bekommen nur zwei Verstärker, damit der Boss lesbar bleibt.
  const count = wave % 3 === 2 ? 2 : 3;
  const cfg = diffCfg();
  const scale = (1 + wave * 0.035) * cfg.hp;
  let spawned = 0;
  for (let i = 0; i < count; i++) {
    const side = i % 2 ? 1 : -1;
    // Staffelung, damit zwei Trupps derselben Straßenseite nicht aufeinander
    // spawnen (an den Abschnittsgrenzen würde der Clamp sie sonst stapeln).
    const span = 7.5 + i * 1.8;
    const inside = (v) => v >= lo + 2 && v <= hi - 3;
    const preferred = x + side * span, mirrored = x - side * span;
    let sx = clamp(inside(preferred) ? preferred : inside(mirrored) ? mirrored : preferred,
      lo + 2, hi - 3) + rndRange(-0.4, 0.4);
    // Aus der Fahrbahnmitte kommen, nicht vom Bordstein des Wracks.
    let sz = clamp(rndRange(-1.6, 1.6), -LANE + 0.15, LANE - 0.15);
    // Nicht direkt auf einem Spieler materialisieren.
    for (const pl of players) {
      if (pl.dead || Math.hypot(sx - pl.pos.x, sz - pl.pos.z) >= 3) continue;
      sx = clamp(sx + (sx >= pl.pos.x ? 3 : -3), lo + 2, hi - 3);
      sz = clamp(sz + 1.4, -LANE + 0.15, LANE - 0.15);
    }
    const e = spawnEnemy(pool[(i + district) % pool.length], sx, sz);
    if (!e) continue;
    e.sec = sec;
    e.maxhp = Math.round(e.maxhp * scale);
    e.hp = e.maxhp;
    e.cd = rndRange(0.5, 1.1);
    e.alarmSquad = true;
    ring(sx, 0.2, sz, 0xff2f6d, 1.9, 0.3);
    ring(sx, 0.8, sz, 0x6be0ff, 1.4, 0.22);
    burst(sx, 0.9, sz, [0xff2f6d, 0x6be0ff, 0xffffff], 12, 3.2, 0.09);
    spawned += 1;
  }
  if (!spawned) return 0;
  banner('ALARM · VERSTÄRKUNG');
  shake = Math.max(shake, 0.12);
  shakeT = Math.max(shakeT, 0.18);
  sfx.wave();
  return spawned;
}

function nearestCarAlarm(x, z) {
  let best = null, bd = CAR_ALARM_RADIUS;
  for (const a of carAlarms) {
    const d = Math.hypot(a.x - x, a.z - z);
    if (d < bd) { bd = d; best = a; }
  }
  return best;
}

function updateCarAlarms(dt) {
  if (alarmSquadCd > 0) alarmSquadCd = Math.max(0, alarmSquadCd - dt);
  for (let i = carAlarms.length - 1; i >= 0; i--) {
    const a = carAlarms[i];
    a.t -= dt;
    a.pulse -= dt;
    const hot = Math.sin(a.t * 19) > 0;
    for (const m of a.red) m.visible = hot;
    for (const m of a.blue) m.visible = !hot;
    if (a.pulse <= 0) {
      a.pulse = 0.62;
      ring(a.x, 0.16, a.z, hot ? 0xff2f6d : 0x6be0ff, 4.8, 0.42);
      sfx.alarm();
    }
    if (a.t <= 0) {
      for (const m of a.lights) if (m && m.parent) m.parent.remove(m);
      for (const m of a.beams) m.material.dispose();
      carAlarms.splice(i, 1);
    }
  }
}

function clearCarAlarms() {
  for (const a of carAlarms) {
    for (const m of a.lights) if (m && m.parent) m.parent.remove(m);
    for (const m of a.beams) m.material.dispose();
  }
  carAlarms.length = 0;
}

/* ------------------------ Distrikte / Map-Rebuild ------------------------- */
// Alles Weltliche hängt in `world`; jede Welle räumt sie leer und baut neu.
const cachedMaterials = () => new Set([...lamCache.values(), ...basCache.values()]);

function clearWorld() {
  destructibles.length = 0;
  const shared = cachedMaterials();
  for (const child of [...world.children]) {
    world.remove(child);
    child.traverse((o) => {
      if (o.geometry && o.geometry !== BOX && o.geometry !== RING_GEO && o.geometry !== WIN_GEO) {
        o.geometry.dispose();
      }
      if (o.material && !shared.has(o.material)) {
        if (o.material.map) o.material.map.dispose();
        o.material.dispose();
      }
    });
  }
}

const WIN_GEO = new THREE.BoxGeometry(0.52, 0.66, 0.08);

// Jeder Distrikt bekommt ein eigenes Wahrzeichen, damit die Map nicht nur
// anders eingefärbt ist, sondern auch anders aussieht.
function buildLandmark(kind) {
  const n = THEME.neon;
  if (kind === 'minarett') {
    for (const x of [8, 41]) {
      wbox(x, 8, -16, 2.2, 16, 2.2, THEME.buildings[1], { cast: false });
      wbox(x, 16.4, -16, 3.0, 1.2, 3.0, THEME.buildings[2], { cast: false });
      wbox(x, 17.4, -16, 1.4, 2.2, 1.4, 0x3a3350, { cast: false });
      wbox(x, 12.6, -14.6, 2.6, 0.5, 0.5, 0x2c2540, { cast: false });
      wbox(x, 12.6, -14.35, 2.2, 0.16, 0.16, n[1], { glow: true, cast: false });
    }
  } else if (kind === 'markisen') {      for (let x = -6; x < 86; x += 6.4) {
      for (let i = 0; i < 5; i++) {
        wbox(x + i * 0.5, 2.9, -7.4, 0.5, 0.14, 2.6, i % 2 ? 0xd9b45a : 0x8a3a3a, { cast: false });
      }
      wbox(x + 1.0, 2.6, -6.2, 0.1, 0.5, 0.1, 0x2c2540, { cast: false });
    }
  } else if (kind === 'kran') {
    for (const x of [-4, 22, 48]) {
      wbox(x, 6, -20, 0.7, 12, 0.7, 0x3e4a56, { cast: false });
      wbox(x + 3, 11.6, -20, 7.2, 0.5, 0.5, 0x3e4a56, { cast: false });
      wbox(x + 6.2, 10.0, -20, 0.18, 3.2, 0.18, 0x2a3642, { cast: false });
      wbox(x + 6.2, 8.3, -20, 0.9, 0.5, 0.9, n[2], { glow: true, cast: false });
    }
    wbox(28, -0.05, -13, 92, 0.1, 9, 0x1f4a5a, { cast: false });
  } else if (kind === 'saeulen') {
    for (let i = 0; i < 9; i++) {
      const x = -6 + i * 7.6;
      wbox(x, 4.0, -14, 1.5, 8, 1.5, THEME.buildings[0], { cast: false });
      wbox(x, 8.2, -14, 2.1, 0.6, 2.1, THEME.buildings[2], { cast: false });
      wbox(x, 0.15, -12.6, 32, 0.06, 2.2, 0x2c6b6b, { glow: true, cast: false });
    }
  } else if (kind === 'palmen') {
    for (let i = 0; i < 8; i++) {
      const x = -4 + i * 8.4, z = i % 2 ? 6.0 : -6.2;
      for (let y = 0; y < 7; y++) wbox(x, 0.6 + y * 0.55, z, 0.42, 0.6, 0.42, 0x6b5233, { cast: false });
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2;
        wbox(x + Math.cos(a) * 1.1, 4.6, z + Math.sin(a) * 1.1, 2.2, 0.2, 0.5, 0x3f7a4a, { cast: false });
      }
    }
  } else if (kind === 'kuppel') {
    for (const [x, r] of [[6, 7], [34, 9], [52, 5]]) {
      for (let i = 0; i < 5; i++) {
        const rr = r * (1 - i * 0.18);
        wbox(x, 9 + i * 1.1, -15, rr, 1.2, rr, THEME.buildings[0], { cast: false });
      }
      wbox(x, 15.4, -15, 0.6, 1.6, 0.6, n[1], { glow: true, cast: false });
      wbox(x, 6.5, -11.4, r * 2.1, 0.5, 0.6, THEME.buildings[2], { cast: false });
    }
  } else if (kind === 'zypressen') {
    for (let i = 0; i < 16; i++) {
      const x = -8 + i * 4.6, z = -11 - (i % 3) * 2.4;
      const h = 5 + (i % 4) * 1.6;
      for (let y = 0; y < h; y++) {
        const t = 1 - y / h;
        wbox(x, 1.2 + y * 0.7, z, 1.6 * t + 0.3, 0.75, 1.6 * t + 0.3, 0x1f4a34, { cast: false });
      }
    }
  } else if (kind === 'amboss') {
    for (let i = 0; i < 5; i++) {
      const x = 2 + i * 12;
      wbox(x, 0.4, -6.2, 1.2, 0.8, 0.9, 0x2c2420, { cast: false });
      wbox(x, 0.9, -6.2, 1.5, 0.35, 0.7, 0x3a3230, { cast: false });
      wbox(x + 0.2, 1.0, -6.2, 0.4, 0.2, 0.5, 0xff5f2a, { glow: true, cast: false });
      wbox(x, 1.9, -9.2, 2.6, 2.4, 2.2, 0x3a201c, { cast: false });
      wbox(x, 0.9, -7.9, 1.4, 0.7, 1.0, 0xff5f2a, { glow: true, cast: false });
    }
  } else if (kind === 'grabsteine') {
    for (let i = 0; i < 26; i++) {
      const x = -8 + (i % 13) * 5.4 + (i > 12 ? 2.4 : 0);
      const z = -10.5 - Math.floor(i / 13) * 4.4;
      const h = 1.0 + (i % 4) * 0.45;
      wbox(x, h / 2, z, 1.0, h, 0.35, 0x59606e, { cast: false });
      wbox(x, h + 0.1, z, 1.2, 0.18, 0.5, 0x6b7484, { cast: false });
      if (i % 5 === 0) wbox(x, 0.35, z + 0.5, 0.4, 0.7, 0.4, 0x2a2f3a, { cast: false });
    }
  } else if (kind === 'thron') {
    for (let i = 0; i < 4; i++) wbox(54, 0.5 + i * 0.7, -12, 10 - i * 1.6, 0.7, 5 - i * 0.7, THEME.buildings[1], { cast: false });
    wbox(54, 5.2, -12, 2.4, 5.2, 2.4, 0x2a1f3a, { cast: false });
    wbox(54, 7.9, -12, 3.0, 1.0, 3.0, n[0], { glow: true, cast: false });
    for (const x of [30, 40, 48]) wbox(x, 6.5, -10.4, 0.2, 6.0, 1.6, n[0], { glow: true, cast: false });
  }
}

function applyTheme() {
  scene.background.set(THEME.fog);
  scene.fog.color.set(THEME.fog);
  scene.fog.near = 18;
  scene.fog.far = 60;
  sun.color.set(THEME.neon[1]);
  sun.intensity = 2.4;
  rim.color.set(THEME.neon[0]);
}

/* ------------------------- Abschnitte & Tore ----------------------------- */
// Jeder Distrikt ist eine lange Straße mit drei Abschnitten. Zwei Tore trennen
// sie; ein Tor öffnet sich erst, wenn der Abschnitt geräumt ist.
const SECTION_ARENA = [36, 170, 300];
const SECTION_TRIGGER = [0, 118, 228];
const SECTION_BOUNDS = [[-8, 112], [118, 222], [228, XMAX]];
const gates = [];
let builtDistrict = -1;
let wavePending = false;
let districtCleared = false;
let victory = false;
let sectionQueue = [];
let lastEnemyShown = -1;

function buildGates() {
  gates.length = 0;
  for (const gx of [114, 224, 334]) {
    const meshes = [];
    meshes.push(wbox(gx, 2.6, -5.2, 0.55, 5.2, 0.55, 0x2a2438));
    meshes.push(wbox(gx, 2.6, 5.2, 0.55, 5.2, 0.55, 0x2a2438));
    meshes.push(wbox(gx, 5.0, 0, 0.55, 0.4, 10.8, 0x2a2438));
    const bars = [];
    for (let i = 0; i < 8; i++) {
      bars.push(wbox(gx, 0.45 + i * 0.6, 0, 0.2, 0.42, 9.6, THEME.neon[0], { glow: true, cast: false }));
    }
    gates.push({ x: gx, open: false, bars, meshes });
  }
}

function openGate(index) {
  const g = gates[index];
  if (!g || g.open) return;
  g.open = true;
  for (const b of g.bars) b.visible = false;
  burst(g.x, 1.2, 0, [THEME.neon[0], 0xffffff], 26, 5, 0.11);
  ring(g.x, 0.6, 0, THEME.neon[0], 4.2, 0.5);
  screenFlash('#bfe9ff', 0.16, 0.2);
  sfx.wave();
}

// Wie weit darf man laufen? Geschlossene Tore blockieren.
function maxWalkX() {
  let mx = XMAX - 1;
  for (const g of gates) if (!g.open) mx = Math.min(mx, g.x - 1.0);
  return mx;
}

// Ende der Map-Runde: nur nach einem besiegten Boss erreichbar.
function atDistrictExit() {
  const lead = players.find((p) => !p.dead && !p.down);
  return !!lead && lead.pos.x >= 337;
}

function sectionOfWave(w) {
  return w % 3;
}

// Baut die komplette Straße für einen Distrikt neu auf.
function buildDistrict(districtIndex, waveIndex) {
  THEME = DISTRICTS[districtIndex % DISTRICTS.length];
  const def = WAVES[waveIndex % WAVES.length];
  seed = def.seed;
  // Alte Beute und besiegte Gegner der vorigen Runde entfernen.
  clearPickupMeshes();
  for (const e of enemies) { if (e.fig) scene.remove(e.fig.root); removeEnemyHpBar(e); }
  enemies.length = 0;
  for (const s of shots) scene.remove(s.m);
  shots.length = 0;
  for (const p of particles) scene.remove(p.m);
  particles.length = 0;
  clearSmokePuffs();
  destroyRings();
  clearDamageNumbers();
  clearCarAlarms();
  clearWorld();
  applyTheme();
  buildStreet();
  // Wahrzeichen dreimal über die lange Straße verteilen
  for (const off of [0, 108, 216]) {
    WOFF = off;
    buildLandmark(THEME.landmark);
  }
  WOFF = 0;
  buildGates();
  spawnMapDonkey();
  builtDistrict = districtIndex;
  wavePending = false;
  if (districtTag) {
    districtTag.textContent = `${String(districtIndex + 1).padStart(2, '0')} · ${THEME.name} — ${THEME.sub}`;
  }
}

// Spieler an den Anfang des neuen Distrikts setzen.
function placePlayersAtStart() {
  players.forEach((p, i) => {
    p.pos.set(3.5 + i * 2.2, 0, i ? 0.8 : -0.4);
    p.mount = null; p.riding = false;
    p.y = 0; p.vy = 0; p.facing = 1; p.knock = 0;
    // Ein Distriktwechsel beendet den Bodenzustand: niemand bleibt zwischen
    // zwei Straßen liegen, der Partner hätte dort keine Chance mehr zu helfen.
    p.down = false; p.downT = 0; p.reviveP = 0;
    if (p.out) {
      // Ausgeschiedene Spieler bleiben auch im nächsten Distrikt draußen.
      p.dead = true; p.hp = 0; p.state = 'ko'; p.t = 0;
      p.fig.root.visible = false;
    } else {
      p.dead = false; p.state = 'idle'; p.t = 0;
      p.hp = Math.max(p.hp, 60); p.inv = 1.2;
      p.fig.root.visible = true;
    }
    setHP(p);
    updateLives(p);
  });
  camX = 5;
}

/* ============================== FIGUREN ================================== */
function makeFigure(p, bulk = 1) {
  const s = bulk;
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  // Hüfte
  vox(body, 0, 8.2, 0, 8.4 * s, 1.9, 4.6 * s, p.pants);

  // Brustkorb (Pivot = Taille)
  const torso = new THREE.Group();
  torso.position.set(0, 9.1 * VOX, 0);
  body.add(torso);
  vox(torso, 0, 3.05, 0, 9.0 * s, 6.2, 5.0 * s, p.shirt);
  vox(torso, 0, 3.05, 2.55 * s, 4.6 * s, 4.2, 0.5, p.shirt2);
  vox(torso, 0, 0.8, 0, 8.2 * s, 1.8, 5.1 * s, p.pants);
  vox(torso, 0, 1.75, 0, 8.3 * s, 0.5, 5.2 * s, 0x14111f);

  // Kopf (Pivot = Hals)
  const head = new THREE.Group();
  head.position.set(0, 15.1 * VOX, 0);
  body.add(head);
  vox(head, 0, 2.5, 0, 4.9, 4.9, 4.9, p.skin);
  vox(head, 0, 5.0, -0.1, 5.3, 1.4, 5.3, p.hair);
  vox(head, 0, 3.1, -2.55, 4.6, 3.4, 0.8, p.hair);
  vox(head, 1.3, 2.7, 2.46, 1.0, 0.95, 0.5, 0x0b0b14);
  vox(head, -1.3, 2.7, 2.46, 1.0, 0.95, 0.5, 0x0b0b14);
  vox(head, 0, 1.95, 2.66, 1.1, 1.2, 0.6, p.skin);        // Nase
  vox(head, 0, 3.55, 2.52, 4.3, 0.55, 0.4, p.hair);       // Braue
  if (p.band) vox(head, 0, 4.1, 0, 5.15, 0.75, 5.2, p.band);
  if (p.shades) vox(head, 0, 2.9, 2.6, 4.6, 1.2, 0.4, 0x0b0b14);
  if (p.mustache) vox(head, 0, 1.6, 2.45, 4.2, 0.62, 0.7, p.mustache);
  if (p.bork) {
    // Janitscharen-Kopfbedeckung: hoher Filzhut mit Messingband
    const hatCol = p.bork === true ? 0xf0ece0 : p.bork;
    vox(head, 0, 8.3, -0.3, 4.2, 5.2, 4.2, hatCol);
    vox(head, 0, 6.2, -0.3, 4.7, 0.7, 4.7, p.hatBand || 0xc9a24a);
    vox(head, 0, 10.5, -0.3, 3.4, 1.2, 3.4, hatCol);
  }
  if (p.cape) {
    vox(body, 0, 11.0, -3.1, 8.6 * s, 8.0, 0.5, p.cape);
  }

  // Arme (Pivot = Schulter)
  const armL = new THREE.Group();
  const armR = new THREE.Group();
  armL.position.set(-5.1 * s * VOX, 14.4 * VOX, 0);
  armR.position.set(5.1 * s * VOX, 14.4 * VOX, 0);
  body.add(armL, armR);
  for (const a of [armL, armR]) {
    vox(a, 0, -1.2, 0, 3.4, 2.4, 3.5, p.shirt);   // Ärmel
    vox(a, 0, -4.5, 0, 2.9, 3.4, 3.1, p.skin);    // Oberarm
    vox(a, 0, -6.9, 0.1, 3.3, 1.9, 3.5, p.skin);  // Faust
  }
  if (p.pads) {
    vox(armL, 0, -0.3, 0, 4.4, 2.4, 4.4, p.pads);
    vox(armR, 0, -0.3, 0, 4.4, 2.4, 4.4, p.pads);
  }

  // Kaftan-Schöße: zwei Stoffbahnen hängen über die Beine
  if (p.coat) {
    vox(body, -3.9 * s, 5.1, 0, 2.3, 6.0, 5.6 * s, p.coat);
    vox(body, 3.9 * s, 5.1, 0, 2.3, 6.0, 5.6 * s, p.coat);
    vox(body, 0, 7.7, 2.6 * s, 8.4 * s, 1.2, 0.5, p.trim || p.coat);
  }

  // Beine (Pivot = Hüfte)
  const legL = new THREE.Group();
  const legR = new THREE.Group();
  legL.position.set(-2.35 * s * VOX, 7.9 * VOX, 0);
  legR.position.set(2.35 * s * VOX, 7.9 * VOX, 0);
  body.add(legL, legR);
  for (const l of [legL, legR]) {
    vox(l, 0, -3.6, 0, 3.6, 7.4, 3.8, p.pants);
    vox(l, 0, -7.25, 0.5, 3.9, 1.5, 5.2, p.shoe);
  }

  return { root, body, torso, head, armL, armR, legL, legR };
}

/* --------------------------- Esel (Reittier) ----------------------------- */
// Ein Esel pro Map. Er steht am Anfang der Straße und kann bestiegen werden:
// J = Fronttritt, K = Drehtritt, L = Superkick bei vollem Balken. Wird der Reiter
// getroffen, stürzt er ab und der Esel galoppiert davon – pro Map kein zweiter Versuch.
const DONKEY_RIDE_Y = 0.72;
// Superkick (L, nur bei vollem Balken)
const DONKEY_KICK_DUR = 0.95;
const DONKEY_KICK_HIT = 0.44;
// Normale Tritte im Sattel: J = Fronttritt, K = Drehtritt.
const DONKEY_FRONT_DUR = 0.42;
const DONKEY_FRONT_HIT = 0.14;
const DONKEY_SPIN_DUR = 0.64;
const DONKEY_SPIN_HIT = 0.24;

// 0 = Esel blickt zum Ziel, 1 = Hinterhand zum Ziel gedreht. Der Esel dreht
// sich vor dem Superkick/Drehtritt um und richtet sich danach wieder aus.
function donkeyTurnAt(t, dur = DONKEY_KICK_DUR) {
  const p = clamp(t / dur, 0, 1);
  const turnIn = easeOut(clamp(p / 0.24, 0, 1));
  const turnOut = easeOut(clamp((p - 0.72) / 0.28, 0, 1));
  return turnIn * (1 - turnOut);
}

function makeDonkeyModel() {
  const COAT = 0x8d7c68, DARK = 0x5c4e40, LIGHT = 0xbda98c, HOOF = 0x2a2430;
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  // Rumpf mit Satteldecke und Sattel
  vox(body, 0, 9.8, 0, 9.4, 6.2, 14.4, COAT);
  vox(body, 0, 7.1, 0, 8.4, 1.4, 13.4, DARK);
  vox(body, 0, 12.7, 0, 7.2, 1.0, 8.2, 0x8a2f36);
  vox(body, 0, 13.3, 0, 4.6, 1.3, 3.0, 0xd9b45a);
  vox(body, 0, 13.9, 0, 3.6, 0.8, 2.2, 0x6a2329);
  vox(body, 0, 14.2, 1.7, 1.4, 1.1, 1.0, 0xd9b45a);   // Sattelhorn
  vox(body, 0, 14.1, -1.6, 2.2, 1.0, 0.8, 0xd9b45a);  // Sattelknauf
  for (const sx of [-4.9, 4.9]) {
    vox(body, sx, 10.1, 0.1, 0.5, 4.4, 0.5, 0x4a3220); // Steigbügelriemen
    vox(body, sx, 7.8, 0.1, 1.5, 0.6, 1.5, 0x8a7a5a);  // Steigbügel
  }

  // Hals und Mähne
  vox(body, 0, 13.5, 6.4, 5.2, 7.2, 4.6, COAT);
  vox(body, 0, 15.3, 6.4, 5.5, 1.2, 4.8, DARK);

  // Kopf: deutlich größer als ein Hundekopf, mit langem Maul und hohen Ohren.
  const head = new THREE.Group();
  head.position.set(0, 1.72, 0.64);
  body.add(head);
  vox(head, 0, 0, 0.1, 5.8, 5.2, 6.2, COAT);
  vox(head, 0, 0.6, 2.2, 5.0, 4.2, 2.8, COAT);
  vox(head, 0, -0.8, 4.0, 4.2, 3.4, 3.2, LIGHT);
  vox(head, 0, -0.35, 5.6, 3.4, 1.7, 0.5, 0x3a2f2a);
  vox(head, -1.05, 0.85, 5.55, 0.7, 0.7, 0.5, 0x141018);
  vox(head, 1.05, 0.85, 5.55, 0.7, 0.7, 0.5, 0x141018);
  vox(head, -2.2, 1.3, 1.7, 0.7, 0.8, 0.7, 0x141018);
  vox(head, 2.2, 1.3, 1.7, 0.7, 0.8, 0.7, 0x141018);
  vox(head, -2.25, 1.45, 1.65, 0.32, 0.32, 0.32, 0xffe9b0);
  vox(head, 2.25, 1.45, 1.65, 0.32, 0.32, 0.32, 0xffe9b0);
  // Stirnlocke zwischen den Ohren
  vox(head, 0, 3.3, 0.35, 1.6, 1.4, 1.2, DARK);
  // Lange Ohren
  for (const sx of [-1.85, 1.85]) {
    vox(head, sx, 5.1, -0.3, 1.5, 5.4, 1.4, COAT);
    vox(head, sx, 4.9, 0.35, 0.7, 3.2, 0.4, LIGHT);
    vox(head, sx, 7.5, -0.35, 1.1, 1.2, 1.0, DARK);
  }

  // Beine (Pivot = Schulter/Hüfte)
  const legFL = new THREE.Group(), legFR = new THREE.Group();
  const legBL = new THREE.Group(), legBR = new THREE.Group();
  for (const [g, x, z] of [[legFL, -0.4, 0.54], [legFR, 0.4, 0.54], [legBL, -0.4, -0.54], [legBR, 0.4, -0.54]]) {
    g.position.set(x, 0.7, z);
    root.add(g);
    vox(g, 0, -3.1, 0, 2.2, 6.2, 2.2, COAT);
    vox(g, 0, -6.4, 0.1, 2.4, 0.9, 2.7, HOOF);
  }

  // Schweif
  const tail = new THREE.Group();
  tail.position.set(0, 1.1, -0.72);
  root.add(tail);
  vox(tail, 0, -2.1, -0.35, 0.7, 4.2, 0.7, DARK);
  vox(tail, 0, -4.4, -0.45, 1.3, 1.5, 1.3, 0x2f2826);

  return { root, body, head, tail, legFL, legFR, legBL, legBR };
}

function makeDonkey() {
  const model = makeDonkeyModel();
  const label = new THREE.Sprite(new THREE.SpriteMaterial({
    map: pickupLabelTexture(`${keyLabel(CONTROLS[0].mount)} / ${keyLabel(CONTROLS[1].mount)} · REITEN`, '#ffd76e'),
    transparent: true, depthWrite: false,
  }));
  label.scale.set(1.05, 0.26, 1);
  label.visible = false;
  return {
    ...model, label,
    pos: new THREE.Vector3(), facing: 1, state: 'idle', rider: null,
    t: 0, phase: Math.random() * 6, kickT: 0, frontT: 0, spinT: 0, hopH: 0, fleeDir: 1,
    netTarget: null, gone: false,
  };
}

function clearDonkeys() {
  for (const d of donkeys) {
    scene.remove(d.root);
    scene.remove(d.label);
    d.label.material.dispose();
    for (const p of players) {
      if (p.mount === d) { p.mount = null; p.riding = false; }
    }
  }
  donkeys.length = 0;
  mapDonkey = null;
}

// Setzt den einen Esel dieser Map an den Anfang der Straße.
function spawnMapDonkey() {
  clearDonkeys();
  const d = makeDonkey();
  d.pos.set(12.5, 0, 0.55);
  d.facing = 1;
  d.root.position.set(d.pos.x, groundYAt(d.pos.z), d.pos.z);
  d.root.rotation.y = d.facing * (Math.PI / 2 - 0.42);
  donkeys.push(d);
  mapDonkey = d;
  scene.add(d.root, d.label);
  return d;
}

function animateDonkey(d, dt) {
  const k = 1 - Math.exp(-12 * dt);
  const gallop = d.state === 'flee';
  const moving = gallop || (d.state === 'ridden' && d.rider && d.rider.moving);
  d.phase += dt * (gallop ? 22 : moving ? (d.rider && d.rider.sprint ? 17 : 11) : 2.0);
  let fl = 0, fr = 0, bl = 0, br = 0, bob = 0, tilt = 0, headX = 0, tailX = 0;

  // Reiterhöhe: Host liest sie direkt vom Reiter, Gast aus dem Snapshot.
  const riderY = d.rider && d.rider.mount === d
    ? Math.max(0, d.rider.y || 0)
    : Math.max(0, d.hopH || 0);
  const hop = clamp(riderY / 1.1, 0, 1);

  if (moving) {
    const s = Math.sin(d.phase);
    if (gallop) {
      fl = fr = s * 0.95; bl = br = -s * 0.95;
      bob = Math.abs(s) * 0.16;
    } else {
      fl = s * 0.6; fr = -s * 0.6; bl = -s * 0.6; br = s * 0.6;
      bob = Math.abs(Math.cos(d.phase)) * 0.035;
    }
  } else {
    bob = Math.sin(d.phase) * 0.012;
    headX = Math.sin(d.phase * 1.4) * 0.04;
  }

  // Hüpfen: Beine unter dem Körper anziehen, Schweif nach oben.
  if (riderY > 0.01) {
    fl = fr = -0.62 * hop;
    bl = br = 0.58 * hop;
    bob += 0.05 * hop;
    headX -= 0.16 * hop;
    tailX = -0.45 * hop;
  }

  if (d.kickT > 0) {
    const p = clamp(1 - d.kickT / DONKEY_KICK_DUR, 0, 1);
    const wind = easeOut(clamp(p / 0.3, 0, 1));
    const snap = easeOut(clamp((p - 0.3) / 0.14, 0, 1));
    const back = clamp((p - 0.5) / 0.3, 0, 1);
    const kick = snap * (1 - back);
    const brace = wind * (1 - kick);
    // Vorderbeine stemmen sich in den Asphalt, beide Hinterbeine treten
    // geschlossen nach hinten aus; die Kruppe hebt sich.
    fl = fr = -0.5 * brace;
    bl = br = lerp(0.25, 2.05, kick);
    tilt = 0.42 * kick;
    bob += 0.1 * kick;
    headX += 0.18 * kick;
    tailX = -0.6 * kick;
  }

  // Fronttritt: Die Vorderhand steigt, beide Vorderbeine stoßen nach vorn.
  if (d.frontT > 0) {
    const p = clamp(1 - d.frontT / DONKEY_FRONT_DUR, 0, 1);
    const snap = easeOut(clamp((p - 0.12) / 0.2, 0, 1)) *
      (1 - clamp((p - 0.55) / 0.45, 0, 1));
    fl = fr = lerp(fl, -1.3, snap);
    bl = lerp(bl, 0.34, snap);
    br = lerp(br, 0.18, snap);
    tilt = -0.3 * snap;
    headX -= 0.24 * snap;
    tailX = -0.35 * snap;
  }

  // Drehtritt: Der Esel reißt die Hinterhand herum und schlägt seitlich aus.
  if (d.spinT > 0) {
    const p = clamp(1 - d.spinT / DONKEY_SPIN_DUR, 0, 1);
    const swing = Math.sin(Math.PI * p);
    const whip = Math.sin(Math.PI * clamp((p - 0.18) / 0.55, 0, 1));
    bl = lerp(bl, 1.75, whip);
    br = lerp(br, 0.85, whip);
    fl = fr = lerp(fl, -0.25, swing);
    tilt = 0.22 * swing;
    headX += 0.1 * swing;
    tailX = -0.5 * swing;
  }

  d.legFL.rotation.x = lerp(d.legFL.rotation.x, fl, k);
  d.legFR.rotation.x = lerp(d.legFR.rotation.x, fr, k);
  d.legBL.rotation.x = lerp(d.legBL.rotation.x, bl, k);
  d.legBR.rotation.x = lerp(d.legBR.rotation.x, br, k);
  d.body.rotation.x = lerp(d.body.rotation.x, tilt, k);
  d.head.rotation.x = lerp(d.head.rotation.x, headX, k);
  // Kopf leicht zur Kamera drehen, damit Maultier/Ohren als Esel lesbar sind.
  d.head.rotation.y = lerp(d.head.rotation.y, -d.facing * 0.38, k);
  d.tail.rotation.z = Math.sin(performance.now() * 0.003 + d.pos.x) * 0.18;
  d.tail.rotation.x = lerp(d.tail.rotation.x, tailX, k);
  const turn = d.kickT > 0 ? donkeyTurnAt(DONKEY_KICK_DUR - d.kickT)
    : d.spinT > 0 ? donkeyTurnAt(DONKEY_SPIN_DUR - d.spinT, DONKEY_SPIN_DUR) : 0;
  d.root.position.set(d.pos.x, groundYAt(d.pos.z) + bob + riderY, d.pos.z);
  d.root.rotation.y = d.facing * (Math.PI / 2 - 0.42) + d.facing * Math.PI * turn;
  // Host schickt die aktuelle Reiterhöhe im nächsten Snapshot mit.
  if (d.rider && d.rider.mount === d) d.hopH = Math.max(0, d.rider.y || 0);
}

function updateDonkeys(dt) {
  for (let i = donkeys.length - 1; i >= 0; i--) {
    const d = donkeys[i];
    d.t += dt;
    d.kickT = Math.max(0, d.kickT - dt);
    d.frontT = Math.max(0, d.frontT - dt);
    d.spinT = Math.max(0, d.spinT - dt);
    if (d.state === 'ridden' && d.rider) {
      d.pos.x = d.rider.pos.x;
      d.pos.z = d.rider.pos.z;
      d.facing = d.rider.facing;
      d.label.visible = false;
    } else if (d.state === 'flee') {
      d.pos.x = clamp(d.pos.x + d.fleeDir * (10 + Math.min(6, d.t * 4)) * dt, XMIN, XMAX);
      d.pos.z = clamp(d.pos.z + Math.sin(d.t * 7) * 0.5 * dt, -WALK_LANE, WALK_LANE);
      d.facing = d.fleeDir;
      d.label.visible = false;
      if (Math.random() < 0.6) {
        ghost(d.pos.x - d.fleeDir * 0.7, 0.2, d.pos.z, 0xb9a58c, 0.26, 0.3);
      }
      if (d.t > 3.2 || d.pos.x <= XMIN + 0.4 || d.pos.x >= XMAX - 0.4) {
        scene.remove(d.root);
        scene.remove(d.label);
        d.label.material.dispose();
        if (mapDonkey === d) mapDonkey = null;
        donkeys.splice(i, 1);
        continue;
      }
    } else {
      const near = players.find((p) => !p.dead &&
        Math.hypot(p.pos.x - d.pos.x, p.pos.z - d.pos.z) < 2.8);
      if (near && Math.abs(near.pos.x - d.pos.x) > 0.6) {
        d.facing = Math.sign(near.pos.x - d.pos.x) || d.facing;
      }
      d.label.visible = !!near;
      d.label.position.set(d.pos.x, groundYAt(d.pos.z) + 2.8, d.pos.z);
    }
    animateDonkey(d, dt);
  }
}

// Gast spiegelt den Host-Esel, ohne eigene Logik.
function guestDonkeys(raw) {
  const k = 1 - Math.exp(-16 * raw);
  for (const d of donkeys) {
    if (d.gone) { d.root.visible = false; d.label.visible = false; continue; }
    d.root.visible = true;
    if (d.netTarget) {
      d.pos.x = lerp(d.pos.x, d.netTarget.x, k);
      d.pos.z = lerp(d.pos.z, d.netTarget.z, k);
    }
    d.kickT = Math.max(0, d.kickT - raw);
    d.frontT = Math.max(0, d.frontT - raw);
    d.spinT = Math.max(0, d.spinT - raw);
    // Auch der Gast braucht den Aufsteige-Hinweis für seinen lokalen Spieler.
    const local = players.find((p) => !p.remote && !p.dead &&
      Math.hypot(p.pos.x - d.pos.x, p.pos.z - d.pos.z) < 2.8);
    d.label.visible = d.state === 'idle' && !!local;
    if (d.label.visible) {
      d.label.position.set(d.pos.x, groundYAt(d.pos.z) + 2.8, d.pos.z);
    }
    animateDonkey(d, raw);
  }
}

function tryMount(p) {
  if (!p || p.dead || p.down || p.state === 'ko' || p.state === 'hurt' || p.grab) return;
  if (p.mount) {
    if (p.state === 'ride') dismountRider(p);
    return;
  }
  if (p.state !== 'idle' && p.state !== 'walk') return;
  let best = null, bd = 2.6;
  for (const d of donkeys) {
    if (d.state !== 'idle') continue;
    const dist = Math.hypot(d.pos.x - p.pos.x, d.pos.z - p.pos.z);
    if (dist < bd) { bd = dist; best = d; }
  }
  if (!best) return;
  const d = best;
  d.rider = p;
  d.state = 'ridden';
  d.t = 0;
  d.label.visible = false;
  p.mount = d;
  p.riding = true;
  p.state = 'ride';
  p.t = 0;
  p.moving = false;
  p.hitDone = false;
  p.buffer = null;
  p.knock = 0;
  p.y = 0;
  p.vy = 0;
  p.grab = null;
  p.atkIdx = 0;
  p.pos.x = d.pos.x;
  p.pos.z = d.pos.z;
  updateMeter(p);
  toast(`${keyLabel(CONTROLS[p.id].punch)} FRONTTRITT · ${keyLabel(CONTROLS[p.id].kick)} DREHTRITT · ${keyLabel(CONTROLS[p.id].special)} SUPERKICK (VOLLER BALKEN)`);
  sfx.bray();
  ring(d.pos.x, 0.4, d.pos.z, 0xffd76e, 1.8, 0.26);
  burst(d.pos.x, 1.0, d.pos.z, [0xd9b45a, 0xb9a58c, 0xffffff], 12, 3, 0.09);
  shake = Math.max(shake, 0.08);
  shakeT = Math.max(shakeT, 0.16);
}

function releaseDonkey(p) {
  const d = p.mount;
  if (!d) return null;
  p.mount = null;
  p.riding = false;
  d.rider = null;
  d.label.visible = false;
  d.hopH = 0;
  d.kickT = 0;
  d.frontT = 0;
  d.spinT = 0;
  updateMeter(p);
  d.pos.x = p.pos.x;
  d.pos.z = p.pos.z;
  d.facing = p.facing || d.facing;
  return d;
}

function dismountRider(p) {
  const d = releaseDonkey(p);
  if (!d) return;
  d.state = 'idle';
  d.t = 0;
  d.kickT = 0;
  p.state = 'idle';
  p.t = 0;
  p.moving = false;
  p.pos.x = clamp(p.pos.x + p.facing * 0.7, XMIN, maxWalkX());
  const nz = clamp(p.pos.z + (p.pos.z >= 0 ? -1.1 : 1.1), -WALK_LANE, WALK_LANE);
  if (!blockedByCar(p.pos.x, nz)) p.pos.z = nz;
  p.inv = Math.max(p.inv, 0.6);
  toast('ABGESTIEGEN');
}

// Treffer im Sattel: Reiter fliegt herunter, Esel ergreift die Flucht.
function throwRider(p, dir) {
  const d = releaseDonkey(p);
  if (!d) return;
  d.state = 'flee';
  d.t = 0;
  d.kickT = 0;
  d.fleeDir = dir || p.facing || 1;
  d.facing = d.fleeDir;
  p.state = 'hurt';
  p.t = 0;
  p.y = 0;
  p.vy = 0;
  p.hitDone = false;
  p.knock = d.fleeDir * 5.0;
  p.inv = Math.max(p.inv, 1.0);
  burst(p.pos.x, 1.0, p.pos.z, [0xb9a58c, 0xffd76e, 0xffffff], 18, 4.2, 0.1);
  ring(p.pos.x, 0.6, p.pos.z, 0xffd76e, 2.4, 0.3);
  banner('VOM ESEL GESTÜRZT');
  shake = Math.max(shake, 0.22);
  shakeT = Math.max(shakeT, 0.3);
  hitstop = Math.max(hitstop, 0.05);
  sfx.bray();
}

// Hüpfen im Sattel: Space federt den Esel hoch. Wer läuft, springt dabei
// ein Stück nach vorn; in der Luft lässt sich weiter lenken.
function donkeyHop(p) {
  if (!p.mount || p.state !== 'ride') return;
  p.state = 'ridehop';
  p.t = 0;
  p.hitDone = true;
  p.vy = 6.9;
  p.y = 0.001;
  p.hopBoost = p.moving ? 4.8 : 0;
  p.moving = false;
  p.sprint = false;
  p.mount.kickT = 0;
  p.mount.hopH = 0;
  sfx.hop();
  const gy = groundYAt(p.pos.z);
  burst(p.pos.x, gy + 0.12, p.pos.z, [0xb9a58c, 0x8d7c68, 0xffffff], 10, 2.8, 0.08);
  ring(p.pos.x, gy + 0.1, p.pos.z, 0xffd76e, 1.6, 0.22);
  shake = Math.max(shake, 0.05);
  shakeT = Math.max(shakeT, 0.12);
}

// Fronttritt (J): kurzer Stoß mit beiden Vorderbeinen nach vorn.
function donkeyFrontKick(p) {
  if (!p.mount || p.state !== 'ride') return;
  const near = nearestEnemyTo(p);
  if (near && Math.abs(near.pos.x - p.pos.x) < 4.5) {
    p.facing = Math.sign(near.pos.x - p.pos.x) || p.facing;
  }
  p.state = 'donkeyfront';
  p.t = 0;
  p.hitDone = false;
  p.moving = false;
  p.sprint = false;
  p.y = 0;
  p.vy = 0;
  p.mount.kickT = 0;
  p.mount.spinT = 0;
  p.mount.frontT = DONKEY_FRONT_DUR;
  p.mount.hopH = 0;
  sfx.kick();
}

function donkeyFrontStrike(p) {
  if (!p.mount) return;
  const dir = p.facing;
  let hits = 0;
  for (const e of enemies) {
    if (e.dead || e.state === 'ko') continue;
    const dx = (e.pos.x - p.pos.x) * dir;
    const dz = Math.abs(e.pos.z - p.pos.z);
    if (dx > -0.7 && dx < 3.5 + e.hitR && dz < 1.35 && Math.abs(e.y - p.y) < 1.8) {
      damageEnemy(e, 18, false, dir, 5.5, p);
      e.stun = Math.max(e.stun, 0.5);
      hits += 1;
    }
  }
  for (const prop of destructibles) {
    if (prop.dead) continue;
    const dx = (prop.x - p.pos.x) * dir;
    const hw = prop.halfW || 0.5, hd = prop.halfD || 0.5;
    if (dx > -0.6 - hw && dx < 3.6 + hw && Math.abs(prop.z - p.pos.z) < 1.5 + hd) {
      damageProp(prop, 1, p);
    }
  }
  const hx = p.pos.x + dir * 2.7;
  ring(hx, 0.42, p.pos.z, 0xffd76e, 2.0, 0.24);
  burst(hx, 0.55, p.pos.z, [0xffd76e, 0xffffff, 0xb9a58c], 12, 4, 0.08);
  if (hits) {
    addMeter(p, 6);
    shake = Math.max(shake, 0.09);
    shakeT = Math.max(shakeT, 0.12);
    hitstop = Math.max(hitstop, 0.02);
  }
  sfx.hit();
}

// Drehtritt (K): Der Esel dreht die Hinterhand einmal herum und schlägt mit
// einem Hinterhuf seitlich aus – trifft dadurch auch Gegner hinter dem Reiter.
function donkeySpinKick(p) {
  if (!p.mount || p.state !== 'ride') return;
  p.state = 'donkeyspin';
  p.t = 0;
  p.hitDone = false;
  p.moving = false;
  p.sprint = false;
  p.y = 0;
  p.vy = 0;
  p.mount.kickT = 0;
  p.mount.frontT = 0;
  p.mount.spinT = DONKEY_SPIN_DUR;
  p.mount.hopH = 0;
  sfx.kick();
}

function donkeySpinStrike(p) {
  if (!p.mount) return;
  let hits = 0;
  for (const e of enemies) {
    if (e.dead || e.state === 'ko') continue;
    const dx = Math.abs(e.pos.x - p.pos.x);
    const dz = Math.abs(e.pos.z - p.pos.z);
    if (dx < 2.9 + e.hitR && dz < 2.2 && Math.abs(e.y - p.y) < 1.9) {
      const dir = Math.sign(e.pos.x - p.pos.x) || p.facing;
      damageEnemy(e, 24, true, dir, 7.2, p);
      e.stun = Math.max(e.stun, 0.7);
      hits += 1;
    }
  }
  for (const prop of destructibles) {
    if (prop.dead) continue;
    const hw = prop.halfW || 0.5, hd = prop.halfD || 0.5;
    if (Math.abs(prop.x - p.pos.x) < 3.0 + hw && Math.abs(prop.z - p.pos.z) < 2.3 + hd) {
      damageProp(prop, 2, p);
    }
  }
  ring(p.pos.x, 0.35, p.pos.z, 0xffd76e, 3.2, 0.32);
  ring(p.pos.x, 0.9, p.pos.z, 0xff8f4a, 2.2, 0.24);
  for (const side of [-1, 1]) {
    burst(p.pos.x + side * 2.2, 0.6, p.pos.z, [0xffd76e, 0xffffff, 0xb9a58c], 14, 4.6, 0.09);
  }
  if (hits) {
    addMeter(p, 9);
    shake = Math.max(shake, 0.16);
    shakeT = Math.max(shakeT, 0.2);
    hitstop = Math.max(hitstop, 0.035);
    fovPunch = Math.min(1, fovPunch + 0.22);
  }
  sfx.hit();
}

// Superkick (L): Der Esel dreht die Hinterhand zum Ziel und tritt mit beiden
// Hinterbeinen geschlossen zu. Während der Drehung steht der Reiter im Sattel.
function donkeyKick(p) {
  if (!p.mount || p.state !== 'ride') return;
  // Wie beim Faustkampf automatisch zum nächsten Gegner eindrehen.
  const near = nearestEnemyTo(p);
  if (near && Math.abs(near.pos.x - p.pos.x) < 5) {
    p.facing = Math.sign(near.pos.x - p.pos.x) || p.facing;
  }
  p.state = 'donkeykick';
  p.t = 0;
  p.hitDone = false;
  p.moving = false;
  p.sprint = false;
  p.y = 0;
  p.vy = 0;
  p.mount.kickT = DONKEY_KICK_DUR;
  p.mount.hopH = 0;
  sfx.kick();
}

function donkeyStrike(p) {
  if (!p.mount) return;
  const dir = p.facing;
  let hits = 0;
  for (const e of enemies) {
    if (e.dead || e.state === 'ko') continue;
    const dx = (e.pos.x - p.pos.x) * dir;
    const dz = Math.abs(e.pos.z - p.pos.z);
    if (dx > -0.9 && dx < 4.7 && dz < 2.3 && Math.abs(e.y - p.y) < 1.9) {
      damageEnemy(e, 46, true, dir, 14, p);
      e.stun = Math.max(e.stun, 1.05);
      hits += 1;
    }
  }
  for (const prop of destructibles) {
    if (prop.dead) continue;
    const dx = (prop.x - p.pos.x) * dir;
    const hw = prop.halfW || 0.5, hd = prop.halfD || 0.5;
    if (dx > -0.8 - hw && dx < 4.8 + hw && Math.abs(prop.z - p.pos.z) < 2.4 + hd) {
      damageProp(prop, 3, p);
    }
  }
  const hx = p.pos.x + dir * 2.7;
  const hz = p.pos.z;
  ring(hx, 0.55, hz, 0xffd76e, 3.8, 0.38);
  ring(hx, 1.0, hz, 0xff8f4a, 2.6, 0.28);
  impact(hx, 0.95, hz, 0xfff1c9, 0.72);
  burst(hx, 0.8, hz, [0xffd76e, 0xff8f4a, 0xf2f2f2, 0xb9a58c], 30, 6, 0.11);
  // Zwei Einschläge für die beiden Hinterhufe.
  for (const sz of [-0.55, 0.55]) {
    burst(hx - dir * 0.9, 0.55, p.pos.z + sz, [0xffd76e, 0xffffff, 0xb9a58c], 10, 4.5, 0.08);
  }
  screenFlash('#ffe6b0', 0.24, 0.16);
  shake = Math.max(shake, hits ? 0.3 : 0.14);
  shakeT = Math.max(shakeT, hits ? 0.36 : 0.2);
  hitstop = Math.max(hitstop, hits ? 0.07 : 0.03);
  if (hits) { addMeter(p, 14); fovPunch = Math.min(1, fovPunch + 0.5); }
  banner(hits ? `SUPERKICK ×${hits}` : 'SUPERKICK');
  sfx.superkick();
  sfx.bray();
}

// Reiten: eigene Bewegung, kein Waffeneinsatz, J/K treten.
function updateRiding(p, dt) {
  const d = p.mount;
  if (!d || d.state !== 'ridden') {
    p.mount = null;
    p.riding = false;
    p.state = 'idle';
    return;
  }
  const c = CONTROLS[p.id];
  const kb = p.remote ? (p.netKeys || {}) : keys;
  // Auch in der Luft bleibt der Esel lenkbar.
  const canMove = p.state === 'ride' || p.state === 'ridehop';
  let mx = 0, mz = 0;
  if (canMove) {
    if (kb[c.left]) mx -= 1;
    if (kb[c.right]) mx += 1;
    if (kb[c.up]) mz -= 1;
    if (kb[c.down]) mz += 1;
  }
  p.moving = canMove && (mx !== 0 || mz !== 0);
  if (p.moving) {
    p.runT += dt;
    p.sprint = !!(kb[c.sprint] || p.runT > 1.0);
    const speed = p.sprint ? 12.0 : 7.8;
    const len = Math.hypot(mx, mz) || 1;
    const nx = clamp(p.pos.x + (mx / len) * speed * dt, XMIN, maxWalkX());
    const nz = clamp(p.pos.z + (mz / len) * (p.sprint ? 5.2 : 4.0) * dt, -WALK_LANE, WALK_LANE);
    p.pos.x = nx;
    if (!blockedByCar(nx, nz)) p.pos.z = nz;
    p.facing = mx !== 0 ? Math.sign(mx) : p.facing;
    p.walkPhase += dt * (p.sprint ? 17 : 11);
    if (Math.random() < 0.35) {
      ghost(p.pos.x - p.facing * 0.9, 0.2, p.pos.z + rndRange(-0.25, 0.25), 0xb9a58c, 0.24, 0.24);
    }
  } else {
    p.runT = 0;
    p.sprint = false;
  }
  // Ein laufender Hüpfer setzt einen kurzen Vorwärtssprung frei.
  if (p.state === 'ridehop' && p.hopBoost && p.t < 0.2) {
    p.pos.x = clamp(p.pos.x + p.facing * p.hopBoost * dt, XMIN, maxWalkX());
  }
  const atk = p.state === 'donkeyfront'
    ? { dur: DONKEY_FRONT_DUR, hit: DONKEY_FRONT_HIT, strike: donkeyFrontStrike }
    : p.state === 'donkeyspin'
      ? { dur: DONKEY_SPIN_DUR, hit: DONKEY_SPIN_HIT, strike: donkeySpinStrike }
      : p.state === 'donkeykick'
        ? { dur: DONKEY_KICK_DUR, hit: DONKEY_KICK_HIT, strike: donkeyStrike }
        : null;
  if (atk) {
    if (!p.hitDone && p.t >= atk.hit) { p.hitDone = true; atk.strike(p); }
    if (p.t >= atk.dur) { p.state = 'ride'; p.t = 0; p.hitDone = false; }
    p.y = 0;
    p.vy = 0;
  } else if (p.state === 'ridehop') {
    p.vy -= 20 * dt;
    p.y += p.vy * dt;
    if (p.y <= 0) {
      p.y = 0;
      p.vy = 0;
      p.state = 'ride';
      p.t = 0;
      p.hopBoost = 0;
      const gy = groundYAt(p.pos.z);
      burst(p.pos.x, gy + 0.1, p.pos.z, [0xb9a58c, 0x8d7c68, 0xffffff], 14, 3.4, 0.09);
      ring(p.pos.x, gy + 0.12, p.pos.z, 0xffd76e, 1.8, 0.22);
      shake = Math.max(shake, 0.07);
      shakeT = Math.max(shakeT, 0.16);
      sfx.land();
    }
  } else {
    p.y = 0;
    p.vy = 0;
    p.hopBoost = 0;
  }
  d.pos.x = p.pos.x;
  d.pos.z = p.pos.z;
  d.facing = p.facing;
  d.hopH = Math.max(0, p.y);
  p.fig.root.position.set(p.pos.x, p.y, p.pos.z);
  const turn = p.state === 'donkeykick'
    ? donkeyTurnAt(p.t)
    : p.state === 'donkeyspin' ? donkeyTurnAt(p.t, DONKEY_SPIN_DUR) : 0;
  p.fig.root.rotation.y = p.facing * (Math.PI / 2 - 0.42) + p.facing * Math.PI * turn;
  animateFighter(p, dt, true);
}

/* ------------------------------ Audio ------------------------------------ */
let actx = null, muted = false;
function audio() {
  if (!actx) {
    try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
  }
  if (actx.state === 'suspended') actx.resume();
  return actx;
}
function tone(f0, f1, dur, type = 'square', vol = 0.09) {
  const ac = audio(); if (!ac || muted) return;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, ac.currentTime);
  o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), ac.currentTime + dur);
  g.gain.setValueAtTime(vol, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
  o.connect(g).connect(ac.destination);
  o.start(); o.stop(ac.currentTime + dur + 0.02);
}
function noise(dur, vol = 0.08) {
  const ac = audio(); if (!ac || muted) return;
  const n = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, n, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2;
  const src = ac.createBufferSource(); src.buffer = buf;
  const g = ac.createGain(); g.gain.value = vol;
  const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1800;
  src.connect(f).connect(g).connect(ac.destination);
  src.start();
}
const sfx = {
  swing: () => noise(0.12, 0.05),
  swingBig: () => { noise(0.2, 0.07); tone(220, 120, 0.16, 'sawtooth', 0.05); },
  hit: () => { noise(0.09, 0.12); tone(180, 70, 0.12, 'square', 0.07); },
  heavy: () => { noise(0.16, 0.15); tone(120, 45, 0.22, 'sine', 0.12); },
  hurt: () => tone(320, 110, 0.2, 'square', 0.08),
  kick: () => { noise(0.18, 0.09); tone(190, 62, 0.2, 'sine', 0.11); },
  hop: () => { noise(0.07, 0.08); tone(180, 120, 0.1, 'sine', 0.07); },
  land: () => { noise(0.14, 0.14); tone(105, 55, 0.16, 'sine', 0.11); },
  superkick: () => {
    // Doppelter Huffschlag: trocken, tief, mit kurzem Nachhall.
    noise(0.16, 0.2);
    tone(110, 38, 0.26, 'sine', 0.16);
    setTimeout(() => { noise(0.22, 0.17); tone(86, 34, 0.3, 'sine', 0.14); }, 70);
  },
  special: () => { tone(110, 720, 0.45, 'sawtooth', 0.07); tone(220, 110, 0.5, 'square', 0.05); },
  slapWind: () => { tone(280, 980, 0.2, 'sawtooth', 0.05); noise(0.16, 0.04); },
  slap: () => {
    // Kurzer Peitschenknall plus satter Bass: klingt nach Handfläche, nicht nach Kugel.
    noise(0.035, 0.3);
    tone(2400, 320, 0.11, 'sawtooth', 0.1);
    setTimeout(() => { noise(0.13, 0.24); tone(900, 180, 0.14, 'square', 0.06); }, 14);
    setTimeout(() => { noise(0.22, 0.15); tone(96, 38, 0.26, 'sine', 0.18); }, 30);
  },
  boom: () => { noise(0.5, 0.16); tone(90, 38, 0.55, 'sine', 0.14); },
  ko: () => { tone(160, 40, 0.45, 'sawtooth', 0.09); noise(0.3, 0.1); },
  wave: () => { tone(520, 780, 0.12, 'square', 0.06); setTimeout(() => tone(780, 1040, 0.16, 'square', 0.06), 120); },
  shoot: () => { noise(0.09, 0.1); tone(720, 190, 0.1, 'square', 0.06); },
  pickup: () => { tone(660, 980, 0.1, 'triangle', 0.07); setTimeout(() => tone(980, 1320, 0.12, 'triangle', 0.06), 80); },
  chain: () => { noise(0.14, 0.05); tone(1200, 420, 0.18, 'sawtooth', 0.045); },
  chainMiss: () => tone(300, 190, 0.12, 'triangle', 0.04),
  grab: () => { noise(0.12, 0.08); tone(240, 90, 0.16, 'square', 0.06); },
  throw: () => { noise(0.2, 0.12); tone(320, 70, 0.24, 'sawtooth', 0.08); },
  block: () => { noise(0.06, 0.09); tone(1400, 900, 0.08, 'square', 0.04); },
  glass: () => {
    noise(0.18, 0.14);
    tone(2600, 1500, 0.1, 'triangle', 0.055);
    setTimeout(() => { noise(0.2, 0.08); tone(3200, 900, 0.12, 'triangle', 0.04); }, 30);
  },
  bray: () => {
    // Zwei absteigende Kehllaute plus Luft: kurz und eselig.
    tone(520, 280, 0.18, 'sawtooth', 0.07);
    noise(0.14, 0.045);
    setTimeout(() => { tone(300, 130, 0.3, 'sawtooth', 0.06); noise(0.18, 0.04); }, 150);
  },
  alarm: () => {
    // Zweiklang einer Autoalarmanlage: hoch, kurz, dann etwas tiefer.
    tone(980, 820, 0.12, 'square', 0.05);
    setTimeout(() => tone(690, 900, 0.14, 'square', 0.045), 115);
  },
};

/* ============================== ENTITIES ================================= */
// Janitschar in Kaftan, Kuşak und Börk — osmanischer Look statt Neon-Punk.
const PLAYER_PAL = {
  skin: 0xd9a574, hair: 0x2a1a12, shirt: 0x2f5a4a, shirt2: 0xd9b45a,
  pants: 0x8a2f36, shoe: 0xd9b45a, band: 0xd9b45a, sash: 0xc0392b,
  coat: 0x2f5a4a, trim: 0xd9b45a, bork: true, hatBand: 0xc9a24a, mustache: 0x2a1a12,
};
const PLAYER2_PAL = {
  skin: 0xc98d68, hair: 0x1f1610, shirt: 0x2f4a7a, shirt2: 0xd9b45a,
  pants: 0x2f4a7a, shoe: 0xd9b45a, band: 0xd9b45a, sash: 0x2f6fbf,
  coat: 0x2f4a7a, trim: 0xd9b45a, bork: true, hatBand: 0x6be0ff, mustache: 0x1f1610,
};

// Gegner und Bosse kommen aus content.js (10 Typen, 10 Bosse).
const TYPES = ENEMIES;
const ALL_TYPES = { ...ENEMIES, ...BOSSES };

// Angriffsdaten: 5er-Schlagkette und 3er-Trittkette. Jede Stufe hat eigene
// Dauer, Trefferzeit, Reichweite, Schaden, Rückstoß und Hitstop; die letzte
// Stufe ist der Finisher. Die Kette läuft nur mit freien Händen weiter.
// Jede Stufe ist außerdem eine eigene Technik mit eigener Silhouette:
// Links – Rechts – Uppercut – Kopfnuss – Schelle bzw. Lowkick – Highkick –
// Roundhouse. Reichweite und Rückstoß folgen der Bewegung (Kopfnuss kurz,
// Roundhouse weit).
const MOVES = {
  punch: {
    name: ['LINKS', 'RECHTS', 'UPPERCUT', 'KOPFNUSS', 'SCHELLE'],
    dur: [0.24, 0.24, 0.26, 0.28, 0.5],
    hit: [0.08, 0.08, 0.09, 0.09, 0.2],
    reach: [1.95, 2.05, 1.9, 1.75, 2.2],
    dmg: [8, 9, 11, 12, 25],
    knock: [2.2, 2.5, 3.4, 3.8, 6.6],
    hs: [0.04, 0.05, 0.07, 0.09, 0.14],
    finisher: 4,
  },
  kick: {
    name: ['LOWKICK', 'HIGHKICK', 'ROUNDHOUSE'],
    dur: [0.46, 0.5, 0.72],
    hit: [0.16, 0.17, 0.26],
    reach: [2.25, 2.65, 3.0],
    dmg: [13, 17, 30],
    knock: [3.0, 4.4, 8.0],
    hs: [0.06, 0.09, 0.15],
    finisher: 2,
  },
  // So lange nach dem Angriff bleibt die Kette offen (Sekunden).
  chainWindow: 0.55,
};

const enemies = [];
const donkeys = [];
let mapDonkey = null;
let hitstop = 0, shake = 0, shakeT = 0;
let wave = 0, bannerTimer = 0;
let timeScale = 1, fovPunch = 0, flashT = 0, flashMax = 1, flashAmt = 0;

/* ------------------------------ Spieler ---------------------------------- */
/* ------------------------------ Spieler ---------------------------------- */
function makePlayer(id, pal, x, z, name) {
  const fig = makeFigure(pal, 1.0);
  fig.root.scale.setScalar(0.98);
  fig.root.position.set(x, 0, z);
  scene.add(fig.root);
  return {
    id, name: name || `P${id + 1}`, fig, pal,
    pos: new THREE.Vector3(x, 0, z), y: 0, vy: 0, facing: 1,
    hp: 100, maxhp: 100, state: 'idle', t: 0, move: 'punch', atkIdx: 0,
    chainKind: null, chainN: 0, chainT: 0,
    lives: 3, out: false, deadT: 0, down: false, downT: 0, reviveP: 0, downFx: 0,
    hitDone: false, combo: 0, comboT: 0, inv: 0, walkPhase: 0, dead: false,
    knock: 0, meter: 0, spin: 0, buffer: null, moving: false, respawnT: 0,
    weapon: null, swingT: 0, grab: null, grabT: 0, sprint: false, runT: 0,
    remote: false, netKeys: null, dashT: 0, airKick: false, hopBoost: 0,
    mount: null, riding: false, score: 0,
  };
}

const P = makePlayer(0, PLAYER_PAL, -0.7, 0.35);
const P2 = makePlayer(1, PLAYER2_PAL, 1.0, -0.55);
// Stabile Referenz: setRoster() verändert den Inhalt, nicht die Identität —
// sonst zeigen Debug-/Netz-Handles auf ein veraltetes Array.
const players = [P];
window.__vr = { get players() { return players; } };

function setRoster(count) {
  players.length = 0;
  players.push(P);
  if (count > 1) players.push(P2);
  P2.fig.root.visible = count > 1;
  document.getElementById('p2Panel').classList.toggle('off', count < 2);
  if (scoreBox2El) scoreBox2El.classList.toggle('off', count < 2);
  p2Label.textContent = P2.remote ? 'Spieler 2 · Online' : 'Spieler 2';
  updateScores();
}

// Tastenbelegung: Standard ist WASD für P1, Pfeiltasten + , . / für P2.
// Im Startmenü frei belegbar; die Auswahl liegt lokal im Browser.
const DEFAULT_CONTROLS = [
  {
    left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS', punch: 'KeyJ', kick: 'KeyK',
    special: 'KeyL', jump: 'Space', sprint: 'ShiftLeft', grapple: 'KeyG', mount: 'KeyE',
  },
  {
    left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', punch: 'Comma',
    kick: 'Period', special: 'Slash', jump: 'Enter', sprint: 'ShiftRight', grapple: 'Semicolon',
    mount: 'Quote',
  },
];
const BIND_ACTIONS = [
  ['left', 'Links'], ['right', 'Rechts'], ['up', 'Hoch'], ['down', 'Runter'],
  ['punch', 'Schlag / Item'], ['kick', 'Kick'], ['special', 'Spezial'],
  ['jump', 'Sprung'], ['sprint', 'Rennen'], ['grapple', 'Greifen'], ['mount', 'Esel'],
];
// Diese Tasten steuern global und bleiben deshalb frei belegbar nicht verfügbar.
const RESERVED_BINDINGS = new Set(['Escape', 'KeyP', 'KeyM', 'KeyR', 'Tab']);
const BIND_STORAGE_KEY = 'voxel-rage-bindings-v1';
const CONTROLS = DEFAULT_CONTROLS.map((set) => ({ ...set }));

const KEY_LABELS = {
  ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓',
  Space: 'SPACE', Enter: 'ENTER', ShiftLeft: 'L-SHIFT', ShiftRight: 'R-SHIFT',
  Comma: ',', Period: '.', Slash: '/', Semicolon: ';', Quote: "'", Backslash: '\\',
  Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backspace: '⌫',
  ControlLeft: 'L-STRG', ControlRight: 'R-STRG', AltLeft: 'L-ALT', AltRight: 'R-ALT',
};
function keyLabel(code) {
  if (!code) return '—';
  if (KEY_LABELS[code]) return KEY_LABELS[code];
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  if (/^Numpad[0-9]$/.test(code)) return `NUM ${code.slice(6)}`;
  return code.replace(/Left$/, ' L').replace(/Right$/, ' R').toUpperCase();
}
function isReservedBind(code) {
  return RESERVED_BINDINGS.has(code) || /^F\d{1,2}$/.test(code);
}

function loadBindings() {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(BIND_STORAGE_KEY) || 'null'); } catch (e) { return; }
  if (!Array.isArray(raw)) return;
  const used = new Set();
  for (let i = 0; i < 2; i++) {
    const set = raw[i];
    if (!set || typeof set !== 'object') continue;
    for (const [a] of BIND_ACTIONS) {
      const code = set[a];
      if (typeof code === 'string' && code && !isReservedBind(code) && !used.has(code)) {
        CONTROLS[i][a] = code;
        used.add(code);
      }
    }
  }
  // Doppelte oder reservierte Tasten aus alten Ständen notfalls umbiegen.
  const seen = new Set();
  const pool = ['KeyF', 'KeyH', 'KeyI', 'KeyO', 'KeyT', 'KeyU', 'KeyV', 'KeyB', 'KeyN', 'KeyX', 'KeyZ',
    'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0'];
  for (let i = 0; i < 2; i++) {
    for (const [a] of BIND_ACTIONS) {
      let code = CONTROLS[i][a];
      if (isReservedBind(code) || seen.has(code)) {
        code = pool.find((c) => !seen.has(c)) || DEFAULT_CONTROLS[i][a];
        CONTROLS[i][a] = code;
      }
      seen.add(code);
    }
  }
}
loadBindings();

/* ------------------------- Gegner-Lebensbalken --------------------------- */
// Kleiner Balken über dem Kopf, der auftaucht, sobald der Gegner Schaden hat:
// grün → gelb → rot, mit weißem Trefferblitz und vier Kerben im Voxel-Stil.
// Bosse behalten ihre große HUD-Leiste, weil sie sonst doppelt angezeigt würden.
const HP_BAR_GEO = new THREE.PlaneGeometry(1, 1);
const HP_BAR_FILL_GEO = new THREE.PlaneGeometry(1, 1).translate(0.5, 0, 0);
const HP_FRAME_MAT = new THREE.MeshBasicMaterial({
  color: 0xc9a24a, transparent: true, opacity: 0.55, depthTest: false, depthWrite: false,
});
const HP_TICK_MAT = new THREE.MeshBasicMaterial({
  color: 0x0b0810, transparent: true, opacity: 0.8, depthTest: false, depthWrite: false,
});
const HP_BAR_W = 0.9;
const HP_BAR_H = 0.11;

function makeEnemyHpBar(fig, t, topY) {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(HP_BAR_GEO, HP_FRAME_MAT);
  frame.scale.set(HP_BAR_W + 0.07, HP_BAR_H + 0.07, 1);
  frame.position.z = -0.006;
  frame.renderOrder = 20;
  const bg = new THREE.Mesh(HP_BAR_GEO, new THREE.MeshBasicMaterial({
    color: 0x15101c, transparent: true, opacity: 0.82, depthTest: false, depthWrite: false,
  }));
  bg.scale.set(HP_BAR_W, HP_BAR_H, 1);
  bg.position.z = -0.004;
  bg.renderOrder = 21;
  const fill = new THREE.Mesh(HP_BAR_FILL_GEO, new THREE.MeshBasicMaterial({
    color: 0x9dff6b, transparent: true, opacity: 0.95, depthTest: false, depthWrite: false,
  }));
  fill.scale.set(HP_BAR_W, HP_BAR_H * 0.68, 1);
  fill.position.set(-HP_BAR_W / 2, 0, 0);
  fill.renderOrder = 22;
  g.add(frame, bg, fill);
  for (let i = 1; i < 4; i++) {
    const tick = new THREE.Mesh(HP_BAR_GEO, HP_TICK_MAT);
    tick.scale.set(0.022, HP_BAR_H * 0.92, 1);
    tick.position.set(-HP_BAR_W / 2 + (HP_BAR_W * i) / 4, 0, 0.002);
    tick.renderOrder = 23;
    g.add(tick);
  }
  g.visible = false;
  g.scale.setScalar((t.scale || 1) * 0.95);
  scene.add(g);
  const top = typeof topY === 'number' ? topY : new THREE.Box3().setFromObject(fig.root).max.y;
  return { g, fill, bg, w: HP_BAR_W, y: top + 0.2 };
}

function removeEnemyHpBar(e) {
  const bar = e && e.hpBar;
  if (!bar) return;
  scene.remove(bar.g);
  bar.fill.material.dispose();
  bar.bg.material.dispose();
  e.hpBar = null;
}

function updateEnemyHpBar(e, dt) {
  const bar = e.hpBar;
  if (!bar) return;
  const ratio = clamp(e.hp / e.maxhp, 0, 1);
  // Erst nach dem ersten Treffer zeigen – volle Balken über allen Gegnern
  // würden die Straße zupflastern.
  const show = !e.dead && e.state !== 'ko' && ratio < 0.999;
  bar.g.visible = show;
  if (!show) return;
  bar.g.position.set(e.fig.root.position.x, e.fig.root.position.y + bar.y, e.fig.root.position.z);
  bar.g.quaternion.copy(camera.quaternion);
  bar.fill.scale.x = Math.max(0.0001, bar.w * ratio);
  e.hpFlash = Math.max(0, (e.hpFlash || 0) - dt);
  const col = e.hpFlash > 0 ? 0xffffff
    : e.elite ? (ratio > 0.45 ? 0xffd76e : 0xff5f6d)
    : ratio > 0.6 ? 0x9dff6b : ratio > 0.3 ? 0xffd76e : 0xff5f6d;
  if (col !== e.hpTint) { bar.fill.material.color.setHex(col); e.hpTint = col; }
  bar.fill.material.opacity = e.hpFlash > 0 ? 1 : 0.92;
}

function spawnEnemy(type, x, z, isBoss = false, elite = false) {
  const t = ALL_TYPES[type];
  if (!t) return null;
  const fig = makeFigure(t.pal, t.bulk);
  fig.root.scale.setScalar(t.scale);
  scene.add(fig.root);
  const e = {
    type, isBoss, name: t.name || null, fig, pos: new THREE.Vector3(x, 0, z), y: 0,
    hp: t.hp, maxhp: t.hp, state: 'walk', t: 0, facing: -1, cd: rndRange(0.5, 1.2),
    hitDone: false, walkPhase: 0, dead: false, hitR: 0.25 * t.bulk, kx: 0, kt: 0,
    lanePref: z, deadT: 0, score: t.score || 150, bossTimer: 3.5, stun: 0, id: nextEnemyId++,
    hpFlash: 0, hpTint: 0, elite: false, dmg: t.dmg, speed: t.speed,
  };
  addEnemyProps(e, t);
  if (elite && !isBoss) makeElite(e, t);
  // Einmal die Figurenhöhe messen: Kopfbalken und Schadenszahlen sitzen darauf.
  e.topY = new THREE.Box3().setFromObject(fig.root).max.y;
  // Bosse haben ihre große HUD-Leiste; alle anderen bekommen den Kopfbalken.
  if (!isBoss) e.hpBar = makeEnemyHpBar(fig, t, e.topY);
  enemies.push(e);
  return e;
}

// Farbe für Waffen-Glimmen und Schlagspuren pro Typ.
const ENEMY_FX = {
  punk: 0x9dff6b, runner: 0xffd23f, brute: 0xffb347, guard: 0xbfd2e0, knife: 0xff5f6d,
  gunner: 0xffb347, bomber: 0xff8f4a, shield: 0x6be0ff, ninja: 0x9b6bff, janissary: 0xd9b45a,
};

/* ------------------------------ Elite ------------------------------------ */
// Albtraum-Variante: goldene Aura, Schulterplatten und Krone, dazu mehr
// Leben, Schaden und Tempo. Bosse bleiben Bosse, ihre Wachen sind Eliten.
const ELITE_GOLD = 0xffd76e;
const ELITE_AURA_MAT = new THREE.MeshBasicMaterial({
  color: ELITE_GOLD, transparent: true, opacity: 0.5, side: THREE.DoubleSide,
  depthWrite: false, blending: THREE.AdditiveBlending,
});

function makeElite(e, t) {
  if (!e || e.isBoss || e.elite) return e;
  e.elite = true;
  e.name = `${e.name || e.type} · ELITE`;
  e.maxhp = Math.round(e.maxhp * 1.7);
  e.hp = e.maxhp;
  e.dmg = Math.round((t.dmg || 8) * 1.3);
  e.speed = (t.speed || 2.2) * 1.08;
  e.score = Math.round((e.score || 150) * 2);
  e.fig.root.scale.multiplyScalar(1.06);
  const aura = new THREE.Mesh(RING_GEO, ELITE_AURA_MAT);
  aura.rotation.x = -Math.PI / 2;
  aura.position.y = 0.035;
  aura.scale.setScalar(1.5);
  aura.renderOrder = 3;
  e.fig.root.add(aura);
  e.eliteAura = aura;
  // Goldene Schulterplatten und eine kleine Krone; Janitscharen tragen sie
  // auf dem hohen Filzhut, alle anderen direkt über dem Kopf.
  vox(e.fig.armL, 0, 0.1, 0, 4.2, 1.1, 4.3, ELITE_GOLD, true);
  vox(e.fig.armR, 0, 0.1, 0, 4.2, 1.1, 4.3, ELITE_GOLD, true);
  const crownBase = e.type === 'janissary' ? 11.05 : 5.95;
  for (const [ox, h] of [[-1.45, 0.9], [0, 1.5], [1.45, 0.9]]) {
    vox(e.fig.head, ox, crownBase + h / 2, 0, 0.55, h, 0.55, ELITE_GOLD, true);
  }
  return e;
}

// Ein paar Würfel Requisite pro Typ, damit die zehn Gegner unterscheidbar sind.
// Waffen und Schilde hängen spiegelbildlich an beiden Armen; sichtbar ist immer
// die kameranahe Kopie. So verschwindet die Waffe beim Laufen nicht im Rumpf
// und der Schlagarm ist in jeder Laufrichtung der sichtbare Arm.
function addEnemyProps(e, t) {
  const g = e.fig;
  e.wpnL = [];
  e.wpnR = [];
  const pair = (x, y, z, w, h, d, color, glow = false) => {
    e.wpnL.push(vox(g.armL, -x, y, z, w, h, d, color, glow));
    e.wpnR.push(vox(g.armR, x, y, z, w, h, d, color, glow));
  };
  if (e.type === 'knife' || e.type === 'ninja') {
    pair(0.6, -8.6, 0.6, 0.7, 3.2, 0.7, 0xd9dce8);
  }
  if (e.type === 'gunner') {
    pair(0, -8.4, 1.2, 0.9, 0.9, 3.0, 0x2a2a32);
    pair(0, -8.4, 2.6, 0.5, 0.5, 1.2, 0x4a4a58);
  }
  if (e.type === 'shield' || e.type === 'guard') {
    const s = e.type === 'shield' ? 1.0 : 0.65;
    pair(0.9, -5.4, 1.0, 0.9 * s, 5.6 * s, 4.2 * s, 0x8fa8b8);
    pair(1.35, -5.4, 1.0, 0.3, 4.2 * s, 3.0 * s, 0xd9b45a);
  }
  if (e.type === 'bomber') {
    vox(g.torso, 0, 3.2, -3.4, 3.6, 4.2, 2.2, 0x8a4a1f);
    vox(g.torso, 0, 5.2, -3.4, 1.0, 1.0, 1.0, 0xffb347, true);
  }
  if (e.type === 'janissary') {
    vox(g.head, 0, 8.0, -0.3, 4.0, 4.6, 4.0, 0xe8e2d2);
    vox(g.head, 0, 6.3, -0.3, 4.5, 0.6, 4.5, 0xd9b45a);
  }
  if (e.isBoss) {
    vox(g.head, 0, 8.4, -0.3, 4.4, 4.4, 4.4, t.pal.pads || 0xffd76e);
    vox(g.body, 0, 11.4, -3.0, 8.8, 7.0, 0.6, t.pal.pads || 0xffd76e);
    vox(g.armL, 0, -0.2, 0, 4.8, 2.8, 4.8, t.pal.pads || 0xffd76e);
    vox(g.armR, 0, -0.2, 0, 4.8, 2.8, 4.8, t.pal.pads || 0xffd76e);
  }
}
let nextEnemyId = 1;

/* ------------------------------ Projektil -------------------------------- */
const shots = [];
function fireShot(owner, from, dir, dmg, speed, color, aoe = 0) {
  const m = new THREE.Mesh(BOX, bas(color));
  m.scale.set(0.28, 0.28, 0.7);
  m.position.copy(from);
  scene.add(m);
  shots.push({
    m, pos: from.clone(), dir, dmg, speed, aoe, color, life: 2.2,
    friendly: !!owner.isPlayer, owner,
  });
  ghost(from.x, from.y, from.z, 0xfff1b8, 0.4, 0.1);
  sfx.shoot();
}

function updateShots(dt) {
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i];
    s.life -= dt;
    s.pos.addScaledVector(s.dir, s.speed * dt);
    s.m.position.copy(s.pos);
    s.m.position.y += 0.02 * Math.sin(performance.now() * 0.03);
    // Leuchtspur: Kugeln bleiben als sichtbare Linie im Bild.
    ghost(s.pos.x, s.pos.y, s.pos.z, s.color, 0.2, 0.09);
    let hit = false;
    if (s.friendly) {
      for (const e of enemies) {
        if (e.dead || e.state === 'ko') continue;
        if (Math.abs(e.pos.x - s.pos.x) < 0.75 && Math.abs(e.pos.z - s.pos.z) < 1.0) {
          if (s.aoe) {
            boomShot(s);
          } else {
            damageEnemy(e, s.dmg, true, Math.sign(s.dir.x) || 1, 3.4, s.owner.player || P);
          }
          hit = true; break;
        }
      }
    } else {
      for (const p of players) {
        if (p.dead || p.down || p.inv > 0) continue;
        if (Math.abs(p.pos.x - s.pos.x) < 0.7 && Math.abs(p.pos.z - s.pos.z) < 0.9) {
          hurtPlayer(p, s.dmg, Math.sign(s.dir.x) || 1);
          hit = true; break;
        }
      }
    }
    if (hit || s.life <= 0 || s.pos.x < XMIN - 6 || s.pos.x > XMAX + 6) {
      burst(s.pos.x, s.pos.y, s.pos.z, [0xffd76e, 0xffffff], 5, 2, 0.08);
      scene.remove(s.m);
      shots.splice(i, 1);
    }
  }
}

// Bazooka-Treffer: Flächenschaden, Ringe, Kamera-Stoß
function boomShot(s) {
  const by = s.owner.player || P;
  ring(s.pos.x, 0.5, s.pos.z, 0xffb347, 4.0, 0.5);
  ring(s.pos.x, 0.5, s.pos.z, 0xffffff, 2.4, 0.32);
  burst(s.pos.x, s.pos.y, s.pos.z, [0xffb347, 0xff6f2a, 0xfff1b8, 0xffffff], 34, 7, 0.14);
  screenFlash('#ffb066', 0.4, 0.26);
  shake = 0.4; shakeT = 0.45;
  hitstop = 0.12;
  sfx.boom();
  for (const e of enemies) {
    if (e.dead || e.state === 'ko') continue;
    const d = Math.hypot(e.pos.x - s.pos.x, e.pos.z - s.pos.z);
    if (d <= s.aoe) damageEnemy(e, s.dmg * (d < s.aoe * 0.5 ? 1 : 0.6), true, Math.sign(s.dir.x) || 1, 6, by);
  }
  for (const d of destructibles) {
    if (!d.dead && Math.hypot(d.x - s.pos.x, d.z - s.pos.z) <= s.aoe) damageProp(d, 3, null);
  }
}

/* ------------------------------ Partikel --------------------------------- */
const particles = [];
function burst(x, y, z, colors, n = 10, power = 3, size = 0.1) {
  for (let i = 0; i < n; i++) {
    if (particles.length > 240) break;
    const c = colors[Math.floor(Math.random() * colors.length)];
    const m = new THREE.Mesh(BOX, bas(c));
    const s = size * (0.5 + Math.random());
    m.scale.setScalar(s);
    m.position.set(x, y, z);
    scene.add(m);
    particles.push({
      m, size: s, life: 0.35 + Math.random() * 0.5,
      v: new THREE.Vector3(
        (Math.random() - 0.5) * power,
        Math.random() * power * 0.9 + 0.8,
        (Math.random() - 0.5) * power * 0.8,
      ),
      spin: (Math.random() - 0.5) * 14,
    });
  }
}

// kurzer weißer Aufblitz genau im Trefferpunkt
function impact(x, y, z, color, size) {
  const m = new THREE.Mesh(BOX, bas(color));
  m.position.set(x, y, z);
  m.scale.setScalar(size);
  scene.add(m);
  particles.push({ m, size, life: 0.16, maxLife: 0.16, flash: true, v: new THREE.Vector3(), spin: 8 });
}

/* ------------------------------- Rauch ----------------------------------- */
// Weiche Voxelwolken für beschädigte Requisiten. Eigene Materialien, weil
// jeder Schwaden ausblendet; harte Obergrenze hält die Draw-Calls klein.
const smokePuffs = [];
const SMOKE_MAX = 90;
// Effekt-Zufall getrennt vom Welt-Seed: Rauch darf die Gegnerverteilung nicht verschieben.
const smokeRand = (a, b) => a + Math.random() * (b - a);
let smokeTex = null;
function smokeTexture() {
  if (smokeTex) return smokeTex;
  const cv = document.createElement('canvas');
  cv.width = 64; cv.height = 64;
  const ctx = cv.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 31);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.5)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  smokeTex = new THREE.CanvasTexture(cv);
  smokeTex.colorSpace = THREE.SRGBColorSpace;
  return smokeTex;
}
function smokePuff(x, y, z, color, size = 0.32, life = 1.4, rise = 0.8) {
  if (smokePuffs.length >= SMOKE_MAX) {
    const old = smokePuffs.shift();
    scene.remove(old.m);
    old.m.material.dispose();
  }
  const m = new THREE.Sprite(new THREE.SpriteMaterial({
    map: smokeTexture(), color, transparent: true, opacity: 0.68, depthWrite: false,
  }));
  m.position.set(x + smokeRand(-0.08, 0.08), y, z + smokeRand(-0.08, 0.08));
  m.scale.set(size, size, 1);
  scene.add(m);
  smokePuffs.push({
    m, size, life, maxLife: life, rise,
    vx: smokeRand(-0.18, 0.18), vz: smokeRand(-0.18, 0.18),
    spin: smokeRand(-1.2, 1.2),
  });
}

function updateSmokePuffs(dt) {
  for (let i = smokePuffs.length - 1; i >= 0; i--) {
    const s = smokePuffs[i];
    s.life -= dt;
    const k = clamp(1 - s.life / s.maxLife, 0, 1);
    s.m.position.x += s.vx * dt;
    s.m.position.y += s.rise * dt;
    s.m.position.z += s.vz * dt;
    s.rise += dt * 0.35;
    const sc = s.size * (1 + k * 2.1);
    s.m.scale.set(sc, sc, 1);
    s.m.material.opacity = 0.68 * Math.pow(1 - k, 1.5);
    s.m.material.rotation += s.spin * dt * 0.12;
    if (s.life <= 0) {
      scene.remove(s.m);
      s.m.material.dispose();
      smokePuffs.splice(i, 1);
    }
  }
}

function clearSmokePuffs() {
  for (const s of smokePuffs) {
    scene.remove(s.m);
    s.m.material.dispose();
  }
  smokePuffs.length = 0;
}

// Schockwellen-Ringe für schwere Treffer und den Spezial-Angriff
const rings = [];
function destroyRings() {
  for (const r of rings) { scene.remove(r.m); r.m.material.dispose(); }
  rings.length = 0;
}
const RING_GEO = new THREE.RingGeometry(0.68, 0.86, 32);
function ring(x, y, z, color, maxR = 3, life = 0.4) {
  const m = new THREE.Mesh(RING_GEO, new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0.5, side: THREE.DoubleSide,
    depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  m.position.set(x, y, z);
  scene.add(m);
  rings.push({ m, life, maxLife: life, maxR });
}
function updateRings(dt) {
  for (let i = rings.length - 1; i >= 0; i--) {
    const r = rings[i];
    r.life -= dt;
    const p = clamp(1 - r.life / r.maxLife, 0, 1);
    r.m.scale.setScalar(1 + p * r.maxR);
    r.m.material.opacity = (1 - p) * 0.5;
    if (r.life <= 0) {
      scene.remove(r.m);
      r.m.material.dispose();
      rings.splice(i, 1);
    }
  }
}

// kurzer Nachzieh-Schatten (z. B. für die Kick-Spur)
const _tv = new THREE.Vector3();
function ghost(x, y, z, color, size = 0.18, life = 0.15) {
  const m = new THREE.Mesh(BOX, bas(color));
  m.position.set(x, y, z);
  m.scale.setScalar(size);
  scene.add(m);
  particles.push({ m, size, life, maxLife: life, flash: true, v: new THREE.Vector3(), spin: 0 });
}

function screenFlash(color, amount, dur) {
  flashEl.style.background = color;
  flashAmt = amount;
  flashMax = dur;
  flashT = dur;
  flashEl.style.opacity = String(amount);
}

/* ============================== INPUT ==================================== */
const keys = Object.create(null);
let restartRequested = false;
let paused = false;

function actionFor(p, code) {
  const c = CONTROLS[p.id];
  if (code === c.punch) return 'punch';
  if (code === c.kick) return 'kick';
  if (code === c.special) return 'special';
  if (code === c.jump) return 'jump';
  if (code === c.grapple) return 'grapple';
  if (code === c.mount) return 'mount';
  return null;
}

function doAction(p, action) {
  // Wer am Boden liegt, kann nichts auslösen – auch nicht über Gast-Eingaben.
  if (!p || p.down || p.dead) return;
  if (action === 'punch') tryAttack(p, 'punch');
  else if (action === 'kick') tryAttack(p, 'kick');
  else if (action === 'special') trySpecial(p);
  else if (action === 'jump') { if (p.mount) donkeyHop(p); else jumpPlayer(p); }
  else if (action === 'grapple') tryGrapple(p);
  else if (action === 'mount') tryMount(p);
}

addEventListener('keydown', (ev) => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(ev.code)) ev.preventDefault();
  if (ev.repeat) return;
  keys[ev.code] = true;
  audio();
  // ESC pausiert; wo ESC vom Browser belegt ist (z. B. Vollbild), geht auch P.
  if (ev.code === 'Escape' || ev.code === 'KeyP') {
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (started) togglePause();
    return;
  }
  // In der Pause reagieren nur Neustart und Musik; Angriffe, Sprünge und Greifen nicht.
  if (paused) {
    if (ev.code === 'KeyR') restartRequested = true;
    if (ev.code === 'KeyM') {
      muted = !muted;
      music.setMuted(muted);
      // Nicht mitten in der Pause starten: erst beim Weiterlaufen ansetzen.
      if (muted) music.stop();
      else currentTrackKey = null;
    }
    return;
  }
  if (!started) return;

  if (net.role === 'guest') {
    net.send({ t: 'k', code: ev.code, down: true });
    const a = actionFor(P2, ev.code);
    if (a) net.send({ t: 'act', a });
    return;
  }

  for (const p of players) {
    if (p.remote) continue;
    const a = actionFor(p, ev.code);
    if (a) doAction(p, a);
  }

  if (ev.code === 'KeyM') {
    muted = !muted;
    music.setMuted(muted);
    if (muted) music.stop();
    else { currentTrackKey = null; playTrackForWave(); }
    toast(muted ? 'MUSIK AUS' : 'MUSIK AN');
  }
  if (ev.code === 'KeyR') restartRequested = true;
});
addEventListener('keyup', (ev) => {
  keys[ev.code] = false;
  if (net.role === 'guest' && started) net.send({ t: 'k', code: ev.code, down: false });
});

/* ============================== KAMPF ==================================== */
function nearestEnemyTo(p, maxDist = 1e9) {
  let best = null, bd = maxDist;
  for (const e of enemies) {
    if (e.dead || e.state === 'ko') continue;
    const d = Math.abs(e.pos.x - p.pos.x) + Math.abs(e.pos.z - p.pos.z) * 0.5;
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

function nearestPlayerTo(e) {
  let best = null, bd = 1e9;
  for (const p of players) {
    if (p.dead || p.down) continue;
    const d = Math.abs(p.pos.x - e.pos.x) + Math.abs(p.pos.z - e.pos.z) * 0.5;
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}

function jumpPlayer(p) {
  if (p.dead || p.down || p.state === 'ko' || p.state === 'hurt' || p.y > 0 || p.mount || p.grab) return;
  p.vy = 6.4;
  p.state = 'jump';
  p.t = 0;
}

function tryAttack(p, kind = 'punch') {
  if (p.dead || p.down || p.state === 'ko' || p.state === 'hurt') return;
  // Im Sattel: J = Fronttritt, K = Drehtritt. Der Superkick liegt auf L.
  if (p.mount) {
    if (kind === 'kick') donkeySpinKick(p);
    else donkeyFrontKick(p);
    return;
  }
  if (p.grab) { throwGrab(p); return; }
  // Eingabepuffer: Taste während einer laufenden Attacke geht nicht verloren
  if (p.state === 'attack' || p.state === 'special' || p.state === 'airkick' || p.state === 'grapple') {
    p.buffer = { kind, t: 0.45 };
    return;
  }
  // Sprungangriff: in der Luft wird aus dem Schlag ein Divekick
  if (p.y > 0.3) {
    p.state = 'airkick';
    p.t = 0;
    p.hitDone = false;
    p.airKick = true;
    p.vy = -7.6;
    p.move = 'kick';
    // Ein Sprungangriff beendet die Bodenkette.
    p.chainKind = null; p.chainN = 0; p.chainT = 0;
    sfx.kick();
    if (p.weapon) useWeaponCharge(p);
    return;
  }
  // Schlag-Taste (J bzw. P2-Komma) nimmt Beute in Reichweite auf.
  if (kind === 'punch' && tryPickup(p)) return;
  if (p.weapon && p.weapon.kind === 'gun' && kind === 'punch') { shootWeapon(p); return; }

  const kindKey = kind === 'kick' ? 'kick' : 'punch';
  const tab = MOVES[kindKey];
  const last = tab.dur.length - 1;
  // Kette: gleiche Taste innerhalb des Fensters schaltet eine Stufe weiter.
  // Waffen unterbrechen die Faustkette, weil sie ihre eigenen Werte nutzen.
  const chained = !p.weapon && p.chainKind === kindKey && p.chainT > 0;
  p.move = kindKey;
  p.atkIdx = chained ? (p.chainN < last ? p.chainN + 1 : 0) : 0;
  p.chainKind = p.weapon ? null : kindKey;
  p.chainN = p.weapon ? 0 : p.atkIdx;
  p.chainT = p.weapon ? 0 : tab.dur[p.atkIdx] + MOVES.chainWindow;
  p.state = 'attack';
  p.t = 0;
  p.hitDone = false;
  const finisher = p.atkIdx === tab.finisher;

  const near = nearestEnemyTo(p);
  if (near && Math.abs(near.pos.x - p.pos.x) < 4.5) {
    p.facing = Math.sign(near.pos.x - p.pos.x) || p.facing;
  }  if (p.move === 'kick') { if (finisher) sfx.swingBig(); else sfx.kick(); }
  else if (finisher) sfx.swingBig();
  else sfx.swing();
}

function trySpecial(p) {
  if (p.dead || p.down || p.state === 'ko' || p.state === 'hurt' || p.state === 'special') return;
  // Im Sattel ist L der Superkick – aber nur bei vollem Energiebalken.
  if (p.mount) {
    if (p.state !== 'ride' || p.meter < 100) return;
    p.meter = 0;
    updateMeter(p);
    donkeyKick(p);
    return;
  }
  if (p.meter < 100 || p.y > 0) return;
  p.meter = 0;
  updateMeter(p);
  p.state = 'special';
  p.t = 0;
  p.hitDone = false;
  p.spin = 0;
  p.inv = Math.max(p.inv, 1.4);
  p.buffer = null;
  if (p.grab) releaseGrab(p, false);
  showSlapHand(p);
  sfx.slapWind();
}

// Die Osmanische Schelle: ein wuchtiger Handkantenschlag nach vorn.
// Trifft alles im breiten Halbkreis vor dem Spieler und schleudert es weg.
function specialStrike(p) {
  const dir = p.facing;
  // Beim Treffer die aktuelle Gegnerposition übernehmen (nicht die aus dem Ausholen).
  p.slapReach = slapReach(p);
  let hits = 0;
  for (const e of enemies) {
    if (e.dead || e.state === 'ko') continue;
    const dx = (e.pos.x - p.pos.x) * dir;
    const dz = e.pos.z - p.pos.z;
    if (dx > -0.7 && dx < 4.1 && Math.abs(dz) < 2.25) {
      damageEnemy(e, p.weapon ? 82 : 70, true, dir, 12.5, p);
      e.stun = Math.max(e.stun, 1.0);
      slapMark(e, dir);
      hits += 1;
    }
  }
  for (const d of destructibles) {
    if (d.dead) continue;
    const dx = (d.x - p.pos.x) * dir;
    const hw = d.halfW || 0.5, hd = d.halfD || 0.5;
    if (dx > -0.6 - hw && dx < 4.2 + hw && Math.abs(d.z - p.pos.z) < 2.4 + hd) {
      damageProp(d, 99, p);
    }
  }

  const hand = p.slapHand && p.slapHand.visible ? p.slapHand.position : null;
  const hx = hand ? hand.x : p.pos.x + dir * 2.1;
  const hy = hand ? hand.y : 1.25 + p.y;
  const hz = hand ? hand.z : p.pos.z;
  // Handkante: breiter goldener Fächer genau auf Schlaghöhe.
  // Effekte liegen HINTER der Hand (kleineres z), damit das Handmodell
  // sichtbar bleibt und nicht von weißen Würfeln überdeckt wird.
  for (let i = 0; i < 5; i++) {
    const a = -0.8 + (i / 4) * 1.6;
    ghost(hx + Math.cos(a) * 0.55, hy + Math.sin(a) * 0.5, hz - 0.5,
      i % 2 ? 0xfff1b8 : 0xffb347, 0.18, 0.18);
  }
  // Schockwellen hinter der Hand, nicht davor – sonst verdecken sie das Modell.
  ring(hx, hy, hz - 0.5, 0xffd76e, 1.9, 0.38);
  ring(hx, hy, hz - 0.45, 0xff6f9b, 1.1, 0.26);
  burst(hx, hy, hz - 0.4, [0xffd76e, 0xffb347, 0xff6f9b], 18, 5, 0.09);
  shake = 0.55; shakeT = 0.6;
  hitstop = 0.13;
  timeScale = 0.35;
  fovPunch = 1;
  screenFlash('#ffe6b0', 0.3, 0.22);
  slapText(hx, hy + 1.15, hz + 0.75);
  banner(hits > 0 ? 'ŞAK! OSMANISCHE SCHELLE' : 'OSMANISCHE SCHELLE');
  sfx.slap();
  if (hits > 0) addMeter(p, 10);
}

/* ------------------- Osmanische Schelle: Hand & Abdruck ------------------ */
// Ohne ein sichtbares Handmodell war der Spezialangriff nur ein Partikelblitz.
// Jetzt holt eine riesige offene Hand aus, zieht durch und hinterlässt auf
// jedem Getroffenen einen roten Handabdruck.
const SLAP_SKIN = 0xd9a574;
const SLAP_LIGHT = 0xe8b98a;

function makeSlapHandMesh() {
  const g = new THREE.Group();
  // Handfläche: flach, Fingerspitzen nach oben, Handrücken zum Arm hin.
  vox(g, 0, 0, 0, 6.8, 7.2, 1.9, SLAP_SKIN);
  vox(g, 0, 0, -1.0, 6.0, 6.2, 0.5, 0xc98d68);   // Handrücken dunkler
  vox(g, 0, 0, 1.0, 5.6, 5.6, 0.5, SLAP_LIGHT);   // Handfläche heller
  vox(g, 0, 3.4, 0, 6.9, 1.2, 2.0, SLAP_LIGHT);   // Knöchelkante
  // Vier deutlich getrennte Finger: Lücken bleiben auch aus der Ferne sichtbar.
  const lens = [5.0, 6.4, 5.8, 4.6];
  for (let i = 0; i < 4; i++) {
    const fx = -2.7 + i * 1.8;
    const len = lens[i];
    vox(g, fx, 3.6 + len / 2, 0, 1.15, len, 1.8, SLAP_SKIN);
    // dunkle Kante an jeder Fingerseite
    vox(g, fx - 0.62, 3.6 + len / 2, 0, 0.18, len + 0.1, 1.7, 0xb87c58);
    vox(g, fx, 4.2, 0.02, 1.2, 0.5, 1.85, 0xc98d68);        // Fingerwurzel
    vox(g, fx, 3.6 + len + 0.35, 0, 1.05, 0.7, 1.7, SLAP_LIGHT); // Fingerspitze
  }
  // Daumen seitlich abgespreizt
  const thumb = vox(g, -4.1, -1.3, 0, 1.4, 4.0, 1.8, SLAP_SKIN);
  thumb.rotation.z = 0.72;
  // Handgelenk und goldener Reif
  vox(g, 0, -5.2, 0, 4.2, 3.2, 2.1, SLAP_SKIN);
  vox(g, 0, -6.4, 0, 4.8, 1.0, 2.5, 0xd9b45a);
  return g;
}

function showSlapHand(p) {
  if (!p.slapHand) {
    p.slapHand = makeSlapHandMesh();
    scene.add(p.slapHand);
  }
  if (!p.slapSleeve) {
    p.slapSleeve = new THREE.Mesh(BOX, lam(0x2f5a4a));
    p.slapSleeve.castShadow = true;
    scene.add(p.slapSleeve);
  }
  p.slapHand.visible = true;
  p.slapSleeve.visible = true;
  p.slapHand.scale.setScalar(0.9);
}

function hideSlapHand(p) {
  if (p.slapHand) p.slapHand.visible = false;
  if (p.slapSleeve) p.slapSleeve.visible = false;
}

// Nächster Gegner vor dem Spieler: die Hand stoppt dort, statt ins Leere zu
// greifen (die Trefferzone reicht bis 4,1 Einheiten).
function slapReach(p) {
  let best = 2.2;
  for (const e of enemies) {
    if (e.dead || e.state === 'ko') continue;
    const dx = (e.pos.x - p.pos.x) * p.facing;
    if (dx > 0.3 && dx < 4.1 && Math.abs(e.pos.z - p.pos.z) < 2.0) {
      // Mindestens 2,3 Einheiten: die Hand soll ausfahren, nicht am Körper kleben.
      best = clamp(dx + 0.2, 2.3, 3.3);
      break;
    }
  }
  return best;
}

// Ausholen -> durchziehen -> nachziehen, alles in Weltkoordinaten.
function updateSlapHand(p) {
  const h = p.slapHand;
  if (!h || !h.visible) return;
  const f = p.facing;
  const t = p.t;
  // Reichweite einmal vor dem Treffer festhalten: sonst zieht die Hand zurück,
  // sobald der Gegner durch den Treffer auf K.O. geht.
  if (t < 0.44) p.slapReach = slapReach(p);
  const reach = p.slapReach || 2.2;
  let x, y, z, s, roll, yaw;
  if (t < 0.32) {
    const k = clamp(t / 0.32, 0, 1);
    x = p.pos.x - f * (0.95 - 0.5 * k);
    y = 1.5 + p.y - 0.14 * k;
    z = p.pos.z + 0.28;
    s = 0.45 + 0.5 * easeOut(k);
    roll = f * (0.85 - 0.45 * k);
    yaw = f * -0.5;
  } else if (t < 0.52) {
    const k = easeOut(clamp((t - 0.32) / 0.2, 0, 1));
    x = p.pos.x + f * lerp(-0.55, reach, k);
    y = 1.18 + p.y - 0.06 * k;
    z = p.pos.z + 0.6;
    s = 0.95 + 0.15 * k;
    roll = f * lerp(0.45, -0.28, k);
    yaw = f * lerp(-0.5, 0.5, k);
  } else {
    const k = clamp((t - 0.52) / 0.33, 0, 1);
    x = p.pos.x + f * (reach + 0.4 * k);
    y = 1.12 + p.y - 0.2 * k;
    z = p.pos.z + 0.6 - 0.14 * k;
    s = lerp(1.1, 0.4, k);
    roll = f * -0.28;
    yaw = f * 0.5;
  }
  h.position.set(x, y, z);
  h.rotation.set(0, yaw, roll);
  h.scale.setScalar(s * 0.95);

  // Ärmel vom Spieler zur Hand: verbindet die Riesenfhand mit dem Körper.
  if (p.slapSleeve) {
    const sx = p.pos.x + f * 0.4, sy = 1.62 + p.y, sz = p.pos.z - 0.1;
    const ex = x - f * 0.15, ey = y - 0.55, ez = z - 0.1;
    const dx = ex - sx, dy = ey - sy, dz = ez - sz;
    const len = Math.max(0.1, Math.hypot(dx, dy, dz));
    p.slapSleeve.position.set(sx + dx / 2, sy + dy / 2, sz + dz / 2);
    p.slapSleeve.rotation.set(0, Math.atan2(dx, dz), 0);
    p.slapSleeve.scale.set(0.26, 0.24, len);
  }
}

// Partikel-Effekte der Schelle (Handabdruck + „ŞAK!“-Schrift) laufen separat,
// weil sie als Sprites der Kamera zugewandt bleiben müssen.
const slapFx = [];
const slapTexCache = new Map();

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function handprintTexture(color) {
  const key = `mark|${color}`;
  const hit = slapTexCache.get(key);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 320;
  const ctx = cv.getContext('2d');
  ctx.translate(128, 300);
  ctx.fillStyle = color;
  // Handfläche
  ctx.beginPath();
  ctx.ellipse(0, -108, 62, 76, 0, 0, Math.PI * 2);
  ctx.fill();
  // vier Finger
  const fw = 30, fh = [96, 112, 104, 88];
  for (let i = 0; i < 4; i++) {
    const fx = -48 + i * 32;
    ctx.save();
    ctx.translate(fx, -170);
    ctx.rotate((i - 1.5) * 0.13);
    roundRectPath(ctx, -fw / 2, -fh[i] / 2, fw, fh[i], 15);
    ctx.fill();
    ctx.restore();
  }
  // Daumen
  ctx.save();
  ctx.translate(-70, -96);
  ctx.rotate(0.85);
  roundRectPath(ctx, -18, -56, 36, 112, 18);
  ctx.fill();
  ctx.restore();
  // Handgelenk
  roundRectPath(ctx, -42, -46, 84, 46, 16);
  ctx.fill();
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  slapTexCache.set(key, tex);
  return tex;
}

function slapTextTexture() {
  const key = 'sak';
  const hit = slapTexCache.get(key);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 256;
  const ctx = cv.getContext('2d');
  ctx.font = 'italic 900 150px ui-monospace, Consolas, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 26;
  ctx.strokeStyle = '#1a0710';
  ctx.strokeText('ŞAK!', 256, 128);
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#ff2f6d';
  ctx.strokeText('ŞAK!', 256, 128);
  ctx.fillStyle = '#fff3c4';
  ctx.fillText('ŞAK!', 256, 128);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  slapTexCache.set(key, tex);
  return tex;
}

function slapMark(e) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({
    map: handprintTexture('rgba(255, 58, 86, 0.95)'),
    transparent: true, depthWrite: false, depthTest: false,
  }));
  sp.scale.set(0.5, 0.62, 1);
  sp.position.set(e.pos.x, 1.2 + e.y, e.pos.z + 0.62);
  sp.material.rotation = (Math.random() - 0.5) * 0.5;
  sp.renderOrder = 30;
  scene.add(sp);
  slapFx.push({ obj: sp, life: 1.3, maxLife: 1.3, anchor: e });
}

function slapText(x, y, z) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({
    map: slapTextTexture(), transparent: true, depthWrite: false, depthTest: false,
  }));
  sp.scale.set(2.0, 1.0, 1);
  sp.position.set(x, y, z);
  sp.renderOrder = 31;
  scene.add(sp);
  slapFx.push({ obj: sp, life: 0.85, maxLife: 0.85, rise: 1.1, grow: 0.9 });
}

function updateSlapFx(dt) {
  for (let i = slapFx.length - 1; i >= 0; i--) {
    const f = slapFx[i];
    f.life -= dt;
    const k = clamp(1 - f.life / f.maxLife, 0, 1);
    if (f.anchor && !f.anchor.dead) {
      f.obj.position.set(f.anchor.pos.x, 1.2 + f.anchor.y, f.anchor.pos.z + 0.62);
    } else if (f.rise) {
      f.obj.position.y += f.rise * dt;
    }
    if (f.grow) f.obj.scale.multiplyScalar(1 + f.grow * dt);
    f.obj.material.opacity = clamp(1 - k * k, 0, 1);
    if (f.life <= 0) {
      scene.remove(f.obj);
      f.obj.material.dispose();
      slapFx.splice(i, 1);
    }
  }
}

function clearSlapFx() {
  for (const f of slapFx) {
    scene.remove(f.obj);
    f.obj.material.dispose();
  }
  slapFx.length = 0;
  for (const p of players) hideSlapHand(p);
}

/* ------------------------- Schadenszahlen -------------------------------- */
// Aufsteigende Zahlen über dem Gegner. Die Farbe sagt, wie schwer der Treffer
// war: hell (leicht) → gold → orange → rot (Finisher, Schelle, Bazooka).
const DMG_TIERS = [
  { min: 0, color: '#fff3c4', hi: '#ffffff', edge: '#5a3410', scale: 0.72 },
  { min: 15, color: '#ffd76e', hi: '#fff3c4', edge: '#5a3410', scale: 0.86 },
  { min: 30, color: '#ff9a3c', hi: '#ffd9a0', edge: '#4a1a0a', scale: 1.0 },
  { min: 50, color: '#ff3a5e', hi: '#ffb3c4', edge: '#3a0710', scale: 1.15 },
];
const DMG_MAX = 48;
const dmgTexCache = new Map();
const damageFx = [];
const dmgNetQueue = [];

function dmgTierIndex(dmg) {
  let idx = 0;
  for (let i = 1; i < DMG_TIERS.length; i++) if (dmg >= DMG_TIERS[i].min) idx = i;
  return idx;
}

function damageTexture(dmg, ti) {
  const key = `${dmg}|${ti}`;
  const hit = dmgTexCache.get(key);
  if (hit) return hit;
  const tier = DMG_TIERS[ti];
  const label = String(dmg);
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 128;
  const ctx = cv.getContext('2d');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${label.length > 2 ? 88 : 108}px ui-monospace, Consolas, monospace`;
  // Sehr breite Zahlen passend verkleinern, damit nichts abgeschnitten wird.
  const measured = ctx.measureText(label).width;
  if (measured > 224) ctx.font = `900 ${Math.floor((label.length > 2 ? 88 : 108) * 224 / measured)}px ui-monospace, Consolas, monospace`;
  ctx.lineJoin = 'round';
  // Voxel-Schatten versetzt nach unten rechts.
  ctx.fillStyle = 'rgba(18, 6, 14, .85)';
  ctx.fillText(label, 132, 70);
  ctx.lineWidth = 18;
  ctx.strokeStyle = tier.edge;
  ctx.strokeText(label, 128, 64);
  ctx.fillStyle = tier.color;
  ctx.fillText(label, 128, 64);
  // Glanzkante oben links, damit die Zahl plastisch wirkt.
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = tier.hi;
  ctx.fillText(label, 126, 60);
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  dmgTexCache.set(key, tex);
  return tex;
}

function showDamageNumber(x, z, dmg, y) {
  const amount = Math.max(1, Math.round(dmg));
  const ti = dmgTierIndex(amount);
  const tier = DMG_TIERS[ti];
  const digits = String(amount).length;
  const w = (0.58 + 0.4 * digits) * tier.scale;
  const h = w * 0.5;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({
    map: damageTexture(amount, ti),
    transparent: true, depthWrite: false, depthTest: false,
  }));
  sp.scale.set(w, h, 1);
  const baseY = (typeof y === 'number' ? y : 2.1) + rndRange(-0.05, 0.12);
  sp.position.set(x + rndRange(-0.2, 0.2), baseY, z + 0.5 + rndRange(-0.05, 0.05));
  sp.renderOrder = 42;
  scene.add(sp);
  damageFx.push({
    sp, w, h, life: 0.8, maxLife: 0.8,
    vy: 1.05 + Math.random() * 0.3, drift: rndRange(-0.42, 0.42),
  });
  // Bei Flächenangriffen nicht unbegrenzt Sprites anhäufen.
  while (damageFx.length > DMG_MAX) {
    const old = damageFx.shift();
    scene.remove(old.sp);
    old.sp.material.dispose();
  }
}

// Position über dem Kopf: hpBar.y ist bereits Kopfhöhe + 0,2.
function damageNumberHeight(e) {
  const top = e.hpBar && e.hpBar.y ? e.hpBar.y : (e.topY || 2.0) + 0.2;
  return (e.fig ? e.fig.root.position.y : e.y || 0) + top + 0.35;
}

function updateDamageNumbers(dt) {
  for (let i = damageFx.length - 1; i >= 0; i--) {
    const f = damageFx[i];
    f.life -= dt;
    const k = clamp(1 - f.life / f.maxLife, 0, 1);
    // Schnell aufsteigen, kurz aufploppen, dann sanft ausblenden.
    f.sp.position.y += f.vy * dt * (1 - k * 0.6);
    f.sp.position.x += f.drift * dt;
    const pop = k < 0.18 ? 0.55 + (k / 0.18) * 0.6 : 1.15 - Math.min(0.15, (k - 0.18) * 0.3);
    f.sp.scale.set(f.w * pop, f.h * pop, 1);
    f.sp.material.opacity = f.life < 0.3 ? Math.max(0, f.life / 0.3) : 1;
    if (f.life <= 0) {
      scene.remove(f.sp);
      f.sp.material.dispose();
      damageFx.splice(i, 1);
    }
  }
}

function clearDamageNumbers() {
  for (const f of damageFx) {
    scene.remove(f.sp);
    f.sp.material.dispose();
  }
  damageFx.length = 0;
  dmgNetQueue.length = 0;
}

function addMeter(p, n) {
  if (!p) return;
  p.meter = clamp(p.meter + n, 0, 100);
  updateMeter(p);
}

function playerStrike(p) {
  const tab = MOVES[p.move] || MOVES.punch;
  const i = clamp(p.atkIdx | 0, 0, tab.dur.length - 1);
  const finisher = i === tab.finisher;
  let reach = tab.reach[i];
  let dmg = tab.dmg[i];
  const weapon = p.weapon && p.weapon.kind === 'melee' ? p.weapon : null;
  if (weapon && p.move === 'punch') { reach = weapon.reach; dmg = weapon.dmg; }
  const heavy = !!weapon || finisher;
  const knock = weapon ? 6.4 : tab.knock[i];
  let hitAny = false;

  for (const e of enemies) {
    if (e.dead || e.state === 'ko') continue;
    const dx = (e.pos.x - p.pos.x) * p.facing;
    const dz = Math.abs(e.pos.z - p.pos.z);
    const dy = Math.abs(e.y - p.y);
    if (dx > -0.55 && dx < reach + e.hitR && dz < 1.05 && dy < 1.5) {
      let mult = 1;
      // Garde und Schildträger blocken frontale Treffer teilweise ab
      if ((e.type === 'guard' || e.type === 'shield') && e.state !== 'hurt' && e.state !== 'grabbed') {
        if (Math.sign(p.pos.x - e.pos.x) === e.facing && Math.random() < (ALL_TYPES[e.type].block || 0)) {
          mult = 0.35;
          impact(e.pos.x - e.facing * 0.8, 1.2, e.pos.z, 0x8fb8ff, 0.5);
          ring(e.pos.x - e.facing * 0.8, 1.2, e.pos.z, 0x8fb8ff, 1.6, 0.2);
          sfx.block();
        }
      }
      damageEnemy(e, dmg * mult, heavy, p.facing, knock, p);
      hitAny = true;
      if (weapon) break;
    }
  }

  // Requisiten zerlegen (Voxel-Physik-Schaufenster)
  for (const d of destructibles) {
    if (d.dead) continue;
    const dx = (d.x - p.pos.x) * p.facing;
    const hw = d.halfW || 0.5, hd = d.halfD || 0.5;
    if (dx > -0.6 - hw && dx < reach + 0.5 + hw && Math.abs(d.z - p.pos.z) < 1.3 + hd) {
      damageProp(d, heavy ? 2 : 1, p);
      hitAny = true;
    }
  }

  if (weapon) useWeaponCharge(p);

  if (hitAny) {
    hitstop = weapon ? 0.1 : tab.hs[i];
    shake = heavy ? 0.14 : 0.05;
    shakeT = 0.24;
    if (heavy) fovPunch = Math.min(1, fovPunch + 0.4);
    p.combo += 1;
    p.comboT = 1.5;
    showCombo();
    if (heavy) {
      if (p.move === 'punch' && finisher && !weapon) sfx.slap();
      else sfx.heavy();
    }
    if (p.move === 'punch' && !weapon) {
      // Uppercut und Kopfnuss bekommen eigene Trefferringe auf ihrer Höhe.
      const hx = p.pos.x + p.facing * 0.9;
      if (i === 2) {
        ring(hx, 1.5, p.pos.z, 0xffd76e, 2.0, 0.26);
        impact(hx, 1.45, p.pos.z, 0xffe9a8, 0.42);
      } else if (i === 3) {
        ring(p.pos.x + p.facing * 0.7, 1.72, p.pos.z, 0xffffff, 1.4, 0.18);
        sfx.heavy();
      }
    }
    if (finisher && !weapon) {
      // Ketten-Finisher: eigener Ring, Blitz und ein Schubs Kamera.
      const hx = p.pos.x + p.facing * (reach * 0.6);
      ring(hx, 1.0, p.pos.z, p.move === 'kick' ? 0x6be0ff : 0xffd76e, p.move === 'kick' ? 3.4 : 2.7, 0.34);
      impact(hx, 1.15, p.pos.z, 0xffffff, 0.6);
      screenFlash(p.move === 'kick' ? '#bfe9ff' : '#ffe9b0', 0.2, 0.16);
      shake = Math.max(shake, 0.18);
      shakeT = Math.max(shakeT, 0.3);
      fovPunch = Math.min(1, fovPunch + 0.5);
    }
  }
}

function damageEnemy(e, dmg, heavy, dir, knock = heavy ? 5.2 : 2.4, by = P, silent = false) {
  e.hp -= dmg;
  e.hpFlash = 0.14;
  // Ein Treffer unterbricht auch einen laufenden Sprungschlag.
  e.leapFromX = null;
  // Schadenszahl exakt am Treffer, gefärbt nach Schwere.
  showDamageNumber(e.pos.x, e.pos.z, dmg, damageNumberHeight(e));
  if (net.role === 'host' && net.ws && net.ws.readyState === 1) {
    dmgNetQueue.push([e.id, Math.round(dmg)]);
    if (dmgNetQueue.length > 24) dmgNetQueue.shift();
  }
  if (e.state !== 'grabbed') { e.state = 'hurt'; e.t = 0; }
  e.kx = dir * knock;
  e.kt = heavy ? 0.3 : 0.16;
  const pal = (ALL_TYPES[e.type] || {}).pal || {};
  const cols = Object.values(pal).filter((c) => typeof c === 'number');
  // Trefferpunkt vor dem Gegner, nicht in seinem Körper
  const hx = e.pos.x - dir * 0.35;
  const hy = 1.15 + e.y;
  burst(hx, hy, e.pos.z, [0xffffff, 0xffd76e, 0xff6f9b, ...cols], heavy ? 16 : 9, heavy ? 4.5 : 2.8, 0.12);
  impact(hx, hy, e.pos.z, heavy ? 0xffffff : 0xffe9a8, heavy ? 0.5 : 0.32);
  const kickHit = by.move === 'kick';
  ring(hx, kickHit ? 1.0 : hy, e.pos.z, kickHit ? 0x6be0ff : heavy ? 0xffd76e : 0xffffff, heavy ? 2.8 : 1.6, heavy ? 0.34 : 0.22);
  if (heavy) screenFlash(kickHit ? '#bfe9ff' : '#ffd9a0', 0.22, 0.16);
  if (!silent) addMeter(by, heavy ? 12 : 7);
  sfx.hit();
  if (e.isBoss) updateBossBar(e);

  if (e.hp <= 0) {
    e.state = 'ko';
    e.t = 0;
    // Wer im Flug erledigt wird, fällt sofort herunter statt weiterzufliegen.
    if (e.thrown) {
      e.thrown = null;
      e.y = 0;
      if (e.fig) e.fig.root.rotation.z = 0;
    }
    if (e.hpBar) e.hpBar.g.visible = false;
    e.deadT = 0;
    addScore(e.score, by);
    addMeter(by, 10);
    sfx.ko();
    burst(e.pos.x, 1.0, e.pos.z, cols, 26, 5, 0.11);
    ring(e.pos.x, 0.9, e.pos.z, 0xffd76e, 3.2, 0.4);
    shake = Math.max(shake, 0.16);
    shakeT = Math.max(shakeT, 0.3);
    // Bomber nehmen beim K.O. alles im Umkreis mit
    if (e.type === 'bomber') {
      ring(e.pos.x, 0.6, e.pos.z, 0xff8f4a, 3.4, 0.45);
      burst(e.pos.x, 0.8, e.pos.z, [0xff8f4a, 0xffd76e, 0x8a4a1f], 30, 6, 0.13);
      screenFlash('#ffb066', 0.25, 0.2);
      sfx.boom();
      for (const p of players) {
        if (Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z) < 2.6) {
          hurtPlayer(p, e.elite ? 19 : 14, Math.sign(p.pos.x - e.pos.x) || 1);
        }
      }
    }
    if (e.isBoss) {
      hideBossBar();
      banner(`${e.name} BESIEGT`);
      screenFlash('#ffd76e', 0.5, 0.5);
      timeScale = 0.35;
      addMeter(by, 40);
      spawnPickup('doner', e.pos.x - 1.3, clamp(e.pos.z, -1.4, 1.4));
      spawnPickup('weapon', e.pos.x + 1.3, clamp(e.pos.z, -1.4, 1.4));
    } else if (Math.random() < diffCfg().drop + (e.elite ? 0.15 : 0)) {
      // Beute fällt deutlich seltener — sonst liegt nach jedem Kampf die halbe Straße voll.
      const dz = clamp(e.pos.z, -1.4, 1.4);
      if (Math.random() < diffCfg().weaponDrop) {
        spawnPickup('weapon', e.pos.x, dz);
      } else {
        const r = Math.random();
        spawnPickup(r < 0.4 ? 'gold' : r < 0.75 ? 'doner' : 'ayran', e.pos.x, dz);
      }
    }
  }
}

/* ------------------------ Angriffsstile der Gegner ----------------------- */
// Jeder Typ kämpft anders: weiter Schwinger, schmaler Stich mit Ausfallschritt,
// Schildstoß mit viel Rückstoß, langsamer Überkopfschlag oder Sprungschlag mit
// Flächenschaden. Die Werte steuern zugleich Animation und Trefferfenster.
const ENEMY_STYLES = {
  swing: { windup: 0.52, strike: 0.34, hitAt: 0.11, reach: 0.5, spread: 1.1, knock: 3.0, lunge: 0 },
  stab:  { windup: 0.34, strike: 0.26, hitAt: 0.07, reach: 0.8, spread: 0.7, knock: 2.6, lunge: 6.5 },
  bash:  { windup: 0.46, strike: 0.4, hitAt: 0.1, reach: 0.55, spread: 1.25, knock: 6.4, lunge: 5.5 },
  smash: { windup: 0.66, strike: 0.46, hitAt: 0.17, reach: 0.45, spread: 1.15, knock: 5.2, lunge: 2.6 },
  leap:  { windup: 0.5, strike: 0.42, hitAt: 0.2, radius: 1.45, knock: 4.8, lunge: 0, leap: 1.7 },
  shoot: { windup: 0.4, strike: 0.3, hitAt: 0.0, reach: 0, spread: 1.1, knock: 3.0, lunge: 0 },
};

function enemyStyle(e) {
  const t = ALL_TYPES[e.type];
  return ENEMY_STYLES[(t && t.attack) || 'swing'];
}

function enemyWindup(e) {
  return enemyStyle(e).windup * (e.isBoss ? 0.8 : 1);
}

function enemyStrike(e, style = enemyStyle(e)) {
  const t = ALL_TYPES[e.type];
  const col = ENEMY_FX[e.type] || 0xffd76e;
  const hx = e.pos.x + e.facing * (t.reach * 0.6);
  const hy = 1.05;
  const hitDmg = e.dmg || t.dmg;
  let hits = 0;
  if (style.leap) {
    // Sprungschlag: Einschlag trifft rund um die Landestelle, nicht nur vorn.
    for (const p of players) {
      if (p.dead) continue;
      const d = Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z);
      if (d < style.radius && p.inv <= 0) {
        hurtPlayer(p, hitDmg, Math.sign(p.pos.x - e.pos.x) || e.facing, style.knock);
        impact(p.pos.x, (p.y || 0) + 1.2, p.pos.z, 0xffffff, 0.5);
        ring(p.pos.x, (p.y || 0) + 1.0, p.pos.z, col, 1.5, 0.26);
        hits++;
      }
    }
    ring(e.pos.x, 0.12, e.pos.z, col, 3.2, 0.36);
    burst(e.pos.x, 0.3, e.pos.z, hits ? [0xffffff, col] : [col, 0xd8cdb8], hits ? 22 : 12, hits ? 5.2 : 3.4, 0.1);
    if (hits) { shake = Math.max(shake, 0.16); shakeT = Math.max(shakeT, 0.28); hitstop = Math.max(hitstop, 0.05); }
    return;
  }
  for (const p of players) {
    if (p.dead) continue;
    const dx = (p.pos.x - e.pos.x) * e.facing;
    const dz = Math.abs(p.pos.z - e.pos.z);
    if (dx > -0.6 && dx < t.reach + style.reach && dz < style.spread && p.inv <= 0) {
      hurtPlayer(p, hitDmg, e.facing, style.knock);
      impact(p.pos.x, (p.y || 0) + 1.2, p.pos.z, 0xffffff, 0.42);
      ring(p.pos.x, (p.y || 0) + 1.05, p.pos.z, col, 1.25, 0.24);
      hits++;
    }
  }
  // Trefferblitz am Schlagpunkt, danach Staub – ein danebengegangener
  // Schlag bleibt so ebenfalls sichtbar.
  burst(hx, hy, e.pos.z, hits ? [0xffffff, col] : [col, 0xd8cdb8], hits ? 15 : 6, hits ? 4 : 2.2, 0.08);
  if (hits) {
    const heavy = style.knock >= 5;
    shake = Math.max(shake, heavy ? 0.16 : 0.1);
    shakeT = Math.max(shakeT, 0.22);
    hitstop = Math.max(hitstop, heavy ? 0.06 : 0.04);
  }
}

function enemyShoot(e) {
  const t = ALL_TYPES[e.type];
  e.state = 'strike';
  e.t = 0;
  e.hitDone = true;
  const from = new THREE.Vector3(e.pos.x + e.facing * 0.8, 1.15, e.pos.z);
  fireShot({ isPlayer: false, enemy: e }, from, new THREE.Vector3(e.facing, 0, 0), e.dmg || t.dmg, 13, 0xffb347);
}

// Boss-Slam in zwei Schritten: erst ein Warnring, der genau bis zum Einschlag
// auf die Reichweite wächst, dann der sichtbare Aufprall.
const BOSS_SLAM_R = 3.6;
function bossSlam(e) {
  e.state = 'slamwind';
  e.t = 0;
  e.moving = false;
  e.bossTimer = 6.5;
  ring(e.pos.x, 0.06, e.pos.z, 0xff2f6d, BOSS_SLAM_R, 0.5);
  ring(e.pos.x, 0.06, e.pos.z, 0xffd76e, BOSS_SLAM_R * 0.6, 0.5);
  burst(e.pos.x, 0.35, e.pos.z, [0xff2f6d, 0xffd76e], 14, 4.5, 0.11);
  sfx.swing();
}

function bossSlamImpact(e) {
  const R = BOSS_SLAM_R + 0.6;
  ring(e.pos.x, 0.4, e.pos.z, 0xff2f6d, R, 0.5);
  ring(e.pos.x, 0.4, e.pos.z, 0xffd76e, R * 0.7, 0.36);
  burst(e.pos.x, 0.4, e.pos.z, [0xff2f6d, 0xffd76e], 30, 6, 0.13);
  impact(e.pos.x, 0.55, e.pos.z, 0xffffff, 0.85);
  shake = 0.3; shakeT = 0.4;
  hitstop = 0.08;
  sfx.boom();
  for (const p of players) {
    if (p.dead) continue;
    if (Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z) < BOSS_SLAM_R) {
      hurtPlayer(p, e.maxhp > 500 ? 22 : 18, Math.sign(p.pos.x - e.pos.x) || 1);
      p.inv = 0.9;
    }
  }
}

function hurtPlayer(p, dmg, dir, knock = 3.0) {
  if (p.dead || p.down || p.inv > 0) return;
  if (p.mount) throwRider(p, dir);
  p.hp = Math.max(0, p.hp - Math.round(dmg * diffCfg().dmg));
  p.inv = Math.max(p.inv, 0.75);
  p.state = p.y > 0 ? 'jump' : 'hurt';
  p.t = 0;
  p.knock = dir * knock;
  // Ein Treffer bricht die laufende Schlag-/Trittkette ab.
  p.chainN = 0;
  p.chainT = 0;
  p.chainKind = null;
  if (p.grab) releaseGrab(p);
  hitstop = 0.07;
  shake = 0.13; shakeT = 0.3;
  burst(p.pos.x, 1.2, p.pos.z, [0xff2f6d, 0xffffff, 0xffd76e], 10, 3, 0.08);
  sfx.hurt();
  setHP(p);
  if (p.hp <= 0) downPlayer(p);
}

// Im Koop geht ein Spieler bei 0 HP nicht sofort K.O., sondern liegt am Boden:
// Der Partner kann ihn innerhalb von DOWN_TIME wieder aufhelfen, dann kostet
// es kein Leben. Erst wenn die Zeit abläuft (oder niemand mehr helfen kann),
// wird ein Leben verbraucht.
const DOWN_TIME = 12;
const REVIVE_TIME = 1.7;
const REVIVE_RANGE = 2.1;
const REVIVE_HP = 60;

function coopMate(p) {
  if (players.length < 2) return null;
  return players.find((q) => q !== p && !q.out) || null;
}

function downPlayer(p) {
  const mate = coopMate(p);
  if (mate) { startDown(p); return; }
  diePlayer(p);
}

function startDown(p) {
  if (p.mount) {
    const d = releaseDonkey(p);
    if (d) { d.state = 'flee'; d.t = 0; d.kickT = 0; d.fleeDir = p.facing || 1; d.facing = d.fleeDir; }
  }
  p.riding = false;
  p.down = true;
  p.dead = false;
  p.hp = 0;
  p.state = 'down';
  p.t = 0;
  p.spin = 0;
  p.knock = 0;
  p.moving = false;
  p.sprint = false;
  p.downT = DOWN_TIME;
  p.reviveP = 0;
  p.downFx = 0.25;
  p.chainN = 0;
  p.chainT = 0;
  p.chainKind = null;
  if (p.grab) releaseGrab(p, false);
  hideChain(p);
  hideSlapHand(p);
  showWeapon(p);
  setHP(p);
  updateLives(p);
  sfx.ko();
  ring(p.pos.x, 0.12, p.pos.z, 0xff5f6d, 2.4, 0.42);
  burst(p.pos.x, 0.8, p.pos.z, [0xff5f6d, 0xffd76e], 16, 4, 0.1);
  const mate = coopMate(p);
  banner(`${p.name} AM BODEN${mate ? ` · ${mate.name} HELFEN` : ''}`);
}

// Retten: der Partner muss in Reichweite bleiben, der Balken füllt sich.
function reviveFromDown(p, mate) {
  p.down = false;
  p.downT = 0;
  p.reviveP = 0;
  p.dead = false;
  p.out = false;
  p.hp = REVIVE_HP;
  p.state = 'idle';
  p.t = 0;
  p.move = 'punch';
  p.atkIdx = 0;
  p.chainN = 0;
  p.chainT = 0;
  p.chainKind = null;
  p.inv = 2.0;
  p.knock = 0;
  p.y = 0;
  p.vy = 0;
  p.fig.root.visible = true;
  setHP(p);
  updateLives(p);
  ring(p.pos.x, 0.2, p.pos.z, 0xffd76e, 2.4, 0.4);
  burst(p.pos.x, 1.1, p.pos.z, [0xffd76e, 0xfff1b8, 0xffffff], 20, 3.6, 0.1);
  toast(`${p.name} WIEDER AUF DEN BEINEN`);
  sfx.pickup();
}

// Zeit abgelaufen: jetzt kostet der Treffer ein Leben (bzw. scheidet aus).
function expireDown(p) {
  p.down = false;
  p.reviveP = 0;
  p.downT = 0;
  p.dead = true;
  p.out = false;
  p.hp = 0;
  p.state = 'ko';
  p.t = 0;
  p.respawnT = 6;
  p.deadT = 0;
  p.lives = Math.max(0, p.lives - 1);
  if (p.lives <= 0) p.out = true;
  updateLives(p);
  ring(p.pos.x, 0.12, p.pos.z, 0xff5f6d, 1.8, 0.34);
  sfx.ko();
  const left = players.filter((q) => !q.out && !q.down);
  if (left.length === 0) {
    showMsg('GAME OVER', 'R — NEU STARTEN');
  } else if (p.out) {
    banner(`${p.name} AUSGESCHIEDEN`);
  } else {
    banner(`${p.name} K.O. · NOCH ${p.lives} LEBEN`);
  }
}

function updateDown(p, dt) {
  p.t += dt;
  p.fig.root.position.set(p.pos.x, p.y, p.pos.z);
  if (!p.remote) {
    // Nur ein stehender Partner kann helfen – zwei Liegende retten sich nicht.
    const mate = players.find((q) => q !== p && !q.out && !q.down && !q.dead);
    const near = mate && Math.hypot(mate.pos.x - p.pos.x, mate.pos.z - p.pos.z) <= REVIVE_RANGE;
    if (near && p.reviveP < 1) {
      p.reviveP = Math.min(1, p.reviveP + dt / REVIVE_TIME);
      // Helfer zieht sichtbar goldene Funken zum Liegenden.
      if (Math.random() < dt * 22) {
        const mx = p.pos.x + (mate.pos.x - p.pos.x) * 0.5;
        const mz = p.pos.z + (mate.pos.z - p.pos.z) * 0.5;
        burst(mx, 0.9, mz, [0xffd76e, 0xfff1b8], 2, 1.6, 0.06);
      }
      if (p.reviveP >= 1) { reviveFromDown(p, mate); return; }
    } else if (p.reviveP > 0) {
      p.reviveP = Math.max(0, p.reviveP - dt * 0.7);
    }
    p.downT -= dt;
    if (p.downT <= 0) { expireDown(p); return; }
    p.downFx -= dt;
    if (p.downFx <= 0) {
      p.downFx = 0.75;
      const frac = clamp(p.downT / DOWN_TIME, 0, 1);
      ring(p.pos.x, 0.1, p.pos.z, 0xff5f6d, 1.5 + (1 - frac) * 1.6, 0.26);
    }
    updateLives(p);
  }
  animateFighter(p, dt, true);
}

function diePlayer(p) {
  // Ein K.O. im Sattel lässt den Esel ebenfalls ausreißen.
  if (p.mount) {
    const d = releaseDonkey(p);
    if (d) { d.state = 'flee'; d.t = 0; d.kickT = 0; d.fleeDir = p.facing || 1; d.facing = d.fleeDir; }
  }
  p.riding = false;
  p.down = false;
  p.reviveP = 0;
  p.downT = 0;
  p.dead = true;
  p.hp = 0;
  p.state = 'ko';
  p.t = 0;
  p.spin = 0;
  p.respawnT = 6;
  p.deadT = 0;
  // Ein Leben verbraucht; wer bei 0 ankommt, scheidet aus.
  p.lives = Math.max(0, p.lives - 1);
  if (p.lives <= 0) p.out = true;
  updateLives(p);
  if (p.grab) releaseGrab(p, false);
  hideChain(p);
  hideSlapHand(p);
  sfx.ko();
  showWeapon(p);
  const left = players.filter((q) => !q.out);
  if (left.length === 0) {
    showMsg('GAME OVER', 'R — NEU STARTEN');
  } else if (p.out) {
    banner(`${p.name} AUSGESCHIEDEN`);
  } else {
    banner(`${p.name} K.O. · NOCH ${p.lives} LEBEN`);
  }
}

function revivePlayer(p, mate) {
  p.dead = false;
  p.down = false;
  p.downT = 0;
  p.reviveP = 0;
  p.out = false;
  p.fig.root.visible = true;
  p.hp = 100;
  p.state = 'idle';
  p.t = 0;
  p.chainN = 0;
  p.chainT = 0;
  p.chainKind = null;
  p.inv = 1.6;
  p.pos.x = clamp(mate.pos.x - 1.4 * (mate.facing || 1), XMIN, maxWalkX());
  p.pos.z = clamp(mate.pos.z + 0.6, -WALK_LANE, WALK_LANE);
  p.y = 0;
  p.vy = 0;
  setHP(p);
  updateLives(p);
}

// Solo-Respawn ohne Partner: an der Todesstelle, etwas zurückgesetzt, mit
// kurzer Unverwundbarkeit – sonst steht man mitten im Gegnerknäuel.
function respawnAtSpot(p) {
  p.dead = false;
  p.down = false;
  p.downT = 0;
  p.reviveP = 0;
  p.out = false;
  p.fig.root.visible = true;
  p.hp = 100;
  p.state = 'idle';
  p.t = 0;
  p.chainN = 0;
  p.chainT = 0;
  p.chainKind = null;
  p.inv = 2.4;
  p.knock = 0;
  p.y = 0;
  p.vy = 0;
  p.pos.x = clamp(p.pos.x - (p.facing || 1) * 2.0, XMIN, maxWalkX());
  p.pos.z = clamp(p.pos.z, -WALK_LANE, WALK_LANE);
  setHP(p);
  updateLives(p);
  ring(p.pos.x, 0.15, p.pos.z, 0x6be0ff, 2.2, 0.4);
  burst(p.pos.x, 1.0, p.pos.z, [0x6be0ff, 0xffffff], 12, 3.5, 0.1);
}

/* ============================== WAFFEN =================================== */
// Waffe für eine Hand bauen. Beide Hände bekommen eine Kopie; sichtbar ist
// immer die Hand auf der Kameraseite (sonst verschwindet sie hinter dem Körper).
function makeHeldWeaponMesh(kind, w) {
  const m = new THREE.Group();
  if (w.kind === 'gun') {
    vox(m, 0, 0, 0, 1.0, 1.0, 4.0, w.color);
    vox(m, 0, -0.8, -0.7, 1.0, 1.8, 1.1, 0x2a2a32);
    if (kind === 'bazooka') {
      vox(m, 0, 0, 0.3, 1.9, 1.9, 1.8, 0x3e5a34);
      vox(m, 0, 0.9, -2.2, 1.4, 0.5, 0.9, 0x2a3a22);
    }
    if (kind === 'gewehr') vox(m, 0, 0, 2.6, 0.5, 0.5, 3.0, 0x6b4a26);
  } else {
    const len = kind === 'baseball' ? 4.8 : kind === 'kusarigama' ? 2.0 : 1.2;
    vox(m, 0, 0, len * 0.5, 0.85, 0.85, len, w.color);
    if (kind === 'kusarigama') {
      vox(m, 0, 0, len + 0.7, 1.4, 1.4, 0.7, 0xbfc4d0);
      vox(m, 0, -1.6, -0.4, 0.4, 3.2, 0.4, 0x8f96a4);
    }
    if (kind === 'schlagring') {
      vox(m, 0, 0, 0.5, 2.1, 1.7, 0.6, w.color);
      vox(m, 0, 0.4, 0.9, 1.7, 0.5, 0.4, 0xd9dce8);
    }
  }
  // In der Hand muss die Waffe deutlich zu sehen sein — nicht winzig im Ärmel.
  const heldScale = w.kind === 'gun'
    ? (kind === 'bazooka' ? 1.7 : kind === 'gewehr' ? 1.55 : 1.4)
    : 1.3;
  m.scale.setScalar(heldScale);
  m.position.set(0, -0.78, 0.24);
  // Waffe zeigt entlang des Arms: unten am Körper, beim Schießen nach vorn.
  m.rotation.set(1.35, 0, 0);
  // Mündungsposition für Schüsse exakt an der Waffe.
  const muzzle = new THREE.Object3D();
  // Lokale Einheiten der Gruppe (die Voxel sind bereits mit VOX skaliert).
  muzzle.position.set(0, 0, kind === 'gewehr' ? 0.52 : kind === 'bazooka' ? 0.37 : 0.21);
  m.add(muzzle);
  return { mesh: m, muzzle };
}

function removeHeldWeapon(p) {
  if (p.fig.heldWeapons) {
    for (const h of p.fig.heldWeapons) {
      if (h.mesh.parent) h.mesh.parent.remove(h.mesh);
    }
    p.fig.heldWeapons = null;
  } else if (p.fig.weaponMesh && p.fig.weaponMesh.parent) {
    p.fig.weaponMesh.parent.remove(p.fig.weaponMesh);
  }
  p.fig.weaponMesh = null;
  p.fig.weaponMeshL = null;
  p.fig.heldKind = null;
  p.fig.muzzle = null;
}

function setHeldWeapon(p, kind) {
  const w = WEAPONS[kind];
  if (!w) return;
  removeHeldWeapon(p);
  const right = makeHeldWeaponMesh(kind, w);
  const left = makeHeldWeaponMesh(kind, w);
  p.fig.armR.add(right.mesh);
  p.fig.armL.add(left.mesh);
  p.fig.heldWeapons = [right, left];
  p.fig.weaponMesh = right.mesh;
  p.fig.weaponMeshL = left.mesh;
  p.fig.heldKind = kind;
}

function equipWeapon(p, kind) {
  const w = WEAPONS[kind];
  if (!w) return;
  p.weapon = { id: kind, ...w, left: w.kind === 'gun' ? w.ammo : w.uses };
  p.swingT = 0;
  showWeapon(p);
  toast(`${w.name} AUFGENOMMEN`);
  sfx.pickup();
  setHeldWeapon(p, kind);
}

function dropWeapon(p) {
  if (!p.weapon) return;
  spawnPickup('weapon', p.pos.x + p.facing * 0.6, p.pos.z, p.weapon.id);
  removeHeldWeapon(p);
  p.weapon = null;
  showWeapon(p);
}

function showWeapon(p) {
  const el = p.id === 0 ? p1Weapon : p2Weapon;
  if (!el) return;
  if (!p.weapon) { el.textContent = 'FÄUSTE'; return; }
  const w = p.weapon;
  el.innerHTML = `<b>${w.name}</b> <span class="ammo">${w.left}</span>`;
}

function useWeaponCharge(p) {
  if (!p.weapon) return;
  p.weapon.left -= 1;
  showWeapon(p);
  if (p.weapon.left <= 0) {
    toast(`${p.weapon.name} ZERBROCHEN`);
    removeHeldWeapon(p);
    p.weapon = null;
    showWeapon(p);
  }
}

function shootWeapon(p) {
  const w = p.weapon;
  if (!w || p.swingT > 0) return;
  p.swingT = w.cooldown;
  // Automatisch zum nächsten Gegner zielen, sonst schießt man rückwärts.
  const aim = nearestEnemyTo(p);
  if (aim && Math.abs(aim.pos.x - p.pos.x) < 16) p.facing = Math.sign(aim.pos.x - p.pos.x) || p.facing;
  // Erst in Schusspose gehen, dann die Mündung aus der gehaltenen Waffe lesen —
  // so kommt der Schuss sichtbar aus dem Lauf statt aus der Brust.
  p.state = 'attack';
  p.move = 'shoot';
  p.atkIdx = 0;
  p.t = 0;
  p.hitDone = true;
  p.fig.armR.rotation.x = -1.5;
  p.fig.armL.rotation.x = -1.5;
  p.fig.root.updateWorldMatrix(true, true);
  // Fester Ursprung auf Höhe des Laufs: immer sichtbar vor dem Spieler und
  // deckungsgleich mit der Waffe in der erhobenen Hand.
  const from = new THREE.Vector3(p.pos.x + p.facing * 1.05, 1.38 + p.y, p.pos.z);
  fireShot({ isPlayer: true, player: p }, from, new THREE.Vector3(p.facing, 0, 0),
    w.dmg, w.speed, w.color, w.aoe || 0);
  // Mündungsfeuer: der Schuss ist auch bei schnellen Kugeln sofort sichtbar.
  burst(from.x, from.y, from.z, [0xfff1b8, w.color, 0xffffff], 9, 2.8, 0.07);
  ghost(from.x, from.y, from.z, 0xfff1b8, 0.6, 0.16);
  useWeaponCharge(p);
  shake = Math.max(shake, 0.07);
  shakeT = Math.max(shakeT, 0.18);
}

/* ============================== GRIFF ==================================== */
// G greift: in der Nähe packt die Hand direkt, weiter weg zieht die Kette den
// Gegner heran. Danach wird er festgehalten und mit J im Bogen geworfen.
const GRAPPLE_RANGE = 12.5;
const GRAB_CLOSE = 2.4;      // ab hier Nahkampf-Griff statt Kette
const GRAB_HOLD = 2.6;       // so lange hält der Griff, bevor er reißt
const THROW_SPEED = 10.5;    // waagerechter Wurf
const THROW_LIFT = 5.6;      // Bogen nach oben

function tryGrapple(p) {
  if (p.dead || p.down || p.state === 'ko' || p.state === 'hurt' || p.mount) return;
  if (p.grab) { throwGrab(p); return; }
  if (p.state === 'special' || p.state === 'attack' || p.state === 'airkick' || p.state === 'grapple') return;
  const target = nearestGrappleTarget(p);
  if (target) p.facing = Math.sign(target.pos.x - p.pos.x) || p.facing;
  // Nah dran: direkt am Kragen packen, ohne Kette dazwischen.
  if (target && !target.isBoss && Math.abs(target.pos.x - p.pos.x) <= GRAB_CLOSE) {
    clinchGrab(p, target);
    return;
  }
  p.state = 'grapple';
  p.t = 0;
  p.grabTarget = target;
  if (target) {
    target.stun = 1.2;
    if (!target.isBoss) { target.state = 'grabbed'; target.t = 0; }
    addMeter(p, 4);
    sfx.chain();
    burst(target.pos.x, 1.1, target.pos.z, [0x6be0ff, 0xffffff, 0x9b6bff], 14, 3.5, 0.08);
    ring(target.pos.x, 0.9, target.pos.z, 0x6be0ff, 1.6, 0.22);
    hitstop = 0.045;
    shake = Math.max(shake, 0.1); shakeT = Math.max(shakeT, 0.16);
  } else {
    // Auch ohne Ziel peitscht die Kette nach vorn — die Mechanik ist sichtbar.
    sfx.chainMiss();
  }
}

// Nahkampf-Griff: Der Gegner hängt am Kragen, der Spieler kann langsam
// mit ihm laufen und ihn mit J werfen.
function clinchGrab(p, e) {
  e.state = 'grabbed';
  e.t = 0;
  e.stun = 1.0;
  e.kx = 0;
  e.thrown = null;
  e.y = 0;
  e.facing = -p.facing;
  p.grab = { e, t: GRAB_HOLD };
  p.grabT = 0;
  p.state = 'idle';
  p.t = 0;
  p.moving = false;
  const gy = groundYAt(p.pos.z);
  ring(e.pos.x, gy + 0.9, e.pos.z, 0x6be0ff, 1.9, 0.26);
  ring(e.pos.x, gy + 0.3, e.pos.z, 0xffffff, 1.2, 0.18);
  impact(e.pos.x, 1.1, e.pos.z, 0xbff4ff, 0.45);
  burst(e.pos.x, 1.15, e.pos.z, [0x6be0ff, 0xffffff, 0xbfe9ff], 12, 3, 0.07);
  addMeter(p, 5);
  shake = Math.max(shake, 0.1); shakeT = Math.max(shakeT, 0.16);
  sfx.grab();
  toast(`GRIFF · ${keyLabel(CONTROLS[p.id].punch)} WIRFT · ${keyLabel(CONTROLS[p.id].left)}/${keyLabel(CONTROLS[p.id].right)} DREHT`);
}

// Sucht das nächste Ziel unabhängig von der Blickrichtung, in der Nähe der Lane.
function nearestGrappleTarget(p) {
  let best = null, bd = GRAPPLE_RANGE;
  for (const e of enemies) {
    if (e.dead || e.state === 'ko' || e.thrown || e.state === 'grabbed') continue;
    if (Math.abs(e.pos.z - p.pos.z) > 3.4) continue;
    const d = Math.abs(e.pos.x - p.pos.x);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

/* ------------------------- Ketten-Visualisierung -------------------------- */
function ensureChainMeshes(p) {
  if (p.chainMesh) return;
  const mat = new THREE.MeshBasicMaterial({ color: 0x9fb4d8 });
  p.chainMesh = new THREE.Mesh(BOX, mat);
  p.chainMesh.castShadow = false;
  p.chainMesh.visible = false;
  scene.add(p.chainMesh);
  p.hookMesh = new THREE.Mesh(BOX, bas(0xd9dce8));
  p.hookMesh.visible = false;
  scene.add(p.hookMesh);
  // Glieder über der Leuchtlinie: die Kette ist als Kette erkennbar.
  p.chainLinks = [];
  const linkGeo = new THREE.TorusGeometry(0.17, 0.06, 5, 10);
  for (let i = 0; i < 9; i++) {
    const link = new THREE.Mesh(linkGeo, bas(0xe6edff));
    link.visible = false;
    scene.add(link);
    p.chainLinks.push(link);
  }
  const markMat = new THREE.MeshBasicMaterial({
    color: 0x6be0ff, transparent: true, opacity: 0.85, side: THREE.DoubleSide,
    depthWrite: false, blending: THREE.AdditiveBlending,
  });
  p.markMesh = new THREE.Mesh(RING_GEO, markMat);
  p.markMesh.rotation.x = -Math.PI / 2;
  p.markMesh.visible = false;
  scene.add(p.markMesh);
  // Schwebender Hinweis über dem Ziel: "G · GRIFF".
  const markLabel = new THREE.Sprite(new THREE.SpriteMaterial({
    map: pickupLabelTexture(`${keyLabel(CONTROLS[p.id].grapple)} · GRIFF`, '#6be0ff'),
    transparent: true, depthWrite: false,
  }));
  markLabel.scale.set(1.55, 0.38, 1);
  markLabel.visible = false;
  scene.add(markLabel);
  p.grabMark = markLabel;
}

function hideChain(p) {
  if (p.chainMesh) p.chainMesh.visible = false;
  if (p.hookMesh) p.hookMesh.visible = false;
  for (const l of p.chainLinks || []) l.visible = false;
}

function updateGrappleVisuals(p, dt) {
  ensureChainMeshes(p);
  // Die Kette ist nur beim Heranziehen zu sehen; im Nahkampf-Griff packen
  // beide Hände den Kragen, da hätte eine gespannte Kette nichts zu suchen.
  const active = p.state === 'grapple';
  const target = active ? p.grabTarget : null;
  if (active) {
    const hx = p.pos.x + p.facing * 0.55;
    const hy = 1.25 + p.y;
    const hz = p.pos.z;
    let tx, ty, tz;
    if (target && !target.dead && target.state !== 'ko') {
      tx = target.pos.x;
      ty = 1.1 + target.y;
      tz = target.pos.z;
    } else {
      tx = hx + p.facing * 3.4;
      ty = hy;
      tz = hz;
    }
    const dx = tx - hx, dz = tz - hz;
    const len = Math.max(0.2, Math.hypot(dx, dz));
    p.chainMesh.visible = true;
    p.chainMesh.position.set((hx + tx) / 2, (hy + ty) / 2, (hz + tz) / 2);
    p.chainMesh.rotation.set(0, Math.atan2(dx, dz), 0);
    p.chainMesh.scale.set(0.11, 0.11, len);
    const rotY = Math.atan2(dx, dz);
    for (let i = 0; i < (p.chainLinks || []).length; i++) {
      const l = p.chainLinks[i];
      const t = (i + 0.5) / p.chainLinks.length;
      l.visible = true;
      l.position.set(lerp(hx, tx, t), lerp(hy, ty, t), lerp(hz, tz, t));
      l.rotation.set(0, rotY, i % 2 ? Math.PI / 2 : 0);
      l.scale.setScalar(1);
    }
    p.hookMesh.visible = true;
    p.hookMesh.position.set(tx, ty, tz);
    p.hookMesh.scale.setScalar(0.42);
  } else {
    hideChain(p);
  }

  // Zielmarkierung, sobald ein Gegner in Kettenreichweite ist
  if (!active && p.state !== 'ko' && p.state !== 'hurt' && !p.dead) {
    const near = nearestGrappleTarget(p);
    if (near) {
      p.markMesh.visible = true;
      p.markMesh.position.set(near.pos.x, 0.1 + near.y, near.pos.z);
      const s = 1.5 + Math.sin(performance.now() * 0.008) * 0.18;
      p.markMesh.scale.setScalar(s);
      if (p.grabMark) {
        p.grabMark.visible = true;
        p.grabMark.position.set(near.pos.x, 3.35 + near.y, near.pos.z);
      }
    } else {
      p.markMesh.visible = false;
      if (p.grabMark) p.grabMark.visible = false;
    }
  } else if (p.markMesh) {
    p.markMesh.visible = false;
    if (p.grabMark) p.grabMark.visible = false;
  }

  // HUD-Hinweis: Kette ist bereit, sobald ein Ziel in Reichweite ist.
  if (p === players[0] && grappleHintEl) {
    const ready = !active && !p.dead && p.state !== 'ko' && p.state !== 'hurt' && !!nearestGrappleTarget(p);
    grappleHintEl.classList.toggle('on', ready);
  }
}

function finishGrapple(p) {
  const e = p.grabTarget;
  p.state = 'idle';
  p.t = 0;
  p.grabTarget = null;
  if (!e || e.dead || e.state === 'ko') return;
  e.pos.x = clamp(p.pos.x + p.facing * 1.35, XMIN, maxWalkX());
  e.pos.z = p.pos.z;
  e.facing = -p.facing;
  if (e.isBoss) {
    e.stun = 0.35;
    damageEnemy(e, 18, true, p.facing, 1.2, p);
    return;
  }
  e.state = 'grabbed';
  e.t = 0;
  e.stun = 1.0;
  p.grab = { e, t: GRAB_HOLD };
  p.grabT = 0;
  ring(e.pos.x, 1.0, e.pos.z, 0x6be0ff, 2.2, 0.3);
  ring(e.pos.x, 0.5, e.pos.z, 0xffffff, 1.2, 0.2);
  impact(e.pos.x, 1.1, e.pos.z, 0xbff4ff, 0.5);
  burst(e.pos.x, 1.2, e.pos.z, [0x6be0ff, 0xffffff], 10, 3, 0.07);
  addMeter(p, 6);
  shake = Math.max(shake, 0.14); shakeT = Math.max(shakeT, 0.2);
  hitstop = 0.06;
  toast(`GRIFF · ${keyLabel(CONTROLS[p.id].punch)} WIRFT · ${keyLabel(CONTROLS[p.id].left)}/${keyLabel(CONTROLS[p.id].right)} DREHT`);
  sfx.grab();
}

// Wurf: Der Gegner segelt im Bogen nach vorn, trifft unterwegs andere Gegner
// und Requisiten und schlägt am Boden mit einer kleinen Druckwelle ein.
function throwGrab(p) {
  const e = p.grab ? p.grab.e : null;
  p.grab = null;
  p.grabT = 0;
  if (!e || e.dead || e.state === 'ko') return;
  const dir = p.facing;
  // Wer im Schwung steht, wird mitgerissen.
  for (const o of enemies) {
    if (o === e || o.dead || o.state === 'ko' || o.thrown) continue;
    if (Math.abs(o.pos.x - e.pos.x) < 2.2 && Math.abs(o.pos.z - e.pos.z) < 1.5) {
      damageEnemy(o, 18, false, dir, 4, p);
    }
  }
  damageEnemy(e, 34, true, dir, 3, p, true);
  p.state = 'attack';
  p.move = 'throw';
  p.t = 0;
  p.hitDone = true;
  p.atkIdx = 0;
  p.inv = Math.max(p.inv, 0.5);
  shake = Math.max(shake, 0.28); shakeT = Math.max(shakeT, 0.35);
  hitstop = 0.1;
  screenFlash('#dff4ff', 0.18, 0.16);
  sfx.throw();
  if (e.dead || e.state === 'ko') return;
  // Ab hier fliegt er: eigener Bogen, Drehung und Kollisionen in updateEnemies.
  e.state = 'hurt';
  e.t = 0;
  e.kx = dir * THROW_SPEED;
  e.kt = 0.4;
  e.y = Math.max(e.y, 0.95);
  e.stun = 2.4;
  e.facing = -dir;
  e.thrown = { t: 0, vy: THROW_LIFT, dir, owner: p, hits: new Set(), spin: dir * 7.5 };
  ring(e.pos.x, 1.1, e.pos.z, 0xbfe9ff, 2.0, 0.22);
  burst(e.pos.x, 1.2, e.pos.z, [0xffffff, 0x6be0ff, 0xffd76e], 12, 3.4, 0.09);
}

// Flugbahn des geworfenen Gegners: Bogen, Treffer an anderen Gegnern und
// Requisiten, Aufprall mit Druckwelle.
function updateThrownEnemy(e, dt) {
  const th = e.thrown;
  th.t += dt;
  const b = SECTION_BOUNDS[e.sec || 0] || SECTION_BOUNDS[0];
  e.pos.x = clamp(e.pos.x + e.kx * dt, b[0] + 0.4, b[1] - 0.4);
  e.pos.z = clamp(e.pos.z + (th.vz || 0) * dt, -WALK_LANE, WALK_LANE);
  e.kx *= 1 - 0.5 * dt;
  th.vy -= 18 * dt;
  e.y += th.vy * dt;

  // Unterwegs mitnehmen, was im Weg steht.
  for (const o of enemies) {
    if (o === e || o.dead || o.state === 'ko' || o.thrown || th.hits.has(o)) continue;
    if (Math.abs(o.pos.x - e.pos.x) < 1.15 && Math.abs(o.pos.z - e.pos.z) < 1.0 && Math.abs(o.y - e.y) < 1.8) {
      th.hits.add(o);
      damageEnemy(o, 22, true, Math.sign(e.kx) || th.dir, 7, th.owner);
      impact(o.pos.x, 1.1 + o.y, o.pos.z, 0xbfe9ff, 0.5);
      burst(o.pos.x, 1.0 + o.y, o.pos.z, [0xffffff, 0x6be0ff, 0xffd76e], 14, 4, 0.1);
      shake = Math.max(shake, 0.14); shakeT = Math.max(shakeT, 0.18);
      hitstop = Math.max(hitstop, 0.04);
    }
  }
  for (const d of destructibles) {
    if (d.dead || th.hits.has(d)) continue;
    // Requisiten stehen am Bordstein: Der fliegende Körper hat Breite, deshalb
    // zählt die Tiefe großzügiger als bei einem stehenden Gegner.
    const hw = (d.halfW || 0.5) + 0.35, hd = (d.halfD || 0.5) + 0.9;
    if (Math.abs(d.x - e.pos.x) < hw && Math.abs(d.z - e.pos.z) < hd) {
      th.hits.add(d);
      damageProp(d, 2, th.owner);
    }
  }

  if (e.y > 0) return;
  // Aufprall
  e.y = 0;
  const dir = th.dir;
  const owner = th.owner;
  e.thrown = null;
  e.state = 'hurt';
  e.t = 0;
  e.kx *= 0.45;
  e.kt = 0.35;
  e.stun = Math.max(e.stun, 1.1);
  if (e.fig) e.fig.root.rotation.z = 0;
  const gy = groundYAt(e.pos.z);
  ring(e.pos.x, gy + 0.5, e.pos.z, 0xffd76e, 3.0, 0.32);
  ring(e.pos.x, gy + 0.12, e.pos.z, 0xbfe9ff, 2.0, 0.24);
  impact(e.pos.x, gy + 0.4, e.pos.z, 0xfff1c9, 0.6);
  burst(e.pos.x, gy + 0.25, e.pos.z, [0xb9a58c, 0xffd76e, 0xffffff, 0xd9dce8], 24, 5, 0.11);
  for (const o of enemies) {
    if (o === e || o.dead || o.state === 'ko') continue;
    if (Math.abs(o.pos.x - e.pos.x) < 1.9 && Math.abs(o.pos.z - e.pos.z) < 1.4) {
      damageEnemy(o, 12, false, Math.sign(o.pos.x - e.pos.x) || dir, 4, owner);
    }
  }
  for (const d of destructibles) {
    if (d.dead) continue;
    if (Math.abs(d.x - e.pos.x) < (d.halfW || 0.5) + 1.1 &&
        Math.abs(d.z - e.pos.z) < (d.halfD || 0.5) + 0.8) {
      damageProp(d, 2, owner);
    }
  }
  screenFlash('#ffe6b0', 0.12, 0.12);
  shake = Math.max(shake, 0.26); shakeT = Math.max(shakeT, 0.3);
  hitstop = Math.max(hitstop, 0.06);
  sfx.heavy();
}

function releaseGrab(p, hurt = true) {
  const e = p.grab ? p.grab.e : null;
  p.grab = null;
  p.grabT = 0;
  if (e && !e.dead) {
    e.state = hurt ? 'hurt' : 'walk';
    e.t = 0;
    e.kx = -p.facing * 3;
    e.stun = 0.3;
  }
}

/* --------------------------- Sprungangriff -------------------------------- */
function diveKickHit(p) {
  for (const e of enemies) {
    if (e.dead || e.state === 'ko') continue;
    if (Math.abs(e.pos.x - p.pos.x) < 1.75 && Math.abs(e.pos.z - p.pos.z) < 1.25 && Math.abs(e.y - p.y) < 1.8) {
      damageEnemy(e, 26, true, p.facing, 7, p);
      p.hitDone = true;
      p.vy = -3.2;
      hitstop = 0.12;
      shake = Math.max(shake, 0.2); shakeT = Math.max(shakeT, 0.3);
      ring(p.pos.x, 0.9, p.pos.z, 0xffd76e, 2.6, 0.3);
      break;
    }
  }
}

function landAirKick(p) {
  p.state = 'idle';
  p.t = 0;
  p.hitDone = false;
  ring(p.pos.x, 0.15, p.pos.z, 0xffd76e, 2.9, 0.36);
  ring(p.pos.x, 0.15, p.pos.z, 0x6be0ff, 2.0, 0.26);
  burst(p.pos.x, 0.4, p.pos.z, [0xffd76e, 0xffffff, 0x6be0ff], 16, 4, 0.1);
  sfx.heavy();
  shake = Math.max(shake, 0.16);
  shakeT = Math.max(shakeT, 0.28);
  for (const e of enemies) {
    if (e.dead || e.state === 'ko') continue;
    if (Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z) < 2.5) {
      damageEnemy(e, 14, true, Math.sign(e.pos.x - p.pos.x) || p.facing, 4.4, p);
    }
  }
}

/* ============================== ITEMS ==================================== */
const pickups = [];
function clearPickupMeshes() {
  while (pickups.length) removePickup(pickups[0]);
}
const PICK_COLORS = { doner: 0xffb347, ayran: 0x9fe8ff, gold: 0xffe27a, weapon: 0xff8f4a };
const PICK_BASE_Y = { doner: 0.42, ayran: 0.3, gold: 0.3, weapon: 0.5 };

// Namen über der Beute: dadurch ist sofort klar, was da liegt.
const labelTexCache = new Map();
function pickupLabelTexture(text, colorCss) {
  const key = `${text}|${colorCss}`;
  const hit = labelTexCache.get(key);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = 384; cv.height = 96;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = 'rgba(8, 5, 14, 0.84)';
  ctx.fillRect(4, 16, 376, 64);
  ctx.strokeStyle = colorCss;
  ctx.lineWidth = 5;
  ctx.strokeRect(4, 16, 376, 64);
  ctx.fillStyle = colorCss;
  // Lange Tastennamen (z. B. SPACE / ENTER) verkleinern, statt aus dem Schild zu laufen.
  const size = text.length > 18 ? 26 : text.length > 14 ? 31 : 38;
  ctx.font = `bold ${size}px ui-monospace, Consolas, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 192, 50);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  labelTexCache.set(key, tex);
  return tex;
}

function makeWeaponModel(g, weaponKind) {
  const def = WEAPONS[weaponKind];
  const col = def ? def.color : 0xc0c0cc;
  if (weaponKind === 'bazooka') {
    vox(g, 0, 0, 0.4, 2.4, 2.4, 6.4, 0x4a6a3a);
    vox(g, 0, 0.9, -2.6, 1.6, 0.7, 1.2, 0x2a3a22);
    vox(g, 0, -1.6, -1.0, 1.0, 2.0, 1.2, 0x2a2a32);
  } else if (weaponKind === 'gewehr') {
    vox(g, 0, 0, 0.4, 0.9, 0.9, 7.6, 0x6b4a26);
    vox(g, 0, 0.1, 4.0, 0.6, 0.6, 2.4, 0x3a3a42);
    vox(g, 0, -1.1, -1.8, 0.9, 2.2, 1.3, 0x4a3220);
  } else if (weaponKind === 'pistole') {
    vox(g, 0, 0.2, 1.2, 1.0, 1.0, 3.8, col);
    vox(g, 0, -1.4, -0.1, 1.0, 2.6, 1.2, 0x2a2a32);
    vox(g, 0, 0.9, 2.6, 0.7, 0.5, 1.4, 0xd9d9e6);
  } else if (weaponKind === 'baseball') {
    vox(g, 0, 0, 0.6, 0.9, 0.9, 2.0, 0x4a3220);
    vox(g, 0, 0, 2.9, 1.5, 1.5, 4.2, col);
    vox(g, 0, 0, 4.8, 1.8, 1.8, 1.2, 0xd9b45a);
  } else if (weaponKind === 'schlagring') {
    vox(g, 0, 0, 0.6, 2.6, 2.2, 0.8, col);
    for (let i = 0; i < 4; i++) vox(g, -1.1 + i * 0.72, 0.5, 1.15, 0.4, 0.7, 0.4, 0xd9dce8);
  } else {
    vox(g, 0, 0, 1.0, 1.0, 1.0, 3.0, col);
    for (let i = 0; i < 3; i++) vox(g, 0, 0, 2.8 + i * 0.55, 0.45, 0.45, 0.5, 0xbfc4d0);
    vox(g, 0, -0.2, 5.1, 1.8, 0.45, 1.6, 0xd9dce8);
    vox(g, 0, -1.1, 4.6, 0.5, 1.6, 0.5, 0x6b4a26);
  }
}

function spawnPickup(kind, x, z, weaponKind) {
  if (kind === 'weapon' && !weaponKind) {
    const keys = Object.keys(WEAPONS);
    weaponKind = keys[Math.floor(Math.random() * keys.length)];
  }
  const color = PICK_COLORS[kind] || 0xffffff;
  const g = new THREE.Group();
  if (kind === 'doner') {
    // Döner-Spieß mit Brot, Fleischlagen und Tomate
    for (let i = 0; i < 5; i++) vox(g, 0, -3.2 + i * 1.35, 0, 4.4 - i * 0.55, 1.35, 4.4 - i * 0.55, i % 2 ? 0xc07a32 : 0xd9a04a);
    vox(g, 0, 3.6, 0, 1.0, 1.8, 1.0, 0xf2f2f2);
    vox(g, 0, -4.4, 0, 4.8, 0.7, 4.8, 0xf0e0b0);
    vox(g, 1.9, 0.8, 1.4, 1.2, 1.0, 1.2, 0xc0392b);
    vox(g, -1.8, -0.8, 1.5, 1.1, 0.9, 1.1, 0x6abf4b);
  } else if (kind === 'ayran') {
    vox(g, 0, 0, 0, 3.2, 4.6, 3.2, 0xeef2f8);
    vox(g, 0, 2.7, 0, 3.7, 0.8, 3.7, 0xbfd6e8);
    vox(g, 0, 0.3, 0, 3.35, 1.4, 3.35, 0x6be0ff, true);
    vox(g, 0, -2.7, 0, 2.8, 0.7, 2.8, 0xd9e2ec);
  } else if (kind === 'gold') {
    for (let i = 0; i < 4; i++) vox(g, 0, -2.2 + i * 1.35, 0, 3.6, 0.9, 3.6, 0xffd76e, true);
    vox(g, 0, 3.8, 0, 1.1, 1.1, 1.1, 0xfff2b8, true);
  } else {
    makeWeaponModel(g, weaponKind);
  }
  // Items sind bewusst klein: die Straße soll nicht von Beute zugepflastert wirken.
  g.scale.setScalar((kind === 'gold' ? 1.7 : 1.55) * 0.5);
  const baseY = PICK_BASE_Y[kind] || 0.6;
  g.position.set(x, baseY, z);
  scene.add(g);

  // Bodenring + Lichtsäule: Beute ist auf der dunklen Straße nicht zu übersehen.
  const halo = new THREE.Mesh(RING_GEO, new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0.8, side: THREE.DoubleSide,
    depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  halo.rotation.x = -Math.PI / 2;
  halo.position.set(x, 0.05, z);
  halo.scale.setScalar(0.9);
  scene.add(halo);
  const beam = new THREE.Mesh(BOX, new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0.3,
    depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  beam.scale.set(0.12, 2.6, 0.12);
  beam.position.set(x, 1.3, z);
  scene.add(beam);
  const label = new THREE.Sprite(new THREE.SpriteMaterial({
    map: pickupLabelTexture(kind === 'weapon' ? WEAPONS[weaponKind].name : ITEMS[kind].name,
      '#' + color.toString(16).padStart(6, '0')),
    transparent: true, depthWrite: false,
  }));
  label.scale.set(0.85, 0.21, 1);
  label.position.set(x, baseY + 0.8, z);
  scene.add(label);
  // Aufnahme-Hinweis: nur in Reichweite sichtbar, damit die Straße ruhig bleibt.
  const prompt = new THREE.Sprite(new THREE.SpriteMaterial({
    map: pickupLabelTexture(`${keyLabel(CONTROLS[0].punch)} / ${keyLabel(CONTROLS[1].punch)} · NEHMEN`, '#ffd76e'),
    transparent: true, depthWrite: false,
  }));
  prompt.scale.set(0.92, 0.23, 1);
  prompt.position.set(x, baseY + 1.15, z);
  prompt.visible = false;
  scene.add(prompt);
  pickups.push({
    kind, weaponKind, mesh: g, x, z, halo, beam, label, prompt, baseY,
    extra: [halo, beam, label, prompt], t: Math.random() * 6, life: 900,
  });
}

function removePickup(it) {
  scene.remove(it.mesh);
  for (const ex of it.extra || []) {
    scene.remove(ex);
    if (ex.material) ex.material.dispose();
  }
  const i = pickups.indexOf(it);
  if (i >= 0) pickups.splice(i, 1);
}

// Aufnahme-Hinweis je Item: nur zeigen, wenn ein Spieler zu Fuß davorsteht.
// Nur das nächstgelegene Item zeigt „NEHMEN“ – sonst stapeln sich bei einem
// Beute-Cluster mehrere Schilder übereinander. Maßgeblich ist der Abstand zum
// nächsten aktiven Spieler; alle anderen Hinweise werden ausgeblendet.
const PICKUP_PROMPT_RANGE = 2.0;
function updatePickupPrompts() {
  let best = null, bd = PICKUP_PROMPT_RANGE;
  for (const p of players) {
    if (p.dead || p.down || p.mount || p.riding) continue;
    for (const it of pickups) {
      if (!it.prompt) continue;
      const d = Math.hypot(p.pos.x - it.x, p.pos.z - it.z);
      if (d < bd) { bd = d; best = it; }
    }
  }
  for (const it of pickups) {
    if (it.prompt) it.prompt.visible = it === best;
  }
}

function updatePickups(dt) {
  for (let i = pickups.length - 1; i >= 0; i--) {
    const it = pickups[i];
    it.t += dt;
    it.life -= dt;
    it.mesh.rotation.y += dt * 1.8;
    const bob = Math.sin(it.t * 2.6) * 0.1;
    it.mesh.position.y = (it.baseY || 0.6) + bob;
    if (it.label) it.label.position.y = (it.baseY || 0.6) + 0.8 + bob * 0.6;
    if (it.prompt) it.prompt.position.y = (it.baseY || 0.6) + 1.15 + bob * 0.6;
    if (it.halo) {
      const pulse = 0.85 + Math.sin(it.t * 4) * 0.14;
      it.halo.scale.setScalar(pulse);
      it.halo.material.opacity = 0.6 + Math.sin(it.t * 4) * 0.18;
    }
    if (it.beam) it.beam.material.opacity = 0.22 + Math.sin(it.t * 3.2) * 0.1;
    if (it.life <= 0) removePickup(it);
  }
  updatePickupPrompts();
}

// Beute wird bewusst mit der Schlag-Taste aufgenommen – nicht mehr beim Laufen.
function tryPickup(p) {
  if (!p || p.dead || p.down) return false;
  let best = null, bd = PICKUP_PROMPT_RANGE;
  for (const it of pickups) {
    const d = Math.hypot(it.x - p.pos.x, it.z - p.pos.z);
    if (d < bd) { bd = d; best = it; }
  }
  if (!best) return false;
  takePickup(p, best);
  removePickup(best);
  return true;
}

function takePickup(p, it) {
  if (it.kind === 'weapon') {
    equipWeapon(p, it.weaponKind);
    burst(it.x, 1.0, it.z, [PICK_COLORS.weapon, 0xffffff], 14, 3.2, 0.09);
    ring(it.x, 0.5, it.z, PICK_COLORS.weapon, 1.6, 0.26);
    return;
  }
  if (it.kind === 'gold') {
    addScore(ITEMS.gold.score, p);
    addMeter(p, 4);
    toast(`GOLD +${ITEMS.gold.score}`);
  } else {
    const heal = ITEMS[it.kind].heal;
    p.hp = Math.min(p.maxhp, p.hp + heal);
    setHP(p);
    toast(`${ITEMS[it.kind].name} +${heal} LEBEN`);
  }
  sfx.pickup();
  burst(it.x, 0.8, it.z, [PICK_COLORS[it.kind] || 0xffffff, 0xffffff], 12, 3, 0.09);
  ring(it.x, 0.5, it.z, PICK_COLORS[it.kind] || 0xffffff, 1.4, 0.24);
}

/* ============================== WELLEN =================================== */
const WAVE_DEFS = WAVES;
const TOTAL_WAVES = WAVE_DEFS.length;
let waveDelay = 1.0, waveActive = false;
let currentTrackKey = null;
let eliteSeq = 0;

const music = createMusic();

function playTrackForWave() {
  const def = WAVE_DEFS[wave];
  if (!def || muted || !started) return;
  const key = def.boss ? `boss:${def.district}` : `map:${def.district}`;
  if (key === currentTrackKey) return;
  currentTrackKey = key;
  music.start(def.boss ? makeBossTrack(def.district) : makeTrack(def.district));
}

// Ein Gegner für den aktuellen Abschnitt. Nachschub erscheint VOR dem Spieler,
// damit man in der Map-Runde weiterläuft und nicht an einer Stelle klebt.
function spawnSectionEnemy(type, sec, i) {
  const [lo, hi] = SECTION_BOUNDS[sec] || SECTION_BOUNDS[0];
  const cx = SECTION_ARENA[sec] || SECTION_ARENA[0];
  const lead = players.find((p) => !p.dead && !p.down) || players.find((p) => !p.dead) || P;
  // Erste Gruppe wartet weiter vorn (man läuft erst ein Stück), Nachschub
  // erscheint direkt vor dem Spieler, damit die Runde in Bewegung bleibt.
  const base = lead.pos.x > cx - 24
    ? clamp(lead.pos.x + 7, lo + 4, hi - 5)
    : clamp(cx - 14, lo + 4, hi - 5);
  const x = clamp(base + ((i % 3) - 1) * 1.7 + rndRange(-0.5, 0.5), lo + 2, hi - 3);
  const z = clamp(rndRange(-1.9, 1.9), -LANE, LANE);
  const cfg = diffCfg();
  const elite = !!cfg.eliteEvery && (++eliteSeq % cfg.eliteEvery === 0);
  const e = spawnEnemy(type, x, z, false, elite);
  if (!e) return null;
  e.sec = sec;
  const scale = (1 + wave * 0.035) * cfg.hp;
  e.maxhp = Math.round(e.maxhp * scale);
  e.hp = e.maxhp;
  return e;
}

// Garantierte Beute pro Abschnitt: zwei Waffen, Döner, Ayran, Gold — alles in
// der begehbaren Gasse (z ±1.4) und mit Namen über dem Objekt.
function spawnSectionLoot(sec) {
  const cx = SECTION_ARENA[sec] || SECTION_ARENA[0];
  const [lo, hi] = SECTION_BOUNDS[sec] || SECTION_BOUNDS[0];
  const keys = Object.keys(WEAPONS);
  const put = (kind, ox, z, wk) => spawnPickup(kind,
    clamp(cx + ox, lo + 4, hi - 4), clamp(z, -1.4, 1.4), wk);
  // Bewusst knapp: die Straße soll nicht mit Beute zugepflastert sein.
  const plan = [
    ['weapon', -16, -1.05],
    ['doner', -8, 0.95],
    ['ayran', -1, -1.15],
    ['gold', 7, 1.2],
    ['gold', 14, -0.9],
    ['doner', 21, 1.1],
    ['ayran', 27, -1.2],
  ];
  const budget = Math.min(plan.length, diffCfg().loot);
  for (let i = 0; i < budget; i++) {
    const [kind, ox, z] = plan[i];
    put(kind, ox, z, kind === 'weapon' ? keys[(sec * 2) % keys.length] : undefined);
  }
}

// Albtraum-Bosskampf: drei Elite-Wachen stehen von Beginn an um den Boss.
function spawnBossGuards(boss, d) {
  const [lo, hi] = SECTION_BOUNDS[2];
  const types = ['guard', 'shield', 'janissary'];
  const offsets = [[-2.8, -1.0], [2.6, 1.1], [0.3, -1.7]];
  let count = 0;
  for (let i = 0; i < types.length && i < (d.guards || 0); i++) {
    const g = spawnEnemy(types[i],
      clamp(boss.pos.x + offsets[i][0], lo + 2, hi - 3), offsets[i][1], false, true);
    if (!g) continue;
    g.sec = 2;
    g.bossGuard = true;
    const scale = (1 + wave * 0.035) * d.hp;
    g.maxhp = Math.round(g.maxhp * scale);
    g.hp = g.maxhp;
    ring(g.pos.x, 0.12, g.pos.z, ELITE_GOLD, 2.4, 0.45);
    count++;
  }
  return count;
}

function startWave() {
  const def = WAVE_DEFS[wave];
  if (!def) return;
  const sec = wave % 3;
  // Map wird nur beim Distriktwechsel neu gebaut — die Straße bleibt bestehen.
  if (def.district !== builtDistrict) {
    buildDistrict(def.district, wave);
    placePlayersAtStart();
  }
  districtCleared = false;
  victory = false;
  waveActive = true;
  wavePending = false;
  eliteSeq = 0;
  // Jeder Abschnitt bekommt wieder zwei Alarm-Trupps.
  alarmSquadsLeft = ALARM_SQUADS_PER_SECTION;
  alarmSquadCd = 0;
  playTrackForWave();

  const comp = def.comp.length ? def.comp : ['punk'];
  const d = diffCfg();
  // Jeder Abschnitt ist eine Gruppe von 18–24 Gegnern (Schwierigkeit skaliert),
  // die in Wellen nachrückt.
  const base = def.boss ? 6 : 18 + Math.min(6, def.district);
  const total = def.boss
    ? Math.max(4, Math.round(base * d.enemies))
    : Math.max(12, Math.min(32, Math.round(base * d.enemies)));
  sectionQueue = [];
  for (let i = 0; i < total; i++) sectionQueue.push(comp[i % comp.length]);
  const first = Math.min(10, Math.max(5, Math.round(total * 0.35)));
  for (let i = 0; i < first; i++) spawnSectionEnemy(sectionQueue.shift(), sec, i);

  if (def.boss) {
    const [lo, hi] = SECTION_BOUNDS[2];
    const b = spawnEnemy(def.boss, clamp(SECTION_ARENA[2] + 7, lo + 3, hi - 3), 0, true);
    if (b) {
      b.sec = 2;
      const scale = (1 + wave * 0.03) * d.hp;
      b.maxhp = Math.round(b.maxhp * scale);
      b.hp = b.maxhp;
      showBossBar(b);
      if (d.guards) spawnBossGuards(b, d);
    }
    banner(BOSSES[def.boss].name);
  } else {
    banner(`ABSCHNITT ${sec + 1}`);
  }
  spawnSectionLoot(sec);
  waveTag.textContent = `RUNDE ${def.district + 1}/10 · ABSCHNITT ${sec + 1}/3 · WELLE ${wave + 1}/30`;
  lastEnemyShown = enemies.filter((e) => !e.dead).length + sectionQueue.length;
  setEnemyCount(lastEnemyShown);
  showObjective(sec === 2
    ? (d.guards ? 'BOSS + WACHE BESIEGEN' : 'BOSS BESIEGEN')
    : 'ALLE GEGNER BESIEGEN');
  sfx.wave();
}

// Ende der Map-Runde: Boss liegt, offenes Exit-Tor, zurück zum Straßenanfang.
function advanceDistrict() {
  const def = WAVE_DEFS[wave];
  if (!def) return;
  if (def.district >= DISTRICTS.length - 1) {
    districtCleared = false;
    victory = true;
    waveActive = false;
    banner('ALLE 10 DISTRIKTE GESCHAFFT');
    showMsg('SIEG', players.length > 1
      ? `${P.name} ${P.score} · ${P2.name} ${P2.score} PUNKTE`
      : `${P.name} — ${P.score} PUNKTE`);
    showObjective('');
    music.stop();
    currentTrackKey = null;
    return;
  }
  districtCleared = false;
  wave = (def.district + 1) * 3;
  waveActive = false;
  wavePending = false;
  waveDelay = 1.8;
  banner(`DISTRIKT ${def.district + 2}`);
  showObjective('NEUER DISTRIKT …');
  updateScores();
}

function updateWaves(dt) {
  if (!started || victory) return;

  // Boss ist gefallen: Der Exit am Ende der Straße startet die nächste Runde.
  if (districtCleared) {
    if (atDistrictExit()) advanceDistrict();
    return;
  }

  if (!waveActive) {
    // Zwischen zwei Abschnitten: erst weiterlaufen, dann startet der nächste.
    if (wavePending) {
      const lead = players.find((p) => !p.dead && !p.down) || players.find((p) => !p.dead);
      const trigger = SECTION_TRIGGER[wave % 3] || 0;
      if (lead && lead.pos.x >= trigger) startWave();
      return;
    }
    waveDelay -= dt;
    if (waveDelay <= 0) startWave();
    return;
  }

  // Nachschub, sobald der Abschnitt fast geräumt ist — Wellen dauern länger.
  const alive = enemies.filter((e) => !e.dead && e.state !== 'ko').length;
  const remaining = alive + sectionQueue.length;
  if (remaining !== lastEnemyShown) {
    lastEnemyShown = remaining;
    setEnemyCount(remaining);
  }
  const d = diffCfg();
  if (sectionQueue.length && alive <= d.reinforceAt) {
    const batch = Math.min(d.batch, sectionQueue.length);
    for (let i = 0; i < batch; i++) spawnSectionEnemy(sectionQueue.shift(), wave % 3, 5 + i);
    banner('NACHSCHUB');
    showObjective('NACHSCHUB!');
    sfx.wave();
  }

  const total = enemies.filter((e) => !e.dead).length;
  if (total === 0) {
    waveActive = false;
    hideBossBar();
    const sec = wave % 3;

    // Kleine Heilung nach jedem Abschnitt (Schwierigkeit skaliert)
    const heal = Math.round(25 * diffCfg().heal);
    for (const p of players) {
      if (!p.dead) { p.hp = Math.min(p.maxhp, p.hp + heal); setHP(p); }
    }

    if (sec < 2) {
      // Tor öffnen und weiterlaufen lassen
      openGate(sec);
      wave += 1;
      wavePending = true;
      banner('TOR OFFEN');
      showObjective('→ WEITERLAUFEN');
      updateScores();
    } else {
      // Boss liegt: Exit-Tor öffnen, Distrikt-Runde abschließen.
      openGate(2);
      districtCleared = true;
      // Jeder Spieler bekommt den Distrikt-Bonus auf sein eigenes Konto.
      for (const p of players) addScore(500, p);
      banner('DISTRIKT GESÄUBERT +500');
      showObjective('→ ZUM EXIT AM STRASSENENDE');
    }
  }
}

/* ============================== ANIMATION ================================ */
const SMOOTH = 16;

function animateFighter(f, dt, isPlayer) {
  const g = f.fig;
  // Steht die Figur auf dem Bürgersteig, sitzt sie 0,3 Einheiten höher.
  g.root.position.y = (f.y || 0) + groundYAt(f.pos.z);
  const k = 1 - Math.exp(-SMOOTH * dt);

  let armL = 0, armR = 0, legL = 0, legR = 0, torsoY = 0, bodyRX = 0, bodyY = 0;
  let armLz = 0, armRz = 0, legLz = 0, legRz = 0, headRX = 0;

  const st = f.state;
  const t = f.t;
  const moving = f.moving;

  if (st === 'down') {
    // Liegend am Boden: Oberkörper zurückgelehnt, ein Arm stützt, der andere
    // winkt schwach im Takt – die Pose bleibt offen, damit Hilfe erkennbar ist.
    const rise = easeOut(clamp(t / 0.5, 0, 1));
    const wave = Math.sin(t * 3.4);
    bodyRX = -1.28 * rise;
    bodyY = -0.3 * rise;
    armL = 0.55 + wave * 0.12;
    armR = 1.15 + wave * 0.35;
    armLz = 0.34;
    armRz = -0.26 + wave * 0.1;
    legL = 0.5;
    legR = 0.24;
  } else if (st === 'ko') {
    const p = clamp(t / 0.55, 0, 1);
    bodyRX = -1.35 * easeOut(p);
    bodyY = -0.28 * easeOut(p);
    armL = 0.9; armR = -0.7; legL = 0.4; legR = 0.1;
  } else if (st === 'hurt') {
    const p = clamp(t / 0.3, 0, 1);
    bodyRX = 0.45 * (1 - p);
    armL = -0.8; armR = -0.6; legL = 0.3; legR = -0.2;
  } else if (!isPlayer && (st === 'windup' || st === 'strike')) {
    // Jeder Gegnertyp hat seine eigene Schlagkurve.
    const style = enemyStyle(f);
    const styleName = (ALL_TYPES[f.type] && ALL_TYPES[f.type].attack) || 'swing';
    const wind = enemyWindup(f);
    if (styleName === 'stab') {
      // Stich: Waffe eng am Körper zurückziehen, dann gerader Ausfall nach vorn.
      if (st === 'windup') {
        const q = easeOut(clamp(t / wind, 0, 1));
        armR = lerp(0.1, 0.95, q);
        armL = lerp(0.1, 0.55, q);
        armRz = -0.35 * q; armLz = 0.3 * q;
        torsoY = 0.45 * q;
        bodyRX = -0.12 * q; bodyY = -0.05 * q;
        legL = 0.42 * q; legR = -0.36 * q;
      } else {
        const q = easeOut(clamp(t / (style.hitAt + 0.06), 0, 1));
        armR = lerp(0.95, -2.25, q);
        armL = lerp(0.55, -0.55, q);
        armRz = lerp(-0.35, 0.1, q); armLz = 0.3;
        torsoY = lerp(0.45, -0.6, q);
        bodyRX = lerp(-0.12, 0.3, q); bodyY = -0.02;
        legL = 0.5; legR = -0.42;
      }
    } else if (styleName === 'bash') {
      // Schildstoß: Schulter einziehen, dann beide Arme geschlossen nach vorn.
      if (st === 'windup') {
        const q = easeOut(clamp(t / wind, 0, 1));
        armR = lerp(0.1, 0.9, q); armL = lerp(0.1, 0.9, q);
        armRz = -0.55 * q; armLz = 0.55 * q;
        torsoY = 0.18 * q; bodyRX = -0.2 * q; bodyY = -0.12 * q;
        legL = 0.36 * q; legR = -0.32 * q;
      } else {
        const q = easeOut(clamp(t / (style.hitAt + 0.07), 0, 1));
        armR = lerp(0.9, -1.5, q); armL = lerp(0.9, -1.5, q);
        armRz = lerp(-0.55, 0.2, q); armLz = lerp(0.55, -0.2, q);
        torsoY = lerp(0.18, -0.35, q);
        bodyRX = lerp(-0.2, 0.45, q); bodyY = lerp(-0.12, -0.05, q);
        legL = 0.55; legR = -0.5;
      }
    } else if (styleName === 'smash') {
      // Überkopfschlag: beide Fäuste hoch, dann mit dem ganzen Körper hinab.
      if (st === 'windup') {
        const q = easeOut(clamp(t / wind, 0, 1));
        armL = armR = lerp(0.2, 2.5, q);
        armLz = 0.2 * q; armRz = -0.2 * q;
        bodyRX = -0.4 * q; bodyY = -0.16 * q;
        legL = 0.24 * q; legR = -0.24 * q;
        torsoY = 0.1 * q;
      } else {
        const q = easeOut(clamp(t / (style.hitAt + 0.08), 0, 1));
        armL = armR = lerp(2.5, -1.15, q);
        bodyRX = lerp(-0.4, 0.65, q); bodyY = lerp(-0.16, -0.26, q);
        legL = 0.5; legR = -0.46;
        torsoY = lerp(0.1, -0.2, q);
      }
    } else if (styleName === 'leap') {
      // Sprungschlag: tiefe Hocke, Absprung mit angezogenen Beinen, Landung.
      if (st === 'windup') {
        const q = easeOut(clamp(t / wind, 0, 1));
        armL = armR = lerp(0.1, 0.8, q);
        bodyRX = 0.45 * q; bodyY = -0.28 * q;
        legL = 1.0 * q; legR = 0.7 * q;
        torsoY = 0.25 * q;
      } else {
        const p = clamp(t / style.hitAt, 0, 1);
        const air = Math.sin(Math.PI * Math.min(1, p * 1.05));
        g.root.position.y += air * 0.9;
        armL = armR = lerp(0.2, 1.9, air);
        armLz = 0.25; armRz = -0.25;
        bodyRX = -0.18 * air + 0.25 * (1 - p);
        bodyY = 0.1 * air;
        legL = 0.9 * air; legR = -0.9 * air;
        torsoY = -0.3 * air;
      }
    } else {
      // Weiter Schwinger (Punk/Bomber) bzw. Rückstoß des Schützen.
      const gun = styleName === 'shoot';
      if (st === 'windup') {
        const q = easeOut(clamp(t / wind, 0, 1));
        armR = lerp(0.1, gun ? 0.55 : 1.25, q);
        armL = lerp(0.1, gun ? 0.2 : 0.6, q);
        armRz = -0.3 * q; armLz = 0.22 * q;
        torsoY = (gun ? 0.12 : 0.6) * q;
        bodyRX = -0.16 * q;
        bodyY = -0.07 * q;
        legL = 0.32 * q; legR = -0.3 * q;
      } else {
        const q = easeOut(clamp(t / (gun ? 0.26 : 0.34), 0, 1));
        armR = lerp(gun ? 0.55 : 1.25, gun ? -0.4 : -2.05, q);
        armL = lerp(gun ? 0.2 : 0.6, gun ? -0.15 : -0.85, q);
        armRz = lerp(-0.3, 0.24, q); armLz = lerp(0.22, -0.18, q);
        torsoY = lerp(gun ? 0.12 : 0.6, gun ? -0.12 : -0.85, q);
        bodyRX = lerp(-0.16, gun ? 0.1 : 0.42, q);
        bodyY = 0.02;
        legL = 0.34; legR = -0.3;
      }
    }
  } else if (!isPlayer && (st === 'slamwind' || st === 'slam')) {
    // Boss-Slam: beide Fäuste über den Kopf, dann mit dem ganzen Körper hinab.
    const q = easeOut(clamp(t / (st === 'slamwind' ? 0.5 : 0.42), 0, 1));
    if (st === 'slamwind') {
      armL = armR = lerp(0.2, 2.45, q);
      armLz = 0.18 * q; armRz = -0.18 * q;
      bodyRX = -0.34 * q;
      bodyY = -0.14 * q;
      legL = 0.24 * q; legR = -0.24 * q;
      torsoY = 0;
    } else {
      armL = armR = lerp(2.45, -0.95, q);
      bodyRX = lerp(-0.34, 0.55, q);
      bodyY = lerp(-0.14, -0.24, q);
      legL = 0.44; legR = -0.4;
    }
  } else if (st === 'attack' && f.move === 'kick') {
    // 3er-Trittkette: Lowkick flach über den Boden, Highkick steil nach oben,
    // Roundhouse als weiter Bogen um die eigene Achse. Jede Stufe hat eine
    // eigene Hüft- und Standbeinarbeit statt nur eines anderen Winkels.
    const i = clamp(f.atkIdx | 0, 0, 2);
    const dur = MOVES.kick.dur[i];
    const p = clamp(t / dur, 0, 1);
    let kA;
    if (i === 0) {
      // Lowkick: kleiner Hüftschwung, der Fuß bleibt knapp über dem Asphalt.
      if (p < 0.26) kA = lerp(0, 0.3, easeOut(p / 0.26));
      else if (p < 0.5) kA = lerp(0.3, -0.82, easeOut((p - 0.26) / 0.24));
      else kA = lerp(-0.82, -0.18, (p - 0.5) / 0.5);
      legR = kA;
      legRz = 0.2 * Math.sin(Math.PI * p);
      legL = -0.34;
      armL = 0.52; armR = -0.46;
      armLz = 0.5; armRz = -0.42;
      bodyRX = 0.26 * Math.sin(Math.PI * p);
      torsoY = 0.42 * Math.sin(Math.PI * p);
      bodyY = 0.02 * Math.sin(Math.PI * p);
    } else if (i === 1) {
      // Highkick: Standbein streckt durch, der Fuß steigt bis Kopfhöhe.
      if (p < 0.24) kA = lerp(0, 0.45, easeOut(p / 0.24));
      else if (p < 0.5) kA = lerp(0.45, -1.95, easeOut((p - 0.24) / 0.26));
      else kA = lerp(-1.95, -0.3, (p - 0.5) / 0.5);
      legR = kA;
      legRz = 0.14 * Math.sin(Math.PI * p);
      legL = -0.14;
      armL = -0.95; armR = 0.62;
      armLz = 0.3; armRz = -0.55;
      bodyRX = 0.6 * Math.sin(Math.PI * p);
      torsoY = -0.38 * Math.sin(Math.PI * p);
      bodyY = 0.05 * Math.sin(Math.PI * p);
    } else {
      // Roundhouse: Hüfte holt weit aus, der gestreckte Fuß fegt im Bogen
      // nach vorn durch; Oberkörper und Arme drehen gegen.
      const wind = easeOut(clamp(p / 0.22, 0, 1));
      const sweep = easeOut(clamp((p - 0.22) / 0.28, 0, 1));
      const back = clamp((p - 0.5) / 0.5, 0, 1);
      const arc = sweep * (1 - back);
      if (p < 0.22) kA = lerp(0, 0.55, wind);
      else if (p < 0.5) kA = lerp(0.55, -1.6, sweep);
      else kA = lerp(-1.6, -0.3, back);
      legR = kA;
      legRz = -0.15 + 1.15 * arc;
      legL = -0.72;
      armL = lerp(0.2, 0.95, arc); armR = lerp(0.1, -0.85, arc);
      armLz = lerp(0.1, 0.85, arc); armRz = lerp(-0.1, -0.6, arc);
      bodyRX = 0.12 + 0.28 * arc;
      torsoY = lerp(lerp(0, 1.05, wind), -1.15, sweep);
      bodyY = 0.16 * Math.sin(Math.PI * Math.min(1, p * 1.1));
      headRX = -0.1 * arc;
    }
  } else if (st === 'attack' && f.move === 'throw') {
    // Beidhändiger Wurf: erst tief ausholen, dann den Gegner nach vorn reißen.
    const p = clamp(t / 0.45, 0, 1);
    const wind = easeOut(clamp(p / 0.22, 0, 1));
    const heave = easeOut(clamp((p - 0.22) / 0.3, 0, 1));
    const settle = clamp((p - 0.55) / 0.45, 0, 1);
    const s = heave * (1 - settle);
    armL = armR = lerp(lerp(-0.6, 0.9, wind), -1.9, s);
    armLz = lerp(0.2, -0.25, s); armRz = lerp(-0.2, 0.25, s);
    bodyRX = lerp(0.28 * wind, -0.2, s);
    torsoY = lerp(0.45 * wind, -0.35, s);
    legL = 0.38; legR = -0.34;
    headRX = 0.1 * wind;
  } else if (st === 'attack' && f.move !== 'shoot') {
    // 5er-Schlagkette mit eigener Technik pro Stufe: Links-Jab, Rechts-Cross,
    // Uppercut aus der Hocke, Kopfnuss mit Deckung und die kleine Schelle als
    // breiter Finisher. Arme, Hüfte, Kopf und Stand wechseln mit der Technik.
    const i = clamp(f.atkIdx | 0, 0, 4);
    const dur = MOVES.punch.dur[i];
    const p = clamp(t / dur, 0, 1);
    const back = easeOut(clamp(p / 0.32, 0, 1));
    const through = easeOut(clamp((p - 0.32) / 0.32, 0, 1));
    if (i === 0) {
      // Jab: kurze Kammer, dann schnurgerade aus der Schulter; Deckung bleibt.
      armL = p < 0.32 ? lerp(0.1, 0.55, back) : lerp(0.55, -2.1, through);
      armLz = 0.05 + 0.12 * through;
      armR = -0.35; armRz = -0.2;
      torsoY = -0.26 * Math.sin(Math.PI * Math.min(1, p * 1.1));
      bodyRX = 0.05;
      bodyY = 0.03 * Math.sin(Math.PI * p);
      legL = 0.24; legR = -0.2;
    } else if (i === 1) {
      // Cross: rechte Faust aus der Hüfte, die Ferse dreht mit.
      armR = p < 0.32 ? lerp(0.1, 1.15, back) : lerp(1.15, -1.9, through);
      armRz = lerp(-0.12, -0.15, through);
      armL = lerp(-0.25, 0.3, through); armLz = -0.15;
      torsoY = p < 0.32 ? lerp(0, 0.62, back) : lerp(0.62, -0.55, through);
      bodyRX = 0.07 - 0.1 * through;
      bodyY = 0.04 * Math.sin(Math.PI * p);
      legL = 0.3; legR = -0.3 - 0.12 * through;
    } else if (i === 2) {
      // Uppercut: erst in die Knie, dann reißt die Faust von unten nach oben.
      if (p < 0.32) {
        armR = lerp(0.1, 0.75, back); armRz = lerp(-0.1, 0.2, back);
        armL = lerp(-0.35, -0.6, back); armLz = -0.2;
        bodyRX = 0.22 * back;
        bodyY = -0.16 * back;
        torsoY = 0.26 * back;
        legL = 0.34 * back; legR = -0.34 * back;
      } else {
        // Faust endet vor dem Kinn und auf der Kameraseite – nicht hinter dem Hut.
        armR = lerp(0.75, -2.2, through); armRz = lerp(0.2, -0.62, through);
        armL = lerp(-0.6, -0.8, through); armLz = -0.2;
        bodyRX = lerp(0.22, -0.14, through);
        bodyY = lerp(-0.16, 0.2, through);
        torsoY = lerp(0.26, -0.3, through);
        legL = lerp(0.34, 0.12, through); legR = lerp(-0.34, -0.08, through);
        headRX = -0.3 * through;
      }
    } else if (i === 3) {
      // Kopfnuss: Fäuste zur Deckung, dann stoßen Körper und Kopf nach vorn.
      const wind = easeOut(clamp(p / 0.3, 0, 1));
      const snap = easeOut(clamp((p - 0.3) / 0.26, 0, 1));
      const settle = clamp((p - 0.56) / 0.44, 0, 1);
      const lunge = snap * (1 - settle);
      armL = armR = lerp(lerp(-0.2, -1.0, wind), -1.35, lunge);
      armLz = lerp(0.5, 0.62, lunge); armRz = lerp(-0.5, -0.62, lunge);
      torsoY = 0;
      bodyRX = 0.34 * lunge - 0.16 * wind * (1 - lunge);
      bodyY = -0.1 * lunge;
      headRX = 0.72 * lunge - 0.35 * (1 - snap);
      legL = 0.12 + 0.42 * lunge; legR = -0.1 - 0.34 * lunge;
    } else {
      // Kleine Schelle: offene Hand holt auf der Fernseite aus und fegt dann
      // kameranah vor dem Gesicht durch – der Finisher bleibt gut sichtbar.
      const wind = easeOut(clamp(p / 0.36, 0, 1));
      const swat = easeOut(clamp((p - 0.36) / 0.26, 0, 1));
      const ret = clamp((p - 0.62) / 0.38, 0, 1);
      const sweep = swat * (1 - ret);
      armR = lerp(lerp(0.1, 0.4, wind), -1.7, sweep);
      armRz = lerp(lerp(-0.1, 0.95, wind), -1.0, sweep);
      armL = lerp(0.1, -0.45, wind * (1 - sweep)); armLz = -0.3;
      torsoY = lerp(lerp(0, 0.95, wind), -1.05, sweep);
      bodyRX = 0.08 + 0.16 * sweep;
      bodyY = -0.05 * wind + 0.06 * sweep;
      legL = 0.28; legR = -0.24 - 0.1 * sweep;
      headRX = -0.12 * sweep;
    }
  } else if (st === 'special') {
    // Osmanische Schelle: ausholen, dann mit der kameranahen Hand durchziehen.
    const p = clamp(t / 0.85, 0, 1);
    const swing = easeOut(clamp((p - 0.32) / 0.3, 0, 1));
    const wind = clamp(p / 0.32, 0, 1);
    const nearA = lerp(-0.55, -2.35, swing);
    const farA = lerp(0.25, 0.55, swing);
    if (f.facing > 0) { armL = nearA; armR = farA; }
    else { armR = nearA; armL = farA; }
    torsoY = (f.facing > 0 ? 1 : -1) * (0.55 * wind - 1.15 * swing);
    bodyRX = -0.08 + 0.28 * swing;
    legL = 0.26; legR = -0.22;
    bodyY = 0.06 * Math.sin(Math.PI * Math.min(1, p * 1.4));
  } else if (st === 'airkick') {
    legR = -1.55;
    legL = 0.7;
    armL = 1.15; armR = 1.0;
    bodyRX = 0.5;
    torsoY = 0.1;
  } else if (st === 'grapple') {
    armR = -1.52;
    armL = -0.35;
    legL = 0.34; legR = -0.3;
    bodyRX = 0.18;
  } else if (f.grab || f.grabSync) {
    // Beide Hände am Kragen: Der Gegner hängt vorn, der Spieler zieht ihn mit.
    const s = Math.sin(f.walkPhase);
    armL = -1.35; armR = -1.3;
    armLz = 0.16; armRz = -0.16;
    bodyRX = 0.16;
    legL = 0.26 + s * 0.2;
    legR = -0.24 - s * 0.2;
  } else if (st === 'grabbed') {
    armL = -1.2; armR = -1.1;
    bodyRX = -0.22;
    legL = 0.25; legR = -0.18;
  } else if (st === 'attack' && f.move === 'shoot') {
    armR = -1.5;
    armL = -1.5;
    bodyRX = -0.08;
    legL = 0.2; legR = -0.15;
  } else if (st === 'jump') {
    const up = clamp(f.vy / 6.4, -1, 1);
    legL = 0.75; legR = -0.25;
    armL = -0.7 - up * 0.4; armR = -0.7 - up * 0.4;
    bodyRX = -0.1 * up;
  } else if (moving) {
    f.walkPhase += dt * 9.5;
    const s = Math.sin(f.walkPhase), c = Math.cos(f.walkPhase);
    legL = s * 0.62;
    legR = -s * 0.62;
    armL = -s * 0.5;
    armR = s * 0.5;
    bodyY = Math.abs(c) * 0.035;
    torsoY = s * 0.06;
    bodyRX = 0.04;
  } else {
    const b = Math.sin(performance.now() * 0.0025 + f.pos.x * 0.5);
    armL = 0.1 + b * 0.04;
    armR = 0.1 - b * 0.04;
    armLz = 0.05;
    armRz = -0.05;
    bodyY = b * 0.008;
  }

  // Schlagarm immer auf die Kameraseite legen, sonst verschwindet die Animation
  // hinter dem Körper (bei Blickrichtung rechts ist das der andere Arm).
  const enemySwing = !isPlayer && (f.state === 'windup' || f.state === 'strike');
  if ((f.state === 'attack' || enemySwing) && f.facing > 0) {
    const tmp = armL; armL = armR; armR = tmp;
    const tmpZ = armLz; armLz = armRz; armRz = tmpZ;
    const tmpL = legL; legL = legR; legR = tmpL;
    const tmpLZ = legLz; legLz = legRz; legRz = tmpLZ;
  }

  // Der Schlagarm folgt der Kurve ohne Nachlauf: knackige, lesbare Trefferposen.
  const snapPose = f.state === 'attack' || (!isPlayer && (f.state === 'strike' || f.state === 'slam'));
  // Rumpf und Kopf nur bei Spielerangriffen hart setzen; Gegner behalten ihre
  // weiche Durchzieh-Kurve, damit ihre Stile unverändert bleiben.
  const snapBody = isPlayer && f.state === 'attack';
  const kr = snapPose ? 1 : k;
  const kz = snapBody ? 1 : k;
  g.armL.rotation.x = lerp(g.armL.rotation.x, armL, kr);
  g.armR.rotation.x = lerp(g.armR.rotation.x, armR, kr);
  // Auch Querachsen und Rumpf folgen der Trefferpose ohne Nachlauf – sonst
  // verwischt gerade die breite Schelle und der Roundhouse-Bogen.
  g.armL.rotation.z = lerp(g.armL.rotation.z, armLz, kz);
  g.armR.rotation.z = lerp(g.armR.rotation.z, armRz, kz);
  g.legL.rotation.x = lerp(g.legL.rotation.x, legL, kr);
  g.legR.rotation.x = lerp(g.legR.rotation.x, legR, kr);
  g.torso.rotation.y = lerp(g.torso.rotation.y, torsoY, snapBody ? 1 : k);
  g.body.rotation.x = lerp(g.body.rotation.x, bodyRX, snapBody ? 1 : k);
  g.body.position.y = lerp(g.body.position.y, bodyY, snapBody ? 1 : k);
  g.head.rotation.x = lerp(g.head.rotation.x, headRX, snapBody ? 1 : k);

  // Kopf leicht zum Gegner
  let headY = 0;
  if (!isPlayer) {
    let tz = P.pos.z, bd = 1e9;
    for (const q of players) {
      if (q.dead) continue;
      const d = Math.abs(q.pos.x - f.pos.x);
      if (d < bd) { bd = d; tz = q.pos.z; }
    }
    headY = clamp((tz - f.pos.z) * 0.08, -0.25, 0.25);
  }
  g.head.rotation.y = lerp(g.head.rotation.y, headY, k);

  // Reiter sitzt auf dem Sattel: Beine gespreizt, Hände an den Zügeln.
  // Bei jedem Tritt wiegt er sich in den Bügeln, beim Hüpfen hebt er die Arme.
  if (f.riding) {
    const buckDur = f.state === 'donkeyfront' ? DONKEY_FRONT_DUR
      : f.state === 'donkeyspin' ? DONKEY_SPIN_DUR
        : f.state === 'donkeykick' ? DONKEY_KICK_DUR : 0;
    const buck = buckDur > 0;
    const hop = f.state === 'ridehop';
    const jolt = buck ? Math.sin(Math.PI * clamp(f.t / buckDur, 0, 1)) : 0;
    const air = hop ? clamp((f.y || 0) / 0.9, 0, 1) : 0;
    g.root.position.y += DONKEY_RIDE_Y;
    g.legL.rotation.x = lerp(g.legL.rotation.x, -1.15, k);
    g.legR.rotation.x = lerp(g.legR.rotation.x, -1.15, k);
    g.legL.rotation.z = lerp(g.legL.rotation.z, 0.34, k);
    g.legR.rotation.z = lerp(g.legR.rotation.z, -0.34, k);
    g.body.rotation.x = lerp(g.body.rotation.x, 0.12 - 0.34 * jolt - 0.2 * air, k);
    g.armL.rotation.x = lerp(g.armL.rotation.x, -0.5 - 0.5 * jolt - 0.25 * air, k);
    g.armR.rotation.x = lerp(g.armR.rotation.x, -0.5 - 0.5 * jolt - 0.25 * air, k);
    g.head.rotation.x = lerp(g.head.rotation.x, 0.12 * jolt, k);
  } else {
    g.legL.rotation.z = lerp(g.legL.rotation.z, legLz, kz);
    g.legR.rotation.z = lerp(g.legR.rotation.z, legRz, kz);
  }

  // Nur die Waffe auf der Kameraseite zeigen — sonst steckt sie im Körper.
  // Im Sattel wird sie weggepackt, dort zählt der Superkick.
  if (isPlayer && f.fig.heldWeapons) {
    const nearLeft = f.facing > 0;
    f.fig.heldWeapons[0].mesh.visible = !f.riding && !nearLeft;
    f.fig.heldWeapons[1].mesh.visible = !f.riding && nearLeft;
  }

  // Gegnerwaffen: ebenfalls nur die kameranahe Kopie zeigen.
  if (f.wpnL) {
    const nearLeft = f.facing > 0;
    for (const m of f.wpnL) m.visible = nearLeft;
    for (const m of f.wpnR) m.visible = !nearLeft;
  }
}

/* ============================== UPDATE =================================== */
let camX = 1.2;
let camZ = 0;

function updatePlayer(p, dt) {
  p.t += dt;
  p.inv = Math.max(0, p.inv - dt);
  p.comboT = Math.max(0, p.comboT - dt);
  if (p.comboT === 0 && p.combo > 0 && p.state !== 'attack') { p.combo = 0; showCombo(); }
  // Angriffskette verfällt, sobald das Fenster nach dem letzten Schlag abläuft.
  p.chainT = Math.max(0, p.chainT - dt);
  if (p.chainT === 0 && p.chainN > 0 && p.state !== 'attack') { p.chainN = 0; p.chainKind = null; }

  // K.O.: kurz warten, dann beim Partner wieder einsteigen
  if (p.dead) {
    p.fig.root.position.set(p.pos.x, p.y, p.pos.z);
    if (p === players[0] && grappleHintEl) grappleHintEl.classList.remove('on');
    if (p.out) {
      // Ausgeschieden: nach dem K.O. verschwindet die Figur vom Feld.
      p.deadT += dt;
      if (p.deadT > 1.1) p.fig.root.visible = false;
      animateFighter(p, dt, true);
      return;
    }
    animateFighter(p, dt, true);
    p.respawnT -= dt;
    if (p.respawnT <= 0) {
      // Im Koop neben dem Partner, allein an der eigenen Position wieder einsteigen.
      const mate = players.find((q) => q !== p && !q.dead && !q.out);
      if (mate) revivePlayer(p, mate);
      else respawnAtSpot(p);
    }
    return;
  }

  // Am Boden: liegt, wartet auf den Partner und wird ggf. gerettet.
  if (p.down) {
    updateDown(p, dt);
    if (p === players[0] && grappleHintEl) grappleHintEl.classList.remove('on');
    return;
  }

  // Auf dem Esel übernimmt die Reitlogik Bewegung und Angriff.
  if (p.mount) { updateRiding(p, dt); return; }

  const c = CONTROLS[p.id];
  const kb = p.remote ? (p.netKeys || {}) : keys;
  p.swingT = Math.max(0, p.swingT - dt);
  // Schusswaffen feuern weiter, solange die Taste gehalten wird.
  if (p.weapon && p.weapon.kind === 'gun' && kb[c.punch] && p.swingT <= 0 &&
      !p.grab && (p.state === 'idle' || p.state === 'walk')) {
    shootWeapon(p);
  }
  const canMove = (p.state === 'idle' || p.state === 'walk') && !p.dead;
  let mx = 0, mz = 0;
  if (canMove) {
    if (kb[c.left]) mx -= 1;
    if (kb[c.right]) mx += 1;
    if (kb[c.up]) mz -= 1;
    if (kb[c.down]) mz += 1;
  }
  p.moving = (mx !== 0 || mz !== 0);
  if (p.moving && canMove) {
    // Rennen: Shift halten oder 0,85 s durchlaufen
    p.runT += dt;
    p.sprint = (kb[c.sprint] || p.runT > 0.85) && !p.grab;
    // Mit einem Gegner im Griff geht es nur im Schritttempo voran.
    const speed = (p.sprint ? 9.6 : 5.6) * (p.grab ? 0.52 : 1);
    const len = Math.hypot(mx, mz) || 1;
    const nx = clamp(p.pos.x + (mx / len) * speed * dt, XMIN, maxWalkX());
    const nz = clamp(p.pos.z + (mz / len) * (p.sprint ? 4.6 : 3.4) * dt, -WALK_LANE, WALK_LANE);
    p.pos.x = nx;
    // Parkende Autos blockieren die Bordsteinkante, nicht die ganze Straße.
    if (!blockedByCar(nx, nz)) p.pos.z = nz;
    p.facing = mx !== 0 ? Math.sign(mx) : p.facing;
    p.walkPhase += dt * (p.sprint ? 15 : 9.5);
    if (p.sprint && Math.random() < 0.55) {
      ghost(p.pos.x, 0.55, p.pos.z, p.id === 0 ? 0x7fe0b0 : 0x7fc4ff, 0.5, 0.2);
    }
  } else {
    p.runT = 0;
    p.sprint = false;
  }

  // Sprung
  if (p.y > 0 || p.vy !== 0) {
    p.vy -= 20 * dt;
    p.y += p.vy * dt;
    if (p.y <= 0) {
      p.y = 0;
      p.vy = 0;
      if (p.state === 'airkick') landAirKick(p);
      else if (p.state === 'jump') { p.state = 'idle'; p.t = 0; }
    } else if (p.state === 'airkick' && !p.hitDone) {
      diveKickHit(p);
    }
  }

  // Rückstoß
  if (p.knock !== 0) {
    p.pos.x = clamp(p.pos.x + p.knock * dt, XMIN, maxWalkX());
    p.knock *= 0.86;
    if (Math.abs(p.knock) < 0.2) p.knock = 0;
  }

  // Angriff
  if (p.state === 'attack' && (p.move === 'shoot' || p.move === 'throw')) {
    if (p.t >= (p.move === 'throw' ? 0.45 : 0.24)) { p.state = 'idle'; p.t = 0; }
  } else if (p.state === 'attack') {
    const tab = MOVES[p.move] || MOVES.punch;
    const i = clamp(p.atkIdx | 0, 0, tab.dur.length - 1);
    const finisher = i === tab.finisher;
    // Der Kick zieht den Körper nach vorn in die Reichweite.
    if (p.move === 'kick' && p.t > 0.06 && p.t < Math.min(0.34, tab.dur[i] * 0.55)) {
      p.pos.x = clamp(p.pos.x + p.facing * 3.2 * dt, XMIN, maxWalkX());
    }
    // Kopfnuss und Cross setzen einen kurzen Schritt in den Gegner hinein.
    if (p.move === 'punch' && (i === 3 || i === 1) && p.t > 0.02 && p.t < tab.hit[i] + 0.04) {
      p.pos.x = clamp(p.pos.x + p.facing * (i === 3 ? 4.2 : 2.4) * dt, XMIN, maxWalkX());
    }
    // Leuchtspur am Fuß, damit jeder Tritt auch zwischen Gegnern lesbar ist.
    if (p.move === 'kick' && p.t > tab.hit[i] - 0.05 && p.t < tab.hit[i] + 0.22) {
      const leg = p.facing > 0 ? p.fig.legL : p.fig.legR;
      const shoe = leg.children[1];
      if (shoe) {
        shoe.getWorldPosition(_tv);
        ghost(_tv.x, _tv.y, _tv.z, finisher ? 0xffd76e : 0x7ad8ff, finisher ? 0.34 : 0.26, 0.3);
        if (finisher) ghost(_tv.x, _tv.y + 0.14, _tv.z, 0xffffff, 0.16, 0.14);
      }
    }
    // Faustspuren: Jab/Cross dünn und weiß, der Uppercut steigt golden auf,
    // der Finisher (Schelle) zieht die breite goldene Bahn.
    if (p.move === 'punch' && p.t > tab.hit[i] - 0.06 && p.t < tab.hit[i] + 0.14) {
      // Der Jab läuft mit der anderen Hand als Cross, Uppercut und Schelle.
      const arm = i === 0
        ? (p.facing > 0 ? p.fig.armR : p.fig.armL)
        : (p.facing > 0 ? p.fig.armL : p.fig.armR);
      const fist = arm.children[2];
      if (fist && (i === 0 || i === 1 || i === 2 || finisher)) {
        fist.getWorldPosition(_tv);
        if (finisher) {
          ghost(_tv.x, _tv.y, _tv.z, 0xffd76e, 0.3, 0.16);
          ghost(_tv.x - p.facing * 0.12, _tv.y + 0.05, _tv.z, 0xffffff, 0.14, 0.1);
        } else if (i === 2) {
          ghost(_tv.x, _tv.y, _tv.z, 0xffd76e, 0.24, 0.2);
          ghost(_tv.x - p.facing * 0.1, _tv.y - 0.2, _tv.z, 0xffffff, 0.12, 0.12);
        } else {
          ghost(_tv.x, _tv.y, _tv.z, 0xffffff, 0.13, 0.09);
        }
      }
    }
    // Kopfnuss: kurzer Aufprallfunke am Kopf statt an der Faust.
    if (p.move === 'punch' && i === 3 && p.t > tab.hit[i] - 0.05 && p.t < tab.hit[i] + 0.08) {
      const hd = p.fig.head.children[0];
      if (hd) {
        hd.getWorldPosition(_tv);
        ghost(_tv.x, _tv.y + 0.28, _tv.z, 0xfff1c9, 0.16, 0.1);
      }
    }
    if (!p.hitDone && p.t >= tab.hit[i]) { p.hitDone = true; playerStrike(p); }
    if (p.t >= tab.dur[i]) { p.state = 'idle'; p.t = 0; }
  }

  // Kette: erst heranziehen, dann als Waffe/als Wurf nutzen
  if (p.state === 'grapple') {
    const e = p.grabTarget;
    if (e && !e.dead) e.stun = Math.max(e.stun, 0.3);
    if (p.t > 0.45) finishGrapple(p);
  }

  // Gegner im Griff halten: er hängt vorn am Kragen, wandert beim Drehen mit
  // und reißt sich nach GRAB_HOLD los, wenn der Spieler nicht wirft.
  if (p.grab) {
    const e = p.grab.e;
    if (!e || e.dead || e.state === 'ko' || e.thrown) {
      p.grab = null;
      p.grabT = 0;
    } else {
      p.grab.t -= dt;
      p.grabT = (p.grabT || 0) + dt;
      e.state = 'grabbed';
      e.t = 0;
      e.stun = Math.max(e.stun, 0.6);
      e.thrown = null;
      e.y = 0;
      e.pos.x = clamp(p.pos.x + p.facing * 1.15, XMIN, maxWalkX());
      e.pos.z = p.pos.z;
      e.facing = -p.facing;
      if (p.grab.t <= 0) {
        releaseGrab(p);
        p.inv = Math.max(p.inv, 0.25);
        toast('GRIFF GELÖST');
      }
    }
  }

  // Sprungangriff: Divekick trifft schon in der Luft
  if (p.state === 'airkick') {
    const shoe = p.facing > 0 ? p.fig.legL : p.fig.legR;
    if (shoe.children[1]) {
      shoe.children[1].getWorldPosition(_tv);
      ghost(_tv.x, _tv.y, _tv.z, 0xffd76e, 0.3, 0.18);
    }
    if (p.t > 0.9) { p.state = 'idle'; p.t = 0; }
  }

  // Osmanische Schelle: Handkantenschlag nach vorn.
  if (p.state === 'special') {
    updateSlapHand(p);
    if (!p.hitDone && p.t >= 0.44) { p.hitDone = true; specialStrike(p); }
    // Goldene Handspur während des Durchziehens.
    if (p.t > 0.30 && p.t < 0.58) {
      const nearArm = p.facing > 0 ? p.fig.armL : p.fig.armR;
      const fist = nearArm.children[nearArm.children.length - 1];
      if (fist) {
        fist.getWorldPosition(_tv);
        ghost(_tv.x, _tv.y, _tv.z, 0xfff1b8, 0.34, 0.15);
        ghost(_tv.x, _tv.y, _tv.z + 0.05, 0xffd76e, 0.22, 0.12);
      }
      // Handspur: ein einzelner Geist pro Frame, hinter der Hand – sonst
      // stapeln sich die Würfel zu einem weißen Klecks.
      if (p.slapHand && p.slapHand.visible && (frameCount & 1) === 0 && p.t > 0.34) {
        const hp = p.slapHand.position;
        ghost(hp.x - p.facing * 0.45, hp.y - 0.05, hp.z - 0.2, 0xffd76e, 0.2, 0.09);
      }
    }
    if (p.t >= 0.85) { p.state = 'idle'; p.t = 0; p.buffer = null; hideSlapHand(p); }
  }
  // Sicherheitsnetz: endet der Spezialzustand anders (K.O., Reset), räumt die Hand ab.
  if (p.state !== 'special' && p.slapHand && p.slapHand.visible) hideSlapHand(p);

  if (p.state === 'hurt') {
    if (p.t > 0.32) { p.state = 'idle'; p.t = 0; }
  }
  if (p.state === 'idle' && p.moving) p.state = 'walk';
  if (p.state === 'walk' && !p.moving) p.state = 'idle';

  // Gepufferte Eingabe ausführen, sobald der Spieler wieder frei ist
  if (p.buffer) {
    p.buffer.t -= dt;
    if (p.buffer.t <= 0) {
      p.buffer = null;
    } else if (p.state === 'idle' || p.state === 'walk') {
      const b = p.buffer;
      p.buffer = null;
      tryAttack(p, b.kind);
    }
  }

  // Automatisch zum nächsten Gegner drehen, wenn frei
  if ((p.state === 'idle' || p.state === 'walk') && !p.moving && p.comboT > 0) {
    const near = nearestEnemyTo(p);
    if (near && Math.abs(near.pos.x - p.pos.x) < 5) p.facing = Math.sign(near.pos.x - p.pos.x) || p.facing;
  }

  p.fig.root.position.set(p.pos.x, p.y, p.pos.z);
  p.fig.root.rotation.y = p.facing * (Math.PI / 2 - 0.42);
  updateGrappleVisuals(p, dt);
  animateFighter(p, dt, true);
}

/* -------------------- Sichtbare Gegner-Schläge --------------------------- */
// Faust des kameranahen Arms – dort hängt die Waffe. Die Pose wird in
// animateFighter gesetzt, hier wird nur die Weltposition abgegriffen.
const _tipV = new THREE.Vector3();
function enemyArmTip(e) {
  const arm = e.facing > 0 ? e.fig.armL : e.fig.armR;
  const fist = arm.children[2];
  if (!fist) return null;
  fist.getWorldPosition(_tipV);
  return _tipV;
}

// Ausholen glimmt an der Waffe auf, der Durchzug zieht eine leuchtende Spur.
function updateEnemyAttackFx(e) {
  const st = e.state;
  if (st !== 'windup' && st !== 'strike') return;
  if (e.stun > 0) return;
  const col = ENEMY_FX[e.type] || 0xffd76e;
  const tip = enemyArmTip(e);
  if (!tip) return;
  if (st === 'windup') {
    const dur = enemyWindup(e);
    const p = clamp(e.t / dur, 0, 1);
    // Pulsierendes Glimmen an der Waffe: je näher der Schlag, desto heller.
    const pulse = 0.5 + 0.5 * Math.sin(e.t * 34);
    ghost(tip.x, tip.y, tip.z, col, 0.07 + 0.05 * pulse + 0.1 * p, 0.1);
  } else {
    // Zwei Würfel pro Frame: farbige Spur plus weißer Kern.
    ghost(tip.x, tip.y, tip.z, col, 0.2, 0.12);
    ghost(tip.x - e.facing * 0.14, tip.y + 0.04, tip.z, 0xffffff, 0.1, 0.07);
  }
}

function updateEnemies(dt) {
  for (const e of enemies) {
    if (e.dead) continue;
    e.t += dt;
    e.cd = Math.max(0, e.cd - dt);
    const t = ALL_TYPES[e.type];
    const tgt = nearestPlayerTo(e);
    e.lured = false;
    if (!tgt) {
      e.moving = false;
      e.fig.root.position.set(e.pos.x, e.y, e.pos.z);
      animateFighter(e, dt, false);
      updateEnemyHpBar(e, dt);
      continue;
    }

    if (e.state === 'ko') {
      e.deadT += dt;
      // Wegkippen
      e.pos.x += e.kx * dt;
      e.kx *= 0.9;
      if (e.deadT > 1.1) {
        burst(e.pos.x, 0.7, e.pos.z, Object.values(t.pal).filter((c) => typeof c === 'number'), 18, 4, 0.1);
        scene.remove(e.fig.root);
        removeEnemyHpBar(e);
        e.dead = true;
        setEnemyCount(Math.max(0, enemies.filter((x) => !x.dead).length + sectionQueue.length));
      }
      e.fig.root.position.set(e.pos.x, e.y, e.pos.z);
      animateFighter(e, dt, false);
      continue;
    }

    // Geworfen: Der Gegner fliegt im Bogen, taumelt und schlägt am Boden auf.
    if (e.thrown) {
      updateThrownEnemy(e, dt);
      e.fig.root.position.set(e.pos.x, e.y, e.pos.z);
      e.fig.root.rotation.y = e.facing * (Math.PI / 2 - 0.42);
      if (e.thrown) e.fig.root.rotation.z = e.thrown.spin * e.thrown.t;
      animateFighter(e, dt, false);
      updateEnemyAttackFx(e);
      updateEnemyHpBar(e, dt);
      continue;
    }

    // Betäubt / im Griff: keine Aktion, aber sichtbar in der Pose
    if (e.stun > 0) {
      e.stun -= dt;
      e.moving = false;
      if (e.state === 'grabbed' && e.stun > 0.35) {
        e.fig.root.position.set(e.pos.x, e.y, e.pos.z);
        e.fig.root.rotation.y = e.facing * (Math.PI / 2 - 0.42);
        animateFighter(e, dt, false);
        updateEnemyHpBar(e, dt);
        continue;
      }
    }

    if (e.state === 'hurt') {
      e.pos.x += e.kx * dt;
      e.kx *= 0.88;
      if (e.t > Math.max(0.22, e.kt)) { e.state = 'walk'; e.t = 0; e.cd = 0.25; }
    } else if (e.state === 'windup') {
      e.facing = Math.sign(tgt.pos.x - e.pos.x) || e.facing;
      if (e.t > enemyWindup(e)) {
        e.state = 'strike';
        e.t = 0;
        e.hitDone = false;
        sfx.swing();
        // Sprungschlag: Landepunkt schon beim Absprung festlegen.
        const st = enemyStyle(e);
        if (st.leap) {
          // Landepunkt ist die aktuelle Spielerposition, nicht eine feste Weite –
          // sonst springt der Gegner aus kurzer Distanz über das Ziel hinaus.
          const b = SECTION_BOUNDS[e.sec || 0] || SECTION_BOUNDS[0];
          e.leapFromX = e.pos.x;
          e.leapToX = clamp(tgt.pos.x, b[0] + 0.5, b[1] - 0.5);
        }
      }
    } else if (e.state === 'strike') {
      const st = enemyStyle(e);
      if (st.leap) {
        // Bogen nach vorn: Position folgt dem Sprung, die Höhe kommt aus der Pose.
        const q = clamp(e.t / st.hitAt, 0, 1);
        if (typeof e.leapFromX === 'number') e.pos.x = lerp(e.leapFromX, e.leapToX, q);
      } else if (st.lunge && e.t < st.hitAt) {
        // Stich/Schildstoß schieben den Körper nach vorn in den Treffer.
        e.pos.x += e.facing * st.lunge * dt;
      }
      const b = SECTION_BOUNDS[e.sec || 0] || SECTION_BOUNDS[0];
      e.pos.x = clamp(e.pos.x, b[0] + 0.5, b[1] - 0.5);
      if (!e.hitDone && e.t > st.hitAt) { e.hitDone = true; enemyStrike(e, st); }
      if (e.t > st.strike) {
        e.state = 'walk'; e.t = 0; e.cd = rndRange(0.7, 1.5);
        e.leapFromX = null;
      }
    } else if (e.state === 'shoot') {
      if (e.t > 0.3) { e.state = 'walk'; e.t = 0; e.cd = 2.2; }
    } else if (e.state === 'slamwind') {
      // Boss holt aus: Blick zum Ziel richten, Bewegung einfrieren.
      e.facing = Math.sign(tgt.pos.x - e.pos.x) || e.facing;
      e.moving = false;
      if (e.t > 0.5) { e.state = 'slam'; e.t = 0; bossSlamImpact(e); }
    } else if (e.state === 'slam') {
      e.moving = false;
      if (e.t > 0.42) { e.state = 'walk'; e.t = 0; e.cd = 0.7; }
    } else {
      // laufen / ausrichten
      // Ein aktiver Auto-Alarm zieht Gegner vom Spieler weg zum Wrack.
      const alarm = nearestCarAlarm(e.pos.x, e.pos.z);
      const alarmDist = alarm ? Math.hypot(alarm.x - e.pos.x, alarm.z - e.pos.z) : 0;
      // Der Alarm hat Vorrang: Auch ein Gegner direkt am Spieler läuft kurz zum Wrack.
      const lure = !!alarm && alarmDist > 1.2;
      const goalX = lure ? alarm.x : tgt.pos.x;
      // Nicht in das Wrack hineinlaufen: Gegner sammeln sich auf der Straßenseite.
      const goalZ = lure ? alarm.z + 2.0 : tgt.pos.z + e.lanePref * 0.35;
      e.lured = lure;
      const dx = goalX - e.pos.x;
      const wantZ = goalZ;
      const distX = Math.abs(dx) - (t.reach - 0.25);
      const distZ = Math.abs(goalZ - e.pos.z);
      let moved = false;

      // Boss-Spezial: Schockwellen-Slam
      if (e.isBoss) {
        e.bossTimer = Math.max(0, e.bossTimer - dt);
        if (e.bossTimer <= 0 && Math.abs(dx) < 6.5) {
          bossSlam(e);
          e.fig.root.position.set(e.pos.x, e.y, e.pos.z);
          animateFighter(e, dt, false);
          updateEnemyHpBar(e, dt);
          continue;
        }
      }

      // Fernkämpfer bleiben auf Abstand und schießen
      if (t.ranged && e.cd <= 0 && Math.abs(dx) > 2.4 && Math.abs(dx) < t.ranged + 3 && distZ < 1.4) {
        e.facing = Math.sign(dx) || e.facing;
        e.state = 'shoot';
        e.t = 0;
        e.moving = false;
        enemyShoot(e);
        sfx.swing();
      } else {
        if (distX > 0.15) {
          const dash = t.dash && e.cd <= 0 && Math.abs(dx) > 3.5;
          const spd = (e.speed || t.speed) * (lure ? CAR_ALARM_LURE_SPEED : 1) * (dash ? 2.1 : 1);
          e.pos.x += Math.sign(dx) * Math.min(spd, distX * 6) * dt;
          if (dash && Math.random() < 0.3) ghost(e.pos.x, 0.6, e.pos.z, 0xffb347, 0.4, 0.16);
          moved = true;
        }
        if (distZ > 0.22) {
          const nz = e.pos.z + Math.sign(goalZ - e.pos.z) * 1.7 * (lure ? 1.3 : 1) * dt;
          if (!blockedByCar(e.pos.x, nz, 0.3)) e.pos.z = nz;
          moved = true;
        } else {
          e.pos.z = lerp(e.pos.z, wantZ, 0.02);
        }
        const secBounds = SECTION_BOUNDS[e.sec || 0] || SECTION_BOUNDS[0];
        e.pos.x = clamp(e.pos.x, secBounds[0] + 0.5, secBounds[1] - 0.5);
        e.pos.z = clamp(e.pos.z, -WALK_LANE, WALK_LANE);
        e.facing = Math.sign(goalX - e.pos.x) || e.facing;
        e.moving = moved;

        // Sprungschläger setzen auch aus mittlerer Distanz zum Sprung an.
        const atkStyle = enemyStyle(e);
        const leapWindow = atkStyle.leap && Math.abs(dx) > 1.0 && Math.abs(dx) < atkStyle.leap + 1.2;
        if ((distX <= 0.2 || leapWindow) && distZ < 0.55 && e.cd <= 0) {
          if (t.ranged) {
            // Auch auf Tuchfühlung bleibt der Schütze beim Schuss statt zu prügeln.
            e.facing = Math.sign(tgt.pos.x - e.pos.x) || e.facing;
            e.state = 'shoot';
            e.t = 0;
            e.moving = false;
            enemyShoot(e);
            sfx.swing();
          } else {
            e.state = 'windup';
            e.t = 0;
            e.moving = false;
          }
        } else if (distX <= 0.2) {
          e.moving = false;
        }
      }
    }

    e.fig.root.position.set(e.pos.x, e.y, e.pos.z);
    e.fig.root.rotation.y = e.facing * (Math.PI / 2 - 0.42);
    animateFighter(e, dt, false);
    updateEnemyAttackFx(e);
    updateEnemyHpBar(e, dt);
  }

  // Gegner auseinanderschieben und von beiden Spielern fernhalten
  for (let i = 0; i < enemies.length; i++) {
    const a = enemies[i];
    if (a.dead || a.state === 'ko') continue;
    // Ein Gegner im Griff oder im Flug wird nicht weggeschoben.
    if (a.state === 'grabbed' || a.thrown) continue;
    for (const p of players) {
      if (p.dead) continue;
        const dxp = a.pos.x - p.pos.x, dzp = a.pos.z - p.pos.z;
      const dp = Math.hypot(dxp, dzp);
      if (dp < 1.05 && dp > 0.001) {
        a.pos.x = p.pos.x + (dxp / dp) * 1.05;
        a.pos.z = clamp(p.pos.z + (dzp / dp) * 1.05, -WALK_LANE, WALK_LANE);
      }
    }
    for (let j = i + 1; j < enemies.length; j++) {
      const b = enemies[j];
      if (b.dead || b.state === 'ko' || b.state === 'grabbed' || b.thrown) continue;
      const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.85 && d > 0.001) {
        const push = (0.85 - d) * 0.5;
        a.pos.x -= (dx / d) * push; b.pos.x += (dx / d) * push;
        a.pos.z -= (dz / d) * push; b.pos.z += (dz / d) * push;
      }
    }
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    p.v.y -= 16 * dt;
    p.m.position.addScaledVector(p.v, dt);
    p.m.rotation.x += p.spin * dt;
    p.m.rotation.y += p.spin * 0.7 * dt;
    if (p.m.position.y < 0.03) { p.m.position.y = 0.03; p.v.y *= -0.35; p.v.x *= 0.7; p.v.z *= 0.7; }
    if (p.flash) {
      p.m.scale.setScalar(p.size * clamp(p.life / (p.maxLife || 0.16), 0, 1));
    } else {
      const s = clamp(p.life * 3, 0, 1);
      p.m.scale.setScalar(p.size * s + 0.01);
    }
    if (p.life <= 0) { scene.remove(p.m); particles.splice(i, 1); }
  }
}

// Numerischer Kamera-Fit: zieht so weit zurück, bis beide Spieler samt Füßen
// und Kopf sicher im Rahmen liegen. Die Projektion berücksichtigt FOV und
// Seitenverhältnis, damit auch schmale Fenster stimmen.
const camProbe = new THREE.Vector3();
// Im Koop möglichst mittig schauen, damit der Zoom beide Spieler fasst.
function coopLookAhead() { return players.length > 1 ? 0.9 : 1.7; }
function fitCameraToPlayers(back, sx, sy, lift) {
  const look = coopLookAhead();
  for (let i = 0; i < 10; i++) {
    camera.position.set(camX + 0.5 + sx, 4.0 + sy + lift, back + camZ);
    camera.lookAt(camX + look, 1.55, 0.1 + camZ);
    camera.updateMatrixWorld();
    let need = 0;
    for (const p of players) {
      if (p.dead) continue; // K.O.: die Kamera folgt nur den Kämpfenden
      for (const h of [0.15, 1.9]) {
        camProbe.set(p.pos.x, p.y + h, p.pos.z).project(camera);
        need = Math.max(need, Math.abs(camProbe.x) / 0.82, Math.abs(camProbe.y) / 0.88);
      }
    }
    if (need <= 1 || back >= 72) break;
    back = Math.min(72, back + Math.max(0.8, (back - 5) * (need - 1) * 0.8));
  }
  return back;
}

function updateCamera(dt) {
  // Kamera folgt dem Mittelpunkt beider Spieler und zoomt heraus, wenn sie sich trennen.
  const alive = players.filter((p) => !p.dead);
  const xs = alive.length ? alive.map((p) => p.pos.x) : [P.pos.x];
  const mid = (Math.min(...xs) + Math.max(...xs)) / 2;
  const spread = Math.max(...xs) - Math.min(...xs);
  const targetX = clamp(mid, XMIN + 2, XMAX - 2);
  camX = lerp(camX, targetX, 1 - Math.exp(-4.5 * dt));
  // Kamera folgt auch in die Tiefe, damit man auf dem Bordstein nicht riesig wird.
  const zs = alive.length ? alive.map((p) => p.pos.z) : [0];
  const midZ = clamp((Math.min(...zs) + Math.max(...zs)) / 2, -WALK_LANE, WALK_LANE);
  camZ = lerp(camZ, midZ, 1 - Math.exp(-4.5 * dt));
  const sx = shakeT > 0 ? (Math.random() - 0.5) * shake : 0;
  const sy = shakeT > 0 ? (Math.random() - 0.5) * shake : 0;
  shakeT = Math.max(0, shakeT - dt);
  // kurzer Kamera-Stoß bei schweren Treffern (FOV zieht zusammen)
  fovPunch = Math.max(0, fovPunch - dt * 3.4);
  const targetFov = 38 - fovPunch * 7;
  if (Math.abs(camera.fov - targetFov) > 0.01) {
    camera.fov = targetFov;
    camera.updateProjectionMatrix();
  }

  // Auf schmalen/portrait Fenstern weiter zurück, sonst füllt eine Figur das Bild.
  const narrow = clamp(1.25 - camera.aspect, 0, 1) * 7.5;
  let back = 11.8 + clamp(spread - 2.5, 0, 7) * 0.55 + narrow;
  const lift = Math.max(0, ...players.map((p) => p.y)) * 0.18;
  // Im Koop entscheidet nicht die Entfernung, sondern der Bildrand.
  if (players.length > 1) back = fitCameraToPlayers(back, sx, sy, lift);
  camera.position.set(camX + 0.5 + sx, 4.0 + sy + lift, back + camZ);
  camera.lookAt(camX + coopLookAhead(), 1.55, 0.1 + camZ);

  sun.position.set(camX + 9, 18, 12);
  sun.target.position.set(camX, 0.5, 0);
  sun.target.updateMatrixWorld();
}

/* ============================== HUD ====================================== */
const hpFill = document.getElementById('hpFill');
const hp2Fill = document.getElementById('p2HpFill');
const p1LivesEl = document.getElementById('p1Lives');
const p2LivesEl = document.getElementById('p2Lives');
const p1ReviveEl = document.getElementById('p1Revive');
const p2ReviveEl = document.getElementById('p2Revive');
const meter2Fill = document.getElementById('p2MeterFill');
const meter2Wrap = document.getElementById('p2MeterWrap');
const special2Hint = document.getElementById('p2SpecialHint');
const scoreEl = document.getElementById('score');
const score2El = document.getElementById('score2');
const scoreBox2El = document.getElementById('scoreBox2');
const lifeNextLabelEl = document.getElementById('lifeNextLabel');
const lifeNextScoreEl = document.getElementById('lifeNextScore');
const lifeBarEl = document.getElementById('lifeBar');
const lifeFillEl = document.getElementById('lifeFill');
const lifeNextLabel2El = document.getElementById('lifeNextLabel2');
const lifeNextScore2El = document.getElementById('lifeNextScore2');
const lifeBar2El = document.getElementById('lifeBar2');
const lifeFill2El = document.getElementById('lifeFill2');
const enemyCount = document.getElementById('enemyCount');
const waveTag = document.getElementById('waveTag');
const bannerEl = document.getElementById('banner');
const comboEl = document.getElementById('combo');
const comboN = document.getElementById('comboN');
const msgEl = document.getElementById('msg');
const pauseEl = document.getElementById('pause');
const msgH = document.getElementById('msgH');
const msgS = document.getElementById('msgS');
const meterFill = document.getElementById('meterFill');
const meterWrap = document.getElementById('meterWrap');
const specialHint = document.getElementById('specialHint');
const flashEl = document.getElementById('flash');
const p2Panel = document.getElementById('p2Panel');
const p2Label = document.getElementById('p2Label');
const p1Label = document.getElementById('p1Label');
const p1Weapon = document.getElementById('p1Weapon');
const p2Weapon = document.getElementById('p2Weapon');
const districtTag = document.getElementById('districtTag');
const bossWrap = document.getElementById('bossWrap');
const bossName = document.getElementById('bossName');
const bossFill = document.getElementById('bossFill');
const pickupEl = document.getElementById('pickup');
const objectiveEl = document.getElementById('objective');
const grappleHintEl = document.getElementById('grappleHint');
const netStatus = document.getElementById('netStatus');
const menuEl = document.getElementById('menu');
const startBtn = document.getElementById('startBtn');
const startMsg = document.getElementById('startMsg');
const modeSeg = document.getElementById('modeSeg');
const diffSeg = document.getElementById('diffSeg');
const diffHint = document.getElementById('diffHint');
const diffTag = document.getElementById('diffTag');
const onlineBox = document.getElementById('onlineBox');
const roomCodeEl = document.getElementById('roomCode');
const netMsg = document.getElementById('netMsg');
const hostBtn = document.getElementById('hostBtn');
const joinBtn = document.getElementById('joinBtn');
const joinCodeEl = document.getElementById('joinCode');
const name1El = document.getElementById('name1');
const name2El = document.getElementById('name2');
const name2Field = document.getElementById('name2Field');

/* --------------------------- Tastenbelegung ------------------------------ */
const hintEl = document.getElementById('hint');
const controlsHelpEl = document.getElementById('controlsHelp');
const bindToggleEl = document.getElementById('bindToggle');
const bindMsgEl = document.getElementById('bindMsg');
const bindPanelEl = document.getElementById('bindPanel');
const bindResetEl = document.getElementById('bindReset');
const bindColEls = [document.getElementById('bindCol0'), document.getElementById('bindCol1')];
let bindPick = null;

const bindActionLabel = (a) => (BIND_ACTIONS.find(([k]) => k === a) || [, a])[1];
const bindPlayerLabel = (p) => (p === 0 ? 'P1' : 'P2');

function updateControlsHelp() {
  if (!controlsHelpEl) return;
  const row = (i, pairs) => pairs
    .map(([a, label]) => `<b>${keyLabel(CONTROLS[i][a])}</b> ${label}`).join(' · ');
  const block = (i) => `${row(i, [['left', 'links'], ['right', 'rechts'], ['up', 'hoch'], ['down', 'tief']])}<br>`
    + `${row(i, [['punch', 'Schlag/Item'], ['kick', 'Kick'], ['special', 'Schelle'], ['jump', 'Sprung']])}<br>`
    + `${row(i, [['sprint', 'Rennen'], ['grapple', 'Greifen'], ['mount', 'Esel']])}`;
  controlsHelpEl.innerHTML = `<b>P1</b> ${block(0)}<span class="sep"></span><b>P2</b> ${block(1)}`;
}

function updateHint() {
  if (!hintEl) return;
  const block = (i) => {
    const c = CONTROLS[i];
    return `<b>P${i + 1}</b> ${keyLabel(c.left)}/${keyLabel(c.right)} · ${keyLabel(c.up)}/${keyLabel(c.down)}`
      + ` · ${keyLabel(c.punch)}/${keyLabel(c.kick)} · ${keyLabel(c.special)} · ${keyLabel(c.jump)}`
      + ` · ${keyLabel(c.sprint)} · ${keyLabel(c.grapple)} · ${keyLabel(c.mount)}`;
  };
  hintEl.innerHTML = `${block(0)} &nbsp;|&nbsp; ${block(1)} &nbsp;|&nbsp; <b>M</b> Musik · <b>R</b> neu · <b>ESC/P</b> Pause`;
}

function updateGrappleHintText() {
  if (grappleHintEl) grappleHintEl.textContent = `${keyLabel(CONTROLS[0].grapple)} — GRIFF BEREIT`;
}

// Das Schild über dem Ziel wird erst beim ersten Greifen gebaut; hier nur
// aktualisieren, falls es schon existiert.
function refreshGrabLabel(p) {
  if (!p || !p.grabMark) return;
  p.grabMark.material.map = pickupLabelTexture(`${keyLabel(CONTROLS[p.id].grapple)} · GRIFF`, '#6be0ff');
  p.grabMark.material.needsUpdate = true;
}

function refreshBindingUI() {
  for (const btn of document.querySelectorAll('#bindPanel button[data-a]')) {
    const pp = +btn.dataset.p, aa = btn.dataset.a;
    const listening = !!bindPick && bindPick.p === pp && bindPick.action === aa;
    btn.textContent = listening ? 'TASTE …' : keyLabel(CONTROLS[pp][aa]);
    btn.classList.toggle('listening', listening);
  }
  updateControlsHelp();
  updateHint();
  updateGrappleHintText();
  for (const p of [P, P2]) {
    refreshGrabLabel(p);
    updateMeter(p);
  }
}

function buildBindingUI() {
  bindColEls.forEach((col, i) => {
    if (!col) return;
    col.innerHTML = `<div class="bindhead">SPIELER ${i + 1}</div>`
      + BIND_ACTIONS.map(([a, label]) =>
        `<div class="bindrow"><span>${label}</span><button type="button" data-p="${i}" data-a="${a}"></button></div>`).join('');
  });
}

function applyControls(sets) {
  if (!Array.isArray(sets)) return;
  for (let i = 0; i < 2; i++) {
    const set = sets[i];
    if (!set || typeof set !== 'object') continue;
    for (const [a] of BIND_ACTIONS) {
      if (typeof set[a] === 'string' && set[a] && !isReservedBind(set[a])) CONTROLS[i][a] = set[a];
    }
  }
}

function saveBindings() {
  try { localStorage.setItem(BIND_STORAGE_KEY, JSON.stringify(CONTROLS)); } catch (e) { /* Privatmodus */ }
  // Im Online-Lobby muss der Host die Tasten des Gasts kennen.
  if (net.role === 'guest' && net.peer) net.send({ t: 'ctrl', c: CONTROLS[1] });
}

function cancelBind(msg) {
  bindPick = null;
  refreshBindingUI();
  if (msg && bindMsgEl) bindMsgEl.textContent = msg;
}

function startBind(p, action) {
  bindPick = { p, action };
  if (bindMsgEl) bindMsgEl.textContent = `${bindPlayerLabel(p)} · ${bindActionLabel(action)} — Taste drücken (ESC bricht ab)`;
  refreshBindingUI();
}

function assignBinding(code) {
  const pick = bindPick;
  if (!pick) return;
  const old = CONTROLS[pick.p][pick.action];
  if (old === code) { cancelBind('Taste unverändert.'); return; }
  let swapped = null;
  for (let i = 0; i < 2; i++) {
    for (const [a] of BIND_ACTIONS) {
      if (i === pick.p && a === pick.action) continue;
      if (CONTROLS[i][a] !== code) continue;
      CONTROLS[i][a] = old;
      swapped = { i, a };
    }
  }
  CONTROLS[pick.p][pick.action] = code;
  bindPick = null;
  saveBindings();
  refreshBindingUI();
  if (bindMsgEl) {
    bindMsgEl.textContent = `${bindPlayerLabel(pick.p)} · ${bindActionLabel(pick.action)} = ${keyLabel(code)}`
      + (swapped ? ` (getauscht mit ${bindPlayerLabel(swapped.i)} ${bindActionLabel(swapped.a)})` : '');
  }
}

addEventListener('keydown', (ev) => {
  if (!bindPick) return;
  // Vor dem Spiel-Handler abfangen: die nächste Taste belegt, statt zu kämpfen.
  ev.preventDefault();
  ev.stopImmediatePropagation();
  if (ev.repeat) return;
  if (ev.code === 'Escape') { cancelBind('Belegen abgebrochen.'); return; }
  if (isReservedBind(ev.code)) {
    if (bindMsgEl) bindMsgEl.textContent = `${keyLabel(ev.code)} ist für Pause, Musik oder Neustart reserviert.`;
    return;
  }
  assignBinding(ev.code);
}, true);

if (bindPanelEl) {
  bindPanelEl.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button[data-a]');
    if (!btn) return;
    startBind(+btn.dataset.p, btn.dataset.a);
  });
}
if (bindToggleEl) {
  bindToggleEl.addEventListener('click', () => {
    const open = bindPanelEl.classList.toggle('on');
    bindToggleEl.textContent = open ? 'Belegen schließen' : 'Tasten belegen';
    if (open && bindMsgEl) bindMsgEl.textContent = 'Klick auf eine Taste, dann die neue drücken.';
    else if (!open) cancelBind('');
  });
}
if (bindResetEl) {
  bindResetEl.addEventListener('click', () => {
    for (let i = 0; i < 2; i++) Object.assign(CONTROLS[i], DEFAULT_CONTROLS[i]);
    bindPick = null;
    saveBindings();
    refreshBindingUI();
    if (bindMsgEl) bindMsgEl.textContent = 'Standardbelegung wiederhergestellt.';
  });
}
buildBindingUI();
refreshBindingUI();

let bossRef = null;
function showBossBar(b) {
  bossRef = b;
  bossName.textContent = b.name || 'BOSS';
  bossFill.style.width = '100%';
  bossWrap.classList.add('on');
}
function updateBossBar(b) {
  if (!b || b.dead) return;
  bossFill.style.width = `${clamp(b.hp / b.maxhp, 0, 1) * 100}%`;
}
function hideBossBar() {
  bossRef = null;
  bossWrap.classList.remove('on');
}

function showObjective(text) {
  if (!objectiveEl) return;
  objectiveEl.textContent = text || '';
  objectiveEl.classList.toggle('on', !!text);
}

let toastT = 0;
function toast(text) {
  pickupEl.textContent = text;
  pickupEl.classList.remove('on');
  void pickupEl.offsetWidth;
  pickupEl.classList.add('on');
  toastT = 1.4;
}

function setHP(p) {
  const v = clamp(typeof p === 'number' ? p : p.hp, 0, 100);
  const id = typeof p === 'number' ? 0 : p.id;
  (id === 0 ? hpFill : hp2Fill).style.width = v + '%';
}
function updateLives(p) {
  const el = p.id === 0 ? p1LivesEl : p2LivesEl;
  if (!el) return;
  updateLifeProgress(p);
  const bar = p.id === 0 ? p1ReviveEl : p2ReviveEl;
  el.classList.toggle('out', !!p.out && !p.down);
  el.classList.toggle('down', !!p.down && !p.out);
  if (p.out && !p.down) {
    el.textContent = 'AUS';
  } else if (p.down) {
    // Am Boden: der Balken zeigt den Rettungsfortschritt, der Text die Zeit.
    el.textContent = p.reviveP > 0.02
      ? `♥ ${p.lives} · RETTEN ${Math.round(p.reviveP * 100)}%`
      : p.remote ? `♥ ${p.lives} · AM BODEN` : `♥ ${p.lives} · HILFE ${Math.max(0, Math.ceil(p.downT))}s`;
  } else {
    el.textContent = `♥ ${p.lives}`;
  }
  if (bar) {
    bar.classList.toggle('on', !!p.down && !p.out);
    const fill = bar.firstElementChild;
    if (fill) fill.style.width = `${Math.round((p.down && !p.out ? p.reviveP : 0) * 100)}%`;
  }
}
function updateMeter(p) {
  const fill = p.id === 0 ? meterFill : meter2Fill;
  const wrap = p.id === 0 ? meterWrap : meter2Wrap;
  const hint = p.id === 0 ? specialHint : special2Hint;
  fill.style.width = p.meter + '%';
  const ready = p.meter >= 100;
  wrap.classList.toggle('ready', ready);
  hint.textContent = p.mount
    ? `${keyLabel(CONTROLS[p.id].special)} — SUPERKICK BEREIT`
    : `${keyLabel(CONTROLS[p.id].special)} — SCHELLE BEREIT`;
  hint.classList.toggle('on', ready);
}
// Jeder Spieler hat seinen eigenen Punktestand. Solo zeigt das HUD eine Zeile,
// im Koop stehen P1 und P2 untereinander mit eigenem Extraleben-Fortschritt.
function updateScores() {
  scoreEl.textContent = String(Math.max(0, Math.floor(P.score))).padStart(4, '0');
  if (score2El) score2El.textContent = String(Math.max(0, Math.floor(P2.score))).padStart(4, '0');
  const duo = players.length > 1;
  if (scoreBox2El) scoreBox2El.classList.toggle('off', !duo);
  updateLifeProgress(P);
  if (duo) updateLifeProgress(P2);
}

/* ------------------------------- Leben ----------------------------------- */
// Jeder Spieler startet mit 3 Leben. Alle 2000 eigenen Punkte gibt es ein
// Extraleben für genau diesen Spieler – wer ausgeschieden ist, kommt nicht zurück.
const LIFE_SCORE_STEP = 2000;
const LIFE_MAX = 9;

function addScore(n, p = P) {
  if (!n || !p) return;
  const before = Math.floor(p.score / LIFE_SCORE_STEP);
  p.score += n;
  updateScores();
  const after = Math.floor(p.score / LIFE_SCORE_STEP);
  for (let i = before; i < after; i++) grantExtraLife(p);
}

// Fortschritt bis zum nächsten Extraleben: angezeigt wird der Rest der
// 2000er-Stufe, z. B. 1.450 / 2.000. Wer am Deckel ist, sieht MAX.
let lifeProgressKey = ['', ''];

function nextLifeProgress(p) {
  if (!p || p.out) return { mode: 'none', have: 0, need: LIFE_SCORE_STEP };
  if (p.lives >= LIFE_MAX) return { mode: 'max', have: 0, need: LIFE_SCORE_STEP };
  return { mode: 'next', have: p.score % LIFE_SCORE_STEP, need: LIFE_SCORE_STEP };
}

function updateLifeProgress(p) {
  if (!p) return;
  const refs = p.id === 0
    ? [lifeNextLabelEl, lifeNextScoreEl, lifeBarEl, lifeFillEl]
    : [lifeNextLabel2El, lifeNextScore2El, lifeBar2El, lifeFill2El];
  const [labelEl, nextEl, barEl, fillEl] = refs;
  if (!labelEl || !nextEl || !barEl || !fillEl) return;
  const info = nextLifeProgress(p);
  const key = `${info.mode}|${info.have}|${info.need}`;
  if (key === lifeProgressKey[p.id]) return;
  lifeProgressKey[p.id] = key;
  const fmt = (n) => n.toLocaleString('de-DE');
  labelEl.textContent = info.mode === 'next' ? 'NÄCHSTES LEBEN' : 'LEBEN';
  nextEl.textContent = info.mode === 'max' ? 'MAX'
    : info.mode === 'none' ? '—'
    : `${fmt(info.have)} / ${fmt(info.need)}`;
  barEl.classList.toggle('full', info.mode === 'max');
  fillEl.style.width = info.mode === 'max' ? '100%'
    : info.mode === 'none' ? '0%'
    : `${clamp((info.have / info.need) * 100, 0, 100)}%`;
}

function grantExtraLife(p) {
  if (!p || p.out || p.lives >= LIFE_MAX) return;
  p.lives += 1;
  updateLives(p);
  toast(players.length > 1 ? `${p.name} · EXTRA LEBEN` : 'EXTRA LEBEN');
  screenFlash('#ffd76e', 0.16, 0.24);
  sfx.pickup();
  burst(p.pos.x, 1.2, p.pos.z, [0xffd76e, 0xfff1b8, 0xffffff], 16, 3.4, 0.09);
}
function setEnemyCount(n) { enemyCount.textContent = `GEGNER ${String(n).padStart(2, '0')}`; }
function banner(text) {
  bannerEl.textContent = text;
  bannerEl.classList.remove('show');
  void bannerEl.offsetWidth;
  bannerEl.classList.add('show');
}
function showCombo() {
  const best = Math.max(...players.map((p) => p.combo));
  comboN.textContent = best;
  comboEl.classList.toggle('on', best >= 2);
}
function showMsg(h, s) {
  msgH.textContent = h;
  msgS.textContent = s;
  msgEl.classList.add('on');
}
function hideMsg() { msgEl.classList.remove('on'); }

/* ============================== PAUSE ==================================== */
// ESC oder P halten die Simulation an; im Online-Koop pausiert der Host die
// Runde für beide, ein Pausieren des Gasts wird an den Host weitergereicht.
function canPause() {
  return started && menuEl.classList.contains('hide') && !msgEl.classList.contains('on') && !victory;
}

function setPaused(on, relay = true) {
  if (paused === on) return;
  paused = on;
  pauseEl.classList.toggle('on', on);
  // Losgelassene Tasten lösen, sonst läuft man nach dem Weiterlaufen weiter.
  for (const k in keys) keys[k] = false;
  if (paused) music.pause();
  else {
    music.resume();
    // Wurde in der Pause stummgeschaltet, startet der Track erst jetzt wieder.
    if (!muted && !music.playing) { currentTrackKey = null; playTrackForWave(); }
  }
  if (relay && net.role) net.send({ t: 'pause', on: paused });
}

function togglePause() {
  if (!paused && !canPause()) return;
  setPaused(!paused);
}

pauseEl.addEventListener('click', () => setPaused(false));

/* ============================== RESET ==================================== */
function resetGame() {
  clearDonkeys();
  for (const e of enemies) { if (e.fig) scene.remove(e.fig.root); removeEnemyHpBar(e); }
  enemies.length = 0;
  for (const p of particles) scene.remove(p.m);
  particles.length = 0;
  clearSmokePuffs();
  for (const s of shots) scene.remove(s.m);
  shots.length = 0;
  for (const it of pickups) {
    scene.remove(it.mesh);
    for (const ex of it.extra || []) {
      scene.remove(ex);
      if (ex.material) ex.material.dispose();
    }
  }
  pickups.length = 0;

  players.forEach((p, i) => {
    p.pos.set(i === 0 ? -0.7 : 1.0, 0, i === 0 ? 0.35 : -0.55);
    p.tetherX = p.pos.x;
    p.y = 0; p.vy = 0; p.facing = 1; p.hp = 100;
    p.weapon = null; p.swingT = 0; p.grab = null; p.grabT = 0; p.runT = 0;
    p.sprint = false; p.stun = 0; p.netTarget = null;
    removeHeldWeapon(p);
    showWeapon(p);
    p.state = 'idle'; p.t = 0; p.move = 'punch'; p.atkIdx = 0; p.combo = 0; p.comboT = 0;
    p.chainKind = null; p.chainN = 0; p.chainT = 0;
    p.inv = 0; p.dead = false; p.knock = 0; p.meter = 0; p.spin = 0; p.buffer = null;
    p.mount = null; p.riding = false;
    p.respawnT = 0; p.moving = false;
    p.down = false; p.downT = 0; p.reviveP = 0; p.downFx = 0;
    p.lives = 3; p.out = false; p.deadT = 0; p.fig.root.visible = true;
    p.score = 0;
    setHP(p); updateMeter(p); updateLives(p);
  });
  camX = 0;
  camZ = 0;

  for (const r of rings) { scene.remove(r.m); r.m.material.dispose(); }
  rings.length = 0;
  clearSlapFx();
  clearDamageNumbers();
  clearCarAlarms();
  timeScale = 1; fovPunch = 0;
  camera.fov = 38;
  camera.updateProjectionMatrix();
  flashT = 0;
  flashEl.style.opacity = '0';

  P2.score = 0;
  wave = 0; waveActive = false; waveDelay = 1.2;
  alarmSquadCd = 0; alarmSquadsLeft = ALARM_SQUADS_PER_SECTION;
  hitstop = 0; shake = 0; shakeT = 0;
  currentTrackKey = null;
  wavePending = false;
  districtCleared = false;
  victory = false;
  builtDistrict = -1;
  sectionQueue = [];
  lastEnemyShown = -1;
  gates.length = 0;
  hideBossBar();
  showObjective('');
  if (grappleHintEl) grappleHintEl.classList.remove('on');
  lifeProgressKey = ['', ''];
  if (paused) setPaused(false);
  updateScores(); setEnemyCount(0); hideMsg(); showCombo();
  waveTag.textContent = 'RUNDE 1/10 · ABSCHNITT 1/3 · WELLE 1/30';
}

// Koop-Leine: Keiner darf so weit vorauslaufen, dass der andere aus dem Bild
// fällt. Gebremst wird der Spieler, der sich in diesem Frame weiter bewegt hat
// (Rennen, Sprung, Rückstoß) – der andere bleibt unangetastet.
const COOP_MAX_SPREAD = 16;
let tetherWarnT = 0;
function keepPlayersTogether(dt) {
  tetherWarnT = Math.max(0, tetherWarnT - dt);
  if (players.length < 2) return;
  // Online ohne Gegenüber (Disconnect) nicht fesseln – sonst hängt einer am
  // eingefrorenen Avatar des anderen fest.
  if (net.role && !net.peer) return;
  const a = players[0], b = players[1];
  if ((a.dead && a.out) || (b.dead && b.out)) return;
  const moveA = Math.abs(a.pos.x - (a.tetherX ?? a.pos.x));
  const moveB = Math.abs(b.pos.x - (b.tetherX ?? b.pos.x));
  const dx = b.pos.x - a.pos.x;
  if (Math.abs(dx) > COOP_MAX_SPREAD) {
    const offender = moveB > moveA + 0.002 ? b : a;
    const other = offender === a ? b : a;
    const dir = Math.sign(offender.pos.x - other.pos.x) || 1;
    offender.pos.x = clamp(other.pos.x + dir * COOP_MAX_SPREAD, XMIN, maxWalkX());
    // Wer reitet, zieht seinen Esel mit – sonst reißt die Leine Reiter und
    // Reittier jeden Frame auseinander.
    if (offender.mount) offender.mount.pos.x = offender.pos.x;
    if (tetherWarnT <= 0) {
      toast('ZU WEIT WEG · BLEIB BEIM PARTNER');
      tetherWarnT = 3.5;
    }
  }
  a.tetherX = a.pos.x;
  b.tetherX = b.pos.x;
}

function separatePlayers() {
  if (P.dead || P2.dead) return;
  const dx = P2.pos.x - P.pos.x, dz = P2.pos.z - P.pos.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.9 && d > 0.001) {
    const push = (0.9 - d) * 0.5;
    P.pos.x = clamp(P.pos.x - (dx / d) * push, XMIN, XMAX);
    P.pos.z = clamp(P.pos.z - (dz / d) * push, -WALK_LANE, WALK_LANE);
    P2.pos.x = clamp(P2.pos.x + (dx / d) * push, XMIN, XMAX);
    P2.pos.z = clamp(P2.pos.z + (dz / d) * push, -WALK_LANE, WALK_LANE);
  }
}

/* ============================== MENÜ / START ============================= */
// Schwierigkeit wirkt auf Gegnerzahl, Beute, HP, Schaden und Nachschub.
const DIFFICULTIES = {
  leicht: {
    label: 'LEICHT', enemies: 0.75, loot: 7, hp: 0.85, dmg: 0.75, heal: 1.5,
    reinforceAt: 4, batch: 3, drop: 0.22, weaponDrop: 0.06, propDrop: 0.35, propWeapon: 0.12,
    hint: 'Leicht: 14–18 Gegner pro Abschnitt, mehr Beute, sanfter Schaden.',
  },
  normal: {
    label: 'NORMAL', enemies: 1, loot: 5, hp: 1, dmg: 1, heal: 1,
    reinforceAt: 5, batch: 4, drop: 0.14, weaponDrop: 0.03, propDrop: 0.22, propWeapon: 0.06,
    hint: 'Normal: 18–24 Gegner pro Abschnitt, knappe Beute.',
  },
  hart: {
    label: 'HART', enemies: 1.35, loot: 4, hp: 1.2, dmg: 1.25, heal: 0.6,
    reinforceAt: 6, batch: 5, drop: 0.09, weaponDrop: 0.02, propDrop: 0.12, propWeapon: 0.03,
    hint: 'Hart: 24–32 Gegner pro Abschnitt, wenig Beute, härtere Treffer.',
  },
  albtraum: {
    label: 'ALBTRAUM', enemies: 1.55, loot: 3, hp: 1.35, dmg: 1.45, heal: 0.4,
    reinforceAt: 8, batch: 6, drop: 0.06, weaponDrop: 0.01, propDrop: 0.07, propWeapon: 0.02,
    eliteEvery: 3, guards: 3,
    hint: 'Albtraum: 28–32 Gegner, Elite-Gegner, 3 Boss-Wachen, minimale Beute.',
  },
};
let difficulty = 'normal';
function diffCfg() { return DIFFICULTIES[difficulty] || DIFFICULTIES.normal; }

let mode = 'solo';
let started = false;
let guestDistrict = -1;
const names = ['JANITSCHAR', 'MURAD'];

function startGame() {
  names[0] = (name1El.value || 'JANITSCHAR').trim().toUpperCase().slice(0, 14) || 'JANITSCHAR';
  names[1] = (name2El.value || 'MURAD').trim().toUpperCase().slice(0, 14) || 'MURAD';
  P.name = names[0];
  P2.name = names[1];
  pName.textContent = names[0];
  p2Name.textContent = names[1];
  setDifficulty(difficulty);
  P.remote = net.role === 'guest';
  P2.remote = net.role === 'host';
  setRoster(mode === 'solo' ? 1 : 2);
  p1Label.textContent = net.role === 'host' ? 'Spieler 1 · Host' : 'Spieler 1';
  p2Label.textContent = net.role === 'host' ? 'Spieler 2 · Gast' : 'Spieler 2';
  started = true;
  startedAt = performance.now();
  resetGame();
  buildDistrict(0, 0);
  placePlayersAtStart();
  music.setMuted(muted);
  currentTrackKey = null;
  playTrackForWave();
  menuEl.classList.add('hide');
  waveDelay = 1.2;
}
let startedAt = 0;

function setDifficulty(key) {
  difficulty = DIFFICULTIES[key] ? key : 'normal';
  const cfg = diffCfg();
  [...diffSeg.children].forEach((b) => b.classList.toggle('on', b.dataset.diff === difficulty));
  diffHint.textContent = cfg.hint;
  diffTag.textContent = `SCHWIERIGKEIT · ${cfg.label}`;
}

diffSeg.addEventListener('click', (ev) => {
  const btn = ev.target.closest('button');
  if (!btn || !btn.dataset.diff) return;
  setDifficulty(btn.dataset.diff);
});

modeSeg.addEventListener('click', (ev) => {
  const btn = ev.target.closest('button');
  if (!btn) return;
  mode = btn.dataset.mode;
  [...modeSeg.children].forEach((b) => b.classList.toggle('on', b === btn));
  onlineBox.classList.toggle('on', mode === 'online');
  name2Field.style.opacity = mode === 'solo' ? '.4' : '1';
  netMsg.textContent = mode === 'online'
    ? 'Host erstellt einen Raum, Gast tritt mit dem 4-stelligen Code bei.'
    : 'Host startet das Spiel, der Gast kommt in denselben Run.';
});

startBtn.addEventListener('click', () => {
  if (mode === 'online') {
    if (net.role === 'host' && net.peer) {
      net.send({
        t: 'start', names: [name1El.value || 'JANITSCHAR', name2El.value || 'MURAD'],
        diff: difficulty, ctrl: CONTROLS,
      });
      startGame();
    } else if (net.role === 'guest') {
      startMsg.textContent = 'Warte auf den Host …';
    } else {
      startMsg.textContent = 'Erst Raum erstellen oder beitreten.';
    }
    return;
  }
  startMsg.textContent = '';
  startGame();
});

/* ============================== ONLINE =================================== */
const ghostEnemies = new Map();
const net = {
  ws: null, role: null, room: null, peer: false, lastSend: 0,
  connect(role, room) {
    this.close();
    this.role = role;
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${proto}://${location.host}/ws?role=${role}` + (room ? `&room=${room}` : '');
    let ws;
    try { ws = new WebSocket(url); } catch (e) { netMsg.textContent = 'Server nicht erreichbar.'; return; }
    this.ws = ws;
    netMsg.textContent = 'Verbinde …';
    ws.onopen = () => { netMsg.textContent = 'Verbunden. Warte auf Gegenüber …'; };
    ws.onmessage = (ev) => {
      let m;
      try { m = JSON.parse(ev.data); } catch (e) { return; }
      handleNet(m);
    };
    ws.onclose = () => {
      net.peer = false;
      netStatus.textContent = '';
      if (netMsg) netMsg.textContent = 'Verbindung getrennt.';
    };
    ws.onerror = () => { netMsg.textContent = 'WebSocket-Fehler — läuft server.js?'; };
  },
  send(obj) {
    if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(obj));
  },
  close() {
    if (this.ws) { try { this.ws.close(); } catch (e) {} }
    this.ws = null; this.role = null; this.room = null; this.peer = false;
  },
};

hostBtn.addEventListener('click', () => {
  mode = 'online';
  net.connect('host');
});
joinBtn.addEventListener('click', () => {
  mode = 'online';
  const code = (joinCodeEl.value || '').trim().toUpperCase();
  if (code.length !== 4) { netMsg.textContent = 'Bitte 4-stelligen Code eingeben.'; return; }
  net.connect('guest', code);
});

function handleNet(m) {
  if (m.t === 'welcome') {
    net.room = m.room;
    roomCodeEl.textContent = m.role === 'host' ? m.room : '';
    netStatus.textContent = m.role === 'host' ? `HOST ${m.room}` : 'GAST';
  } else if (m.t === 'peer') {
    net.peer = true;
    netMsg.textContent = m.role === 'host' ? 'Gast verbunden — Start drücken.' : 'Host verbunden — warte auf Start …';
    if (m.role === 'guest') {
      startMsg.textContent = 'Warte auf den Host …';
      // Eigene Belegung an den Host schicken, damit er die Gast-Tasten kennt.
      if (net.role === 'guest') net.send({ t: 'ctrl', c: CONTROLS[1] });
    }
  } else if (m.t === 'left') {
    net.peer = false;
    netMsg.textContent = 'Gegenüber hat den Raum verlassen.';
  } else if (m.t === 'start') {
    if (m.names) {
      name1El.value = m.names[0];
      name2El.value = m.names[1];
    }
    if (m.diff) setDifficulty(m.diff);
    if (m.ctrl) { applyControls(m.ctrl); refreshBindingUI(); }
    mode = 'online';
    startGame();
  } else if (m.t === 'ctrl') {
    // Der Gast teilt seine Belegung mit; der Host tippt sie für P2.
    if (net.role === 'host') { applyControls([CONTROLS[0], m.c]); refreshBindingUI(); }
  } else if (m.t === 'pause') {
    if (started) setPaused(!!m.on, false);
  } else if (m.t === 's' && net.role === 'guest') {
    applySnapshot(m);
  } else if (m.t === 'k' && net.role === 'host') {
    if (!P2.netKeys) P2.netKeys = Object.create(null);
    P2.netKeys[m.code] = m.down;
  } else if (m.t === 'act' && net.role === 'host') {
    doAction(P2, m.a);
  }
}

function sendSnapshot() {
  if (net.role !== 'host' || !net.peer) return;
  net.send({
    t: 's',
    w: wave,
    d: WAVE_DEFS[wave] ? WAVE_DEFS[wave].district : 0,
    g: gates.map((g) => (g.open ? 1 : 0)),
    b: bossRef ? [bossRef.name, clamp(bossRef.hp / bossRef.maxhp, 0, 1)] : null,
    p: players.map((p) => [
      +p.pos.x.toFixed(2), +p.pos.z.toFixed(2), p.facing, Math.round(p.hp),
      p.state, +p.t.toFixed(2), Math.round(p.meter), p.dead ? 1 : 0,
      p.weapon ? `${p.weapon.id}:${p.weapon.left}` : '', p.name, p.riding ? 1 : 0,
      p.move, p.atkIdx, p.lives, p.out ? 1 : 0,
      p.down ? 1 : 0, Math.round(p.reviveP * 100), Math.ceil(p.downT),
      // Hält gerade einen Gegner: der Gast zeigt dieselbe Griffpose.
      p.grab ? 1 : 0,
      // Eigener Punktestand pro Spieler – der Gast zeigt beide Zeilen.
      Math.round(p.score),
    ]),
    k: mapDonkey ? [
      +mapDonkey.pos.x.toFixed(2), +mapDonkey.pos.z.toFixed(2), mapDonkey.facing,
      mapDonkey.state === 'flee' ? 2 : mapDonkey.state === 'ridden' ? 1 : 0,
      Math.round(mapDonkey.kickT * 100), Math.round((mapDonkey.hopH || 0) * 100),
      Math.round((mapDonkey.frontT || 0) * 100), Math.round((mapDonkey.spinT || 0) * 100),
    ] : null,
    e: enemies.filter((e) => !e.dead).map((e) => [
      e.id, e.type, +e.pos.x.toFixed(2), +e.pos.z.toFixed(2), e.facing,
      clamp(e.hp / e.maxhp, 0, 1), e.state, +e.t.toFixed(2), e.isBoss ? 1 : 0, e.elite ? 1 : 0,
      // Flughöhe für den Wurfbogen (sonst rutscht der Gast am Boden).
      +Math.max(0, e.y || 0).toFixed(2),
    ]),
    i: pickups.map((it) => [it.kind, +it.x.toFixed(2), +it.z.toFixed(2), it.weaponKind || '']),
    // Seit dem letzten Snapshot passierte Trefferzahlen für den Gast.
    h: dmgNetQueue.splice(0, dmgNetQueue.length),
  });
}

function applySnapshot(s) {
  if (s.d !== guestDistrict) {
    guestDistrict = s.d;
    wave = s.w;
    buildDistrict(s.d, s.w);
    districtTag.textContent = `${String(s.d + 1).padStart(2, '0')} · ${THEME.name} — ${THEME.sub}`;
    currentTrackKey = null;
    playTrackForWave();
  }
  wave = s.w;
  waveTag.textContent = `RUNDE ${WAVE_DEFS[s.w].district + 1}/10 · ABSCHNITT ${(s.w % 3) + 1}/3 · WELLE ${s.w + 1}/30`;
  (s.g || []).forEach((open, i) => {
    const g = gates[i];
    if (!g) return;
    g.open = !!open;
    for (const b of g.bars) b.visible = !open;
  });
  if (s.b) {
    bossName.textContent = s.b[0];
    bossFill.style.width = `${s.b[1] * 100}%`;
    bossWrap.classList.add('on');
  } else hideBossBar();

  (s.p || []).forEach((a, i) => {
    const p = players[i];
    if (!p) return;
    p.netTarget = { x: a[0], z: a[1] };
    p.facing = a[2];
    const hpBefore = p.hp;
    p.hp = a[3];
    p.state = a[4];
    p.t = a[5];
    p.meter = a[6];
    // Treffer des Hosts auch beim Gast sichtbar machen: HP-Verlust blitzt und ringt.
    if (a[3] < hpBefore - 1) {
      burst(p.pos.x, 1.15, p.pos.z, [0xff2f6d, 0xffffff], 10, 3.4, 0.08);
      ring(p.pos.x, 1.0, p.pos.z, 0xffb347, 1.4, 0.22);
      shake = Math.max(shake, 0.06);
      shakeT = Math.max(shakeT, 0.2);
    }
    p.dead = !!a[7];
    p.name = a[9] || p.name;
    p.riding = !!a[10];
    // Angriffsart und Kettenstufe mit übertragen, damit der Gast dieselbe
    // Kombostufe sieht (sonst zeigt er jeden Schlag als ersten Punch).
    p.move = a[11] || 'punch';
    p.atkIdx = Math.max(0, a[12] | 0);
    p.lives = typeof a[13] === 'number' ? a[13] : p.lives;
    p.out = !!a[14];
    // Bodenzustand inkl. Rettungsfortschritt: der Gast zeigt dieselbe Anzeige,
    // lässt die Uhr aber nicht selbst laufen (der Host entscheidet).
    p.down = !!a[15];
    p.reviveP = p.down && typeof a[16] === 'number' ? clamp(a[16] / 100, 0, 1) : 0;
    p.downT = p.down && typeof a[17] === 'number' ? a[17] : 0;
    p.grabSync = !!a[18];
    // Eigener Punktestand kommt vom Host; der Gast rechnet nichts selbst.
    p.score = typeof a[19] === 'number' ? a[19] : p.score;
    if (p.down) p.dead = false;
    p.fig.root.visible = !p.out;
    updateLives(p);
    setHP(p);
    updateMeter(p);
    if (i === 0) pName.textContent = p.name;
    if (i === 1) p2Name.textContent = p.name;
    const wid = a[8] ? a[8].split(':') : null;
    if (wid && WEAPONS[wid[0]]) {
      const def = WEAPONS[wid[0]];
      p.weapon = { id: wid[0], name: def.name, kind: def.kind, left: Number(wid[1]) };
      if (p.fig.heldKind !== wid[0]) setHeldWeapon(p, wid[0]);
    } else {
      p.weapon = null;
      if (p.fig.heldWeapons) removeHeldWeapon(p);
    }
    showWeapon(p);
    // Auch der Gast sieht die Osmanische Schelle des anderen Spielers.
    if (p.state === 'special' && !p.dead) {
      showSlapHand(p);
      updateSlapHand(p);
    } else if (p.slapHand && p.slapHand.visible) hideSlapHand(p);
  });
  // Beide Punktestände aus dem Snapshot in die HUD-Zeilen schreiben.
  updateScores();

  // Der Host schickt genau einen Esel pro Map mit Position, Blickrichtung,
  // Zustand und restlicher Trittzeit.
  for (const d of donkeys) {
    if (!s.k) {
      d.gone = true;
      d.root.visible = false;
      d.label.visible = false;
      d.hopH = 0;
      continue;
    }
    d.gone = false;
    d.root.visible = true;
    d.netTarget = { x: s.k[0], z: s.k[1] };
    d.facing = s.k[2];
    d.state = s.k[3] === 2 ? 'flee' : s.k[3] === 1 ? 'ridden' : 'idle';
    d.kickT = (s.k[4] || 0) / 100;
    d.hopH = (s.k[5] || 0) / 100;
    d.frontT = (s.k[6] || 0) / 100;
    d.spinT = (s.k[7] || 0) / 100;
  }

  const live = new Set();
  (s.e || []).forEach((a) => {
    const [id, type, x, z, facing, hpR, state, t, isBoss, elite, ey] = a;
    live.add(id);
    let e = ghostEnemies.get(id);
    if (!e) {
      e = spawnEnemy(type, x, z, !!isBoss, !!elite);
      if (!e) return;
      e.id = id;
      e.remoteGhost = true;
      ghostEnemies.set(id, e);
    }
    e.netTarget = { x, z };
    e.facing = facing;
    // Wurfhöhe mitglätten, damit der Bogen auch beim Gast sichtbar ist.
    if (typeof ey === 'number') e.y = lerp(e.y || 0, ey, 0.55);
    // Beim ersten Snapshot ist maxhp noch der echte Typwert – danach nur 1.
    if (e.maxhp === 1 && hpR < e.hp - 0.001) e.hpFlash = 0.14;
    e.hp = hpR; e.maxhp = 1;
    if (e.state !== state) { e.state = state; e.t = t; }
  });
  for (const [id, e] of ghostEnemies) {
    if (!live.has(id)) {
      scene.remove(e.fig.root);
      removeEnemyHpBar(e);
      e.dead = true;
      ghostEnemies.delete(id);
      const idx = enemies.indexOf(e);
      if (idx >= 0) enemies.splice(idx, 1);
    }
  }
  setEnemyCount(ghostEnemies.size);

  // Trefferzahlen, die der Host seit dem letzten Snapshot gemeldet hat.
  for (const [id, dmg] of s.h || []) {
    const e = ghostEnemies.get(id) || enemies.find((x) => x.id === id);
    if (e) showDamageNumber(e.pos.x, e.pos.z, dmg, damageNumberHeight(e));
  }

  // Beute beim Gast abgleichen: Beim Aufnehmen verschiebt der Host die Liste,
  // deshalb dürfen Items nicht einfach über den Array-Index zugeordnet werden.
  const items = s.i || [];
  const syncKey = (a) => `${a[0]}|${a[3] || ''}|${(+a[1]).toFixed(2)}|${(+a[2]).toFixed(2)}`;
  const used = new Set();
  for (const a of items) {
    const key = syncKey(a);
    let idx = -1;
    for (let i = 0; i < pickups.length; i++) {
      if (!used.has(i) && pickups[i].syncKey === key) { idx = i; break; }
    }
    if (idx < 0) {
      spawnPickup(a[0], a[1], a[2], a[3]);
      idx = pickups.length - 1;
    }
    used.add(idx);
    const it = pickups[idx];
    it.syncKey = key;
    it.x = a[1];
    it.z = a[2];
    it.mesh.position.x = a[1];
    it.mesh.position.z = a[2];
    for (const obj of [it.halo, it.beam, it.label, it.prompt]) {
      if (!obj) continue;
      obj.position.x = a[1];
      obj.position.z = a[2];
    }
  }
  for (let i = pickups.length - 1; i >= 0; i--) {
    if (!used.has(i)) removePickup(pickups[i]);
  }
}

// Gast interpoliert die Host-Positionen und rendert nur.
function guestFrame(raw) {
  const k = 1 - Math.exp(-16 * raw);
  for (const p of players) {
    if (p.netTarget) {
      p.pos.x = lerp(p.pos.x, p.netTarget.x, k);
      p.pos.z = lerp(p.pos.z, p.netTarget.z, k);
    }
    p.t += raw;
    // Die Eselhöhe überträgt der Snapshot; so hebt und senkt sich der Reiter
    // gemeinsam mit dem Esel, auch wenn die Spielerposition nur 10×/s kommt.
    // Ohne Sattel gibt es keine Höhe – sonst bliebe ein mitten im Hüpfer
    // abgeworfener Reiter beim Gast dauerhaft in der Luft stehen.
    if (p.riding && mapDonkey) p.y = mapDonkey.hopH || 0;
    else if (!p.riding) p.y = 0;
    const turn = p.state === 'donkeykick' ? donkeyTurnAt(p.t)
      : p.state === 'donkeyspin' ? donkeyTurnAt(p.t, DONKEY_SPIN_DUR) : 0;
    p.fig.root.position.set(p.pos.x, p.y, p.pos.z);
    p.fig.root.rotation.y = p.facing * (Math.PI / 2 - 0.42) + p.facing * Math.PI * turn;
    animateFighter(p, raw, true);
  }
  for (const e of enemies) {
    if (e.dead) continue;
    if (e.netTarget) {
      e.pos.x = lerp(e.pos.x, e.netTarget.x, k);
      e.pos.z = lerp(e.pos.z, e.netTarget.z, k);
    }
    e.fig.root.position.set(e.pos.x, e.y, e.pos.z);
    e.fig.root.rotation.y = e.facing * (Math.PI / 2 - 0.42);
    // Geworfene Gegner taumeln auch beim Gast; der Host schickt nur die Höhe.
    if (e.y > 0.05) e.fig.root.rotation.z = 7.5 * e.t * -Math.sign(e.facing || 1);
    else if (e.fig.root.rotation.z) e.fig.root.rotation.z = 0;
    e.t += raw;
    animateFighter(e, raw, false);
    // Auch der Gast sieht Aushol-Glimmen, Schlagspur und Lebensbalken.
    updateEnemyAttackFx(e);
    updateEnemyHpBar(e, raw);
  }
  guestDonkeys(raw);
  updatePickupPrompts();
  updateParticles(raw);
  updateRings(raw);
  updateCamera(raw);
  renderer.render(scene, camera);
}

/* ============================== LOOP ===================================== */
const clock = new THREE.Clock();

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

let frameCount = 0;
let lastFrameAt = performance.now();

function tick() {
  requestAnimationFrame(tick);
  lastFrameAt = performance.now();
  update(Math.min(clock.getDelta(), 1 / 30));
}

// Ersatz-Takt, wenn der Tab gedrosselt ist (Hintergrund, Preview-Panel).
// Ohne ihn steht das Spiel still, sobald requestAnimationFrame pausiert.
setInterval(() => {
  if (!started) return;
  const now = performance.now();
  if (now - lastFrameAt > 260) {
    lastFrameAt = now;
    update(1 / 60);
  }
}, 16);

function update(raw) {
  frameCount++;

  if (restartRequested) {
    restartRequested = false;
    if (paused) setPaused(false);
    if (net.role !== 'guest') resetGame();
  }

  // Pause: Simulation und Snapshots stehen, das Bild wird weiter gezeichnet.
  if (paused) { renderer.render(scene, camera); return; }

  if (net.role === 'guest' && started) { guestFrame(raw); return; }

  // Flash und Zeitlupe laufen auch während des Hitstops weiter
  if (flashT > 0) {
    flashT = Math.max(0, flashT - raw);
    flashEl.style.opacity = String(Math.max(0, flashT / flashMax) * flashAmt);
  }
  timeScale = Math.min(1, timeScale + raw * 2.2);

  if (hitstop > 0) {
    hitstop -= raw;
    updateCamera(raw);
    renderer.render(scene, camera);
    return;
  }

  const dt = raw * timeScale;
  for (const p of players) updatePlayer(p, dt);
  separatePlayers();
  keepPlayersTogether(dt);
  updateDonkeys(dt);
  updateEnemies(dt);
  updateShots(dt);
  updatePickups(dt);
  updateParticles(dt);
  updatePropDamageVisuals(dt);
  updateRings(dt);
  updateSlapFx(dt);
  updateDamageNumbers(dt);
  updateCarAlarms(dt);
  updateWaves(dt);
  updateCamera(raw);
  if (net.role === 'host') {
    net.lastSend += raw;
    if (net.lastSend > 0.1) { net.lastSend = 0; sendSnapshot(); }
  }
  renderer.render(scene, camera);
}

resetGame();
buildDistrict(0, 0);
banner('KONSTANTINOPEL');
tick();

// Debug-Handle (nur für Entwicklung)
window.__voxel = {
  P, P2, players, enemies, scene, camera, renderer, THREE,
  attack: (kind, who = P) => tryAttack(who, kind),
  hit: (e, dmg, who = P) => damageEnemy(e, dmg, true, who.facing || 1, 0, who),
  special: (who = P) => trySpecial(who),
  setMeter: (v, who = P) => { who.meter = clamp(v, 0, 100); updateMeter(who); },
  freeze: (t) => { hitstop = t; },
  spawn: spawnEnemy,
  startWave, startGame, buildDistrict, equipWeapon, tryGrapple, diveKickHit, spawnPickup,
  setDifficulty, diffCfg, makeElite, spawnBossGuards,
  get difficulty() { return difficulty; },
  // Deterministischer Testschritt, unabhängig vom rAF-Takt des Tabs.
  step: (dt = 1 / 60, n = 1) => {
    for (let k = 0; k < n; k++) {
      for (const p of players) updatePlayer(p, dt);
      separatePlayers();
      keepPlayersTogether(dt);
      updateDonkeys(dt);
      updateEnemies(dt);
      updateShots(dt);
      updatePickups(dt);
      updateParticles(dt);
      updatePropDamageVisuals(dt);
      updateRings(dt);
      updateSlapFx(dt);
      updateDamageNumbers(dt);
      updateCarAlarms(dt);
      updateWaves(dt);
      updateCamera(dt);
    }
    renderer.render(scene, camera);
  },
  give: (kind, who = P) => equipWeapon(who, kind),
  addScore, showDamageNumber, damageFx, damageNumberHeight, enemyStyle, ENEMY_STYLES,
  pickups, shots, destructibles, donkeys, items: ITEMS, weapons: WEAPONS, waves: WAVE_DEFS, music, net, keys,
  carAlarms, damageProp, nearestCarAlarm, startCarAlarm, spawnAlarmSquad, smokePuffs, smokePuff, refreshPropDamage,
  sendSnapshot, applySnapshot, tryMount, dismountRider, spawnMapDonkey, guestDonkeys,
  tryPickup, updatePickupPrompts,
  get mapDonkey() { return mapDonkey; },
  ib: () => ({
    wave, scores: players.map((p) => p.score),
    enemies: enemies.filter((e) => !e.dead).length,
    p: players.map((p) => [p.hp, p.state, +p.pos.x.toFixed(1)]),
  }),
  get wave() { return wave; },
  get score() { return P.score; },
  get scores() { return players.map((p) => p.score); },
  get alarmCd() { return alarmSquadCd; },
  get alarmSquads() { return alarmSquadsLeft; },
  get paused() { return paused; },
  get muted() { return muted; },
  controls: CONTROLS, keyLabel, handleNet, applyControls,
  togglePause, setPaused,
  get coopSpread() { return COOP_MAX_SPREAD; },
  keepTogether: keepPlayersTogether, cameraTick: updateCamera,
  camFit: () => {
    // NDC-Positionen von Füßen und Kopf beider Spieler (|x|/|y| < 1 = im Bild).
    camera.updateMatrixWorld();
    const v = new THREE.Vector3();
    return players.map((p) => [0.15, 1.9].map((h) => {
      v.set(p.pos.x, p.y + h, p.pos.z).project(camera);
      return [+v.x.toFixed(2), +v.y.toFixed(2)];
    }));
  },
  get waveActive() { return waveActive; },
  get frames() { return frameCount; },
  get musicKey() { return currentTrackKey; },
  setWave: (n) => { wave = n; waveActive = false; wavePending = false; waveDelay = 0.2; },
  gates, carBlocks, SECTION_ARENA, SECTION_TRIGGER, maxWalkX,
  get builtDistrict() { return builtDistrict; }, get pending() { return wavePending; },
  openGate,
  get started() { return started; },
};
