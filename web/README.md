# Voxel Rage — static web build

This folder is the web-hosting layer for this fork. The game itself
(repo root: `index.html`, `game.js`, `content.js`, `vendor/`,
`server.js`) is unchanged from [player529/Jannitschar](https://github.com/player529/Jannitschar).

## Build

Node 20+, no dependencies:

```sh
node web/build.mjs   # writes dist/
```

`build.mjs` copies `content.js` and `vendor/` into `dist/`, copies
`web/net.js` next to them, injects two classic script tags into
`index.html` just before the game's module script — the supabase-js
UMD build from jsDelivr (the exact URL Leap Buddies loads) and
`./net.js` — and applies the asserted error-text patch to the
generated `game.js` only, so a missing room on the public relay no
longer tells web players to start `server.js`. If upstream wording
changes, the build fails loudly instead of publishing a stale patch.
`server.js`, `.check` and screenshots are never copied into `dist/`.

The Pages workflow (`.github/workflows/pages.yml`) runs this build on
every push to `main` and publishes `dist/` — that is what serves
https://xiondigital.net/voxelrage/.

## Multiplayer — the Leap Buddies pattern

Online is `web/net.js`, a deliberate port of the transport in
[Leap Buddies](https://github.com/XiONDiGiTaL/leapbuddies/blob/main/js/net.js)
(`XiONDiGiTaL/leapbuddies/js/net.js`), which is verified working:
both browsers make one outbound connection to a Supabase Realtime
broadcast+presence channel on the existing Sohbet project — public
anon key only, auth-session persistence disabled, `eventsPerSecond`
40, presence keys `host-<rand>` / `guest-<rand>`, payloads on
broadcast event `msg` tagged with the sender side, and 12 s / 20 s
watchdogs instead of latching transient channel errors.

The adaptation is only at the edges, because this game's net code
was written against its own Node relay (`server.js`). `net.js`
keeps Leap's `Net.host(code, cbs)` / `Net.join(code, cbs)` API
untouched, and the build patches the game's `net` object to call it,
mapping the callbacks onto the same `handleNet` messages the relay
used to send:

- The **host generates the 4-letter code itself** (same alphabet as
  `server.js`) via `Net.makeCode()`; `onOpen` delivers the game's
  `welcome` message, `onGuest` delivers `peer`.
- The **guest's** `onOpen` (host presence or data seen) delivers
  `welcome` + `peer`; 12 s without a host reports `room-not-found`.
- Game messages ride as broadcast payload objects end to end (no
  JSON string layer). The host locks onto the first guest that
  sends data (`__gid`), so a third browser cannot take the seat.
- Losing the peer reports `left`; relay failures report `error`
  with a key the game maps to a readable German menu text.

An earlier build instead emulated the relay behind a WebSocket
stand-in; room creation never survived contact with a real browser,
so the direct adaptation replaced it — the page never touches the
global WebSocket constructor, exactly like Leap Buddies' page.

## Language toggle (DE | EN)

`web/i18n.js` adds the DE | EN switcher in the top-right corner,
modeled on Leap Buddies' language buttons: the game's strings are
German, so the module translates the DOM (dictionary + pattern
rules for strings with values baked in) and keeps translating at
runtime via a MutationObserver — HUD and status writes arrive in
German and are swapped in place while English is active, and
switching back restores the exact German. The choice persists in
`localStorage` (`voxelrage-lang`); German stays the default.

With `?debug=1` in the page URL, the transport logs its state
transitions on-page, into `localStorage`, and on `debug.html`.

## Verified before calling production playable

1. Build succeeds; page loads at the final HTTPS `/voxelrage/` URL
   with no console import/WebGL errors, assets resolve under the
   subpath.
2. Solo run starts; movement and attacks work.
3. Two separate browser contexts: host gets a room code, guest joins
   with it, host starts; host and guest movement, combat snapshots,
   pause and restart all work.
4. A third context cannot replace the existing guest.
5. Bad code, guest leaving, host leaving and relay loss all produce
   usable in-menu feedback.
