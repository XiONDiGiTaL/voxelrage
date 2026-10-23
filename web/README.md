# Voxel Rage — static web build

This folder is the web-hosting layer for this fork. The game itself
(repo root: `index.html`, `game.js`, `content.js`, `vendor/`,
`server.js`) is unchanged from [player529/Jannitschar](https://github.com/player529/Jannitschar).

## Build

Node 20+:

```sh
cd web
npm ci
npm run build   # writes ../dist
```

`build.mjs` copies `index.html`, `content.js` and `vendor/` into
`dist/`, prepends one import line to `game.js`, and bundles
`realtime-transport.js` next to it. It also patches two error texts in
the generated `game.js` only, so a missing room on the public relay no
longer tells web players to start `server.js`. Both patches are
asserted — if upstream wording changes, the build fails loudly
instead of publishing a stale patch. `server.js`, `server.log`,
`server.pid`, `.check` and screenshots are never copied into `dist/`.

The Pages workflow (`.github/workflows/pages.yml`) runs this build on
every push to `main` and publishes `dist/` — that is what serves
https://xiondigital.net/voxelrage/.

## Multiplayer

`realtime-transport.js` replaces only the game's own same-host `/ws`
WebSocket with a room socket backed by Supabase Realtime broadcast
channels — the existing Sohbet project's public Realtime service, in
the isolated `voxelrage-v1-` room namespace. Only the public anon
browser key is embedded; no service-role credential is used, no
database tables or policies are touched, and nothing is stored.
Broadcast traffic counts toward that project's quotas.

Rooms remain four-letter, host-authoritative two-player casual
sessions — not authenticated or cheat-resistant. Public Realtime
channels provide no access-control guarantees; never send private
data through game rooms. The host's tab must stay open (it runs the
simulation). A full room rejects a second guest, and a lost relay
connection closes the session rather than silently resuming a
desynchronized game.

## Verified before calling production playable

1. Build succeeds; page loads at the final HTTPS `/voxelrage/` URL
   with no console import/WebGL errors, assets resolve under the
   subpath.
2. Solo run starts; movement and attacks work.
3. Two separate browser contexts: create room, join with the code,
   host starts; host and guest movement, combat snapshots, pause and
   restart all work.
4. A third context cannot replace the existing guest.
5. Bad code, guest leaving, host leaving and relay loss all produce
   usable in-menu feedback.
