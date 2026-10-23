// Voxel Rage — static web build. Pure Node, no dependencies.
//
// Game source: this repo IS the game (a fork of player529/Jannitschar),
// so the source is the repo root. GAME_SRC can point elsewhere (e.g. a
// fresh upstream checkout); if ../upstream exists it is used by default.
// Produces ../dist, ready to publish under /voxelrage/:
//
//   - content.js and vendor/ are copied unchanged
//   - dist/index.html gets two classic <script> tags inserted before
//     the game's module script — first the supabase-js UMD build from
//     the same jsDelivr URL Leap Buddies uses, then ./net.js, the
//     Leap-Buddies-pattern room transport — so both have run before
//     the game module executes
//   - dist/game.js is the upstream file with ONLY the error-text
//     patch below applied (asserted: if upstream wording changes,
//     the build fails loudly instead of publishing a stale patch)
//   - dist/net.js is a straight copy of web/net.js
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
for (const file of ['content.js', 'vendor']) {
  await cp(path.join(src, file), path.join(out, file), { recursive: true });
}
await cp(path.join(webDir, 'net.js'), path.join(out, 'net.js'));

/* ------------------------------ index.html ------------------------------ */
let index = await readFile(path.join(src, 'index.html'), 'utf8');
const MODULE_TAG = '<script type="module" src="./game.js"></script>';
if (!index.includes(MODULE_TAG)) {
  throw new Error('index.html module tag changed upstream: re-check the script injection before publishing');
}
index = index.replace(MODULE_TAG, [
  '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>',
  '<script src="./net.js"></script>',
  MODULE_TAG,
].join('\n'));
await writeFile(path.join(out, 'index.html'), index);

/* ------------------------------- game.js -------------------------------- */
let game = await readFile(path.join(src, 'game.js'), 'utf8');
if (!game.includes('WebSocket') || !game.includes('/ws')) {
  throw new Error('Networking changed upstream: inspect game.js before publishing');
}

// Error-text patch (dist only): on the web build there is no local
// server to start, and room/relay errors arrive as {t:'error', msg}
// messages the menu otherwise ignores. Map the known reasons to texts
// the player can act on.
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
const OLD_ONERROR = `'WebSocket-Fehler — läuft server.js?'`;
if (!game.includes(OLD_ONERROR)) {
  throw new Error('ws.onerror text changed upstream: re-check the error patch before publishing');
}
game = game.replace(OLD_ONERROR, `'Verbindungsfehler — Raum nicht gefunden oder Relay nicht erreichbar.'`);

await writeFile(path.join(out, 'game.js'), game);
await writeFile(path.join(out, '.nojekyll'), '');
console.log(`Built dist from ${src}: publish its contents under /voxelrage/. Server files are excluded.`);
