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

The adaptation is only at the edges, because this game speaks
WebSocket to its own Node relay (`server.js`): `net.js` installs a
stand-in for exactly the game's same-host `/ws` endpoint (every other
socket stays native — Supabase resolves the global constructor
itself, exactly as it does on Leap Buddies' page, and the stand-in
passes its socket straight through) and synthesizes the relay's
messages from presence:

- The **host generates the 4-letter code itself** (same alphabet as
  `server.js`), opens on channel-subscribed, and receives
  `{t:'peer'}` when a guest presence key appears.
- The **guest opens when the host's presence is seen**, receiving
  `{t:'welcome'}` and `{t:'peer'}`; 12 s without a host means the
  room doesn't exist.
- Game JSON is relayed verbatim as the broadcast payload's `d`
  field. The host locks onto the first guest that sends data
  (`__gid`), so a third browser cannot take the guest's seat.
- Losing the peer's presence produces `{t:'left'}`; relay failures
  produce `{t:'error', msg}` with a readable reason in the menu.

Channels are named `voxelrage-v1-<CODE>` — an isolated namespace on
the shared project, so Leap Buddies / KankaKombat rooms can never
collide with these. Nothing is stored in any database; broadcast
traffic counts toward the project's quotas. Rooms are casual and
public: not authenticated, not cheat-resistant — never send private
data through a game room. The host's tab must stay open (it runs the
simulation).

From a local checkout, `node server.js` remains the original way to
play online on your own network, untouched by any of this.

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
