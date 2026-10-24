// Voxel Rage — static web build. Pure Node, no dependencies.
//
// Game source: this repo IS the game (a fork of player529/Jannitschar),
// so the source is the repo root. GAME_SRC can point elsewhere (e.g. a
// fresh upstream checkout); if ../upstream exists it is used by default.
// Produces ../dist, ready to publish under /voxelrage/:
//
//   - content.js is copied with one asserted patch that adds a volume
//     control to the music engine (the sound slider needs it), vendor/
//     is copied unchanged, and web/assets/ (menu theme) is copied to
//     dist/assets/
//   - dist/index.html gets two classic <script> tags inserted before
//     the game's module script — first the supabase-js UMD build from
//     the same jsDelivr URL Leap Buddies uses, then ./net.js (Leap
//     Buddies' room transport, adapted — see web/net.js) — so both
//     have run before the game module executes
//   - dist/game.js is the upstream file with the two asserted patches
//     below: (1) handleNet learns an 'error' branch that maps relay
//     error keys to German player texts; (2) the net object's
//     WebSocket-to-Node-relay implementation is replaced by one that
//     calls Net.host/Net.join and maps their callbacks onto the same
//     handleNet messages (welcome/peer/left) the relay used to send.
//     If upstream wording changes, the build fails loudly instead of
//     publishing a stale patch.
//   - dist/net.js is a straight copy of web/net.js, dist/i18n.js of
//     web/i18n.js (the DE/EN language toggle), dist/gamepad.js of
//     web/gamepad.js (controller input) and dist/ui.js of web/ui.js
//     (voxel pause menu, 3D controller/keyboard config, online lobby
//     extras); dist/debug.html renders the transport's ?debug=1 log
//     from localStorage.
//   - dist/game.js additionally gets the bridge block appended at the
//     end: window.VoxelGame exposes the few internals ui.js and
//     gamepad.js read (bindings, net state, pause helpers).
//
// The upstream game itself is never modified; server.js stays the way
// to play online from a local checkout.
import { cp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const webDir = fileURLToPath(new URL('./', import.meta.url));
const repoRoot = path.join(webDir, '..');
const upstreamDir = path.join(repoRoot, 'upstream');
const src = process.env.GAME_SRC
  ? path.resolve(process.env.GAME_SRC)
  : (existsSync(path.join(upstreamDir, 'index.html')) ? upstreamDir : repoRoot);
const out = path.join(repoRoot, 'dist');

for (const required of ['index.html', 'content.js', 'game.js', 'vendor/three.module.js']) {
  await readFile(path.join(src, required)).catch(() => {
    throw new Error(`Game source missing ${required} — expected it in ${src}`);
  });
}

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp(path.join(src, 'vendor'), path.join(out, 'vendor'), { recursive: true });
await cp(path.join(webDir, 'assets'), path.join(out, 'assets'), { recursive: true });

/* Normalize line endings before any patch: the anchors below are written
 * with \n, and a Windows checkout (autocrlf) would otherwise turn this
 * build into a false "upstream changed" failure. Output uses LF. */
const lf = (text) => text.replace(/\r\n/g, '\n');

/* ------------------------------ content.js ------------------------------ */
/* Volume control for the synthesised soundtrack. The game only knows
 * muted/unmuted; the sound slider in the menus needs a real level, so the
 * music engine learns setVolume() here. Anchored, like the game patches. */
let content = lf(await readFile(path.join(src, 'content.js'), 'utf8'));
const VOLUME_DECL_ANCHOR = '  let step = 0;\n  let nextTime = 0;';
if (!content.includes(VOLUME_DECL_ANCHOR)) {
  throw new Error('createMusic state changed upstream: re-check the volume patch');
}
content = content.replace(VOLUME_DECL_ANCHOR, VOLUME_DECL_ANCHOR + '\n  let volume = 1;\n  let isMuted = false;');

const GAIN_ANCHOR = '    master.gain.value = 0.16;';
if (!content.includes(GAIN_ANCHOR)) {
  throw new Error('music master gain changed upstream: re-check the volume patch');
}
content = content.replace(GAIN_ANCHOR, '    master.gain.value = isMuted ? 0 : 0.16 * volume;');

const MUTE_METHOD_ANCHOR = '    setMuted(muted) {\n      if (master) master.gain.value = muted ? 0 : 0.16;\n    },';
if (!content.includes(MUTE_METHOD_ANCHOR)) {
  throw new Error('music setMuted changed upstream: re-check the volume patch');
}
content = content.replace(MUTE_METHOD_ANCHOR, `    setMuted(muted) {
      isMuted = !!muted;
      if (master) master.gain.value = isMuted ? 0 : 0.16 * volume;
    },
    /* Added by web/build.mjs: 0..1 level for the menus' sound slider. */
    setVolume(v) {
      volume = Math.max(0, Math.min(1, Number(v) || 0));
      if (master && !isMuted) master.gain.value = 0.16 * volume;
    },`);
await writeFile(path.join(out, 'content.js'), content);
await cp(path.join(webDir, 'net.js'), path.join(out, 'net.js'));
await cp(path.join(webDir, 'i18n.js'), path.join(out, 'i18n.js'));
await cp(path.join(webDir, 'gamepad.js'), path.join(out, 'gamepad.js'));
await cp(path.join(webDir, 'ui.js'), path.join(out, 'ui.js'));
await cp(path.join(webDir, 'debug.html'), path.join(out, 'debug.html'));

/* ------------------------------ index.html ------------------------------ */
let index = lf(await readFile(path.join(src, 'index.html'), 'utf8'));
const MODULE_TAG = '<script type="module" src="./game.js"></script>';
if (!index.includes(MODULE_TAG)) {
  throw new Error('index.html module tag changed upstream: re-check the script injection before publishing');
}
index = index.replace(MODULE_TAG, [
  '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>',
  '<script src="./net.js?v=7"></script>',
  '<script src="./i18n.js?v=3"></script>',
  '<script src="./gamepad.js?v=2"></script>',
  '<script src="./ui.js?v=4"></script>',
  /* The game module is versioned too: unlike net.js it is patched on
   * every build, and an unversioned URL let a test browser pair a
   * fresh index/net.js with a stale game.js from an earlier deploy
   * (the mix presented exactly like a transport failure). Leap
   * Buddies versions every script for the same reason. */
  '<script type="module" src="./game.js?v=8"></script>',
].join('\n'));
await writeFile(path.join(out, 'index.html'), index);

/* ------------------------------- game.js -------------------------------- */
let game = lf(await readFile(path.join(src, 'game.js'), 'utf8'));

/* Patch 0: version the content import as well. game.js pulls its roster with
 * a bare './content.js', so a returning browser could otherwise keep the old
 * module after a deploy even though game.js itself was re-fetched. */
const CONTENT_IMPORT = "from './content.js'";
if (!game.includes(CONTENT_IMPORT)) {
  throw new Error('content import changed upstream: re-check the version patch before publishing');
}
game = game.replace(CONTENT_IMPORT, "from './content.js?v=3'");
if (!game.includes('WebSocket') || !game.includes('/ws')) {
  throw new Error('Networking changed upstream: inspect game.js before publishing');
}

/* Patch 1: handleNet 'error' branch — room/relay errors arrive as
 * {t:'error', msg:<key>} from the transport's onError; the menu would
 * otherwise ignore them. Map the known keys to texts the player can
 * act on. */
const ERROR_PATCH_ANCHOR = 'function handleNet(m) {';
if (!game.includes(ERROR_PATCH_ANCHOR)) {
  throw new Error('handleNet not found upstream: re-check the error patch before publishing');
}
game = game.replace(ERROR_PATCH_ANCHOR, `${ERROR_PATCH_ANCHOR}
  if (m.t === 'error') {
    const reasons = {
      'room-not-found': 'Raum nicht gefunden — Code prüfen oder der Host hat den Raum geschlossen.',
      'room-full': 'Dieser Raum ist bereits voll (Host + 1 Gast).',
      'room-code-collision': 'Raumcode schon vergeben — bitte neuen Raum erstellen.',
      'relay-disconnected': 'Verbindung zum Relay verloren.',
      'relay-timeout': 'Relay nicht erreichbar — Verbindung prüfen und erneut versuchen.',
      'relay-unavailable': 'Online-Bibliothek konnte nicht geladen werden — Seite neu laden.',
      'relay-send-failed': 'Nachricht konnte nicht gesendet werden.',
      'presence-failed': 'Raum konnte nicht betreten werden.',
    };
    netMsg.textContent = reasons[m.msg] || ('Verbindungsfehler: ' + m.msg);
    return;
  }`);

/* Patch 2: replace the net object's Node-relay WebSocket with the
 * Leap Buddies Net transport. Anchored on the block's first line and
 * the listener that follows it. The replacement keeps the object's
 * outward shape (role/room/peer/lastSend, connect/send/close) plus a
 * `live` flag that stands in for the old ws.readyState === 1 check. */
const NET_BLOCK_START = 'const net = {\n  ws: null, role: null, room: null, peer: false, lastSend: 0,';
const NET_BLOCK_FOLLOW = '\n};\n\nhostBtn.addEventListener';
const netStart = game.indexOf(NET_BLOCK_START);
if (netStart < 0) {
  throw new Error('net object changed upstream: re-check the transport patch before publishing');
}
const netEnd = game.indexOf(NET_BLOCK_FOLLOW, netStart);
if (netEnd < 0) {
  throw new Error('net object end not found upstream: re-check the transport patch before publishing');
}
const NET_BLOCK = `const net = {
  /* Web build: Leap Buddies' Net transport (web/net.js) instead of the
   * Node-relay WebSocket. connect() maps Net's callbacks onto the same
   * handleNet messages the relay used to send (welcome/peer/left/
   * error), so the rest of the game is unchanged. 'live' replaces the
   * old ws.readyState === 1 check: true while this side is in a room. */
  handle: null, role: null, room: null, peer: false, lastSend: 0, live: false,
  connect(role, room) {
    this.close();
    this.role = role;
    if (typeof Net === 'undefined' || !Net.libReady()) {
      netMsg.textContent = 'Online-Bibliothek konnte nicht geladen werden — Seite neu laden.';
      return;
    }
    netMsg.textContent = 'Verbinde …';
    const self = this;
    let handle = null;
    const alive = () => self.handle === handle;
    const cbs = {
      onOpen(code) {
        if (!alive()) return;
        self.live = true;
        handleNet({ t: 'welcome', role, room: code });
        netMsg.textContent = 'Verbunden. Warte auf Gegenüber …';
        if (role === 'guest') handleNet({ t: 'peer', role });
      },
      onGuest() { if (alive()) handleNet({ t: 'peer', role }); },
      onData(d) { if (alive()) handleNet(d); },
      onClose() {
        if (!alive()) return;
        if (self.peer) handleNet({ t: 'left' });
        self.peer = false;
        if (role === 'guest') {
          self.live = false;
          netStatus.textContent = '';
          netMsg.textContent = 'Verbindung getrennt.';
        }
      },
      onError(key) {
        if (!alive()) return;
        self.live = false;
        handleNet({ t: 'error', msg: key });
      },
    };
    handle = role === 'host' ? Net.host(Net.makeCode(), cbs) : Net.join(room, cbs);
    this.handle = handle;
    if (!handle) {
      this.role = null;
      netMsg.textContent = 'Relay nicht erreichbar — Verbindung prüfen und erneut versuchen.';
    }
  },
  send(obj) { if (this.handle) this.handle.send(obj); },
  close() {
    const h = this.handle;
    this.handle = null;
    if (h) { try { h.close(); } catch (e) {} }
    this.role = null; this.room = null; this.peer = false; this.live = false;
  },
}`;
game = game.slice(0, netStart) + NET_BLOCK + game.slice(netEnd + 3);

/* The one external read of the old socket state (damage-number queue
 * in damageEnemy): swap it for the live flag. */
const READYSTATE_GUARD = 'net.ws && net.ws.readyState === 1';
if (!game.includes(READYSTATE_GUARD)) {
  throw new Error('readyState guard changed upstream: re-check the transport patch before publishing');
}
game = game.replace(READYSTATE_GUARD, 'net.live');

if (game.includes('new WebSocket')) {
  throw new Error('game.js still constructs a WebSocket after patching: transport replacement incomplete');
}

/* Bridge: the web layer (ui.js, gamepad.js) reads the game's bindings and
 * pause state through this one object instead of reaching into the module.
 * Appended at the end so every declaration it names already exists. */
const BRIDGE = `
/* ---- web layer bridge (added by web/build.mjs) ---- */
window.VoxelGame = {
  get controls() { return CONTROLS; },
  get defaultControls() { return DEFAULT_CONTROLS; },
  get net() { return net; },
  get started() { return started; },
  get paused() { return paused; },
  /* Who stopped the round: 'host', 'guest' or 'local'. */
  get pausedBy() { return pausedBy; },
  get muted() { return muted; },
  get mode() { return mode; },
  get music() { return music; },
  /* Sound menu: the game's own mute flag plus the track restart rules,
   * so the UI toggle behaves exactly like the M key. */
  setAudioMuted(v) {
    muted = !!v;
    music.setMuted(muted);
    if (muted) music.stop();
    else { currentTrackKey = null; playTrackForWave(); }
  },
  keyLabel,
  isReservedBind,
  saveBindings,
  refreshBindingUI,
  applyControls,
  setPaused,
  togglePause,
  setDifficulty,
  startGame,
};
`;
if (!game.includes('const CONTROLS = DEFAULT_CONTROLS.map')) {
  throw new Error('CONTROLS declaration changed upstream: re-check the web bridge');
}
game += BRIDGE;

await writeFile(path.join(out, 'game.js'), game);
await writeFile(path.join(out, '.nojekyll'), '');
console.log(`Built dist from ${src}: publish its contents under /voxelrage/. Server files are excluded.`);
