# Voxel Rage — static web build

This folder is the web-hosting layer for this fork. The game itself
(repo root: `index.html`, `game.js`, `content.js`, `server.js`,
`vendor/`) is unchanged from [player529/Jannitschar](https://github.com/player529/Jannitschar);
everything here attaches at build time.

## Build

Node 20+, no dependencies:

```sh
node web/build.mjs   # writes dist/
```

`build.mjs` copies `vendor/` and `web/assets/` (the menu theme), copies
`content.js` (with an asserted volume patch), copies the web modules,
injects the supabase-js UMD build and the module script tags into
`index.html`, and patches the generated `game.js` only:

1. `handleNet` learns an `error` branch that maps relay keys to German
   player texts.
2. The `net` object's Node-relay WebSocket is replaced by the Leap
   Buddies transport (`Net.host` / `Net.join`), mapped onto the same
   `welcome` / `peer` / `left` messages the relay used to send.
3. A `window.VoxelGame` bridge is appended at the end, exposing the
   bindings, net state and pause helpers that `ui.js` and `gamepad.js`
   read. Nothing else reaches into the module.
4. `content.js` grows `music.setVolume(0..1)` so the menu volume slider
   also drives the synthesized soundtrack; the patch is asserted too.

Each anchor is asserted: if upstream wording moves, the build fails
loudly instead of publishing a stale patch. Line endings are normalized
to LF so a Windows checkout does not trip those assertions.

`server.js`, `.check` and screenshots are never copied into `dist/`.
The Pages workflow (`.github/workflows/pages.yml`) runs this build on
every push to `main` and publishes `dist/` — that is what serves
https://xiondigital.net/voxelrage/.

## Modules

| File | Role |
|---|---|
| `net.js` | Room transport over Supabase Realtime (Leap Buddies pattern) |
| `i18n.js` | DE/EN DOM translation, menu language switches |
| `gamepad.js` | Controller → key-event translation, pad bindings |
| `ui.js` | Pause menu, how-to-play guide, HUD, 3D control configuration, sound, lobby extras |
| `assets/menu-theme.mp3` | Main menu theme, copied to `dist/assets/` |
| `debug.html` | Renders the transport's `?debug=1` log from localStorage |

### net.js — rooms

A deliberate port of `XiONDiGiTaL/leapbuddies/js/net.js`, verified
working: both browsers make one outbound connection to a Supabase
Realtime broadcast+presence channel on the existing project — public
anon key only, auth-session persistence disabled, `eventsPerSecond`
40, presence keys `host-<rand>` / `guest-<rand>`, payloads on broadcast
event `msg` tagged with the sender side, and 12 s / 20 s watchdogs
instead of latching transient channel errors.

Adaptations, only at the edges:

- namespace `voxelrage-v1-`, 4-letter codes (the game UI enforces four
  characters) from the old relay's alphabet; `Net.makeCode()` exists
  because the host generates its own code.
- the host locks onto the first guest that sends any message; a third
  browser receives a lock note naming the seated guest and is told the
  room is full.
- `onError` reports short keys (`room-not-found`, `room-full`,
  `relay-timeout`, `relay-unavailable`) that the patched `handleNet`
  maps to player texts.
- `onStatus` reports `connecting` / `online` / `reconnecting` /
  `closed` for the lobby pill and pause menu.
- Invite links: `Net.inviteUrl(code)`, `Net.roomFromUrl()`,
  `Net.setRoomParam(code)`, `Net.clearRoomParam()`. The host mirrors
  its code into `?room=CODE` so the address bar is shareable; a guest
  opening that URL gets the code pre-filled and Online pre-selected.

### gamepad.js — controllers

Every frame it reads the first connected standard-mapping pad and
re-emits the *currently bound* keys of the local player, so game and
pad bindings cannot drift apart. Defaults are the classic beat-'em-up
layout (A punch, B jump, X kick, Y special, LB grab, RB mount, RT
sprint, Start pause, Back restart, left stick/D-pad move). The pad map
is stored under `voxelrage-pad-v1`; `VoxelPad.beginCapture()` lets the
config UI grab the next button, and `setActive(false)` suspends gameplay
input while the controls window is open.

### ui.js — pause menu, 3D control config, lobby

Added at runtime so the game files stay untouched:

- **Pause menu** in the game's style: Resume, Restart, Controls, Music,
  Language, Leave. The original overlay text is hidden; `#pause` still
  drives the game's own pause state, and a wrapper stops our buttons
  from reaching the game's click-to-resume handler.
- **Controls window** with two 3D scenes rendered through the vendored
  Three.js. The controller is a compact rounded voxel pad with a D-pad,
  two sticks, four lettered face buttons (A / B / X / Y), shoulders and
  triggers. The keyboard is a 75 % board with chunky keycaps, a
  player-two arrow cluster and a modifier row. Both are raycast-clickable;
  a click or a real button/key press assigns the action, swapping with any
  existing binding instead of duplicating it. Key labels use unlit
  materials so they stay legible at every angle.
- **How to play** opens from either menu: a two-column guide whose
  bindings are rendered as voxel keycaps (gold P1, cyan P2) that follow
  remaps, and whose pickups (döner, ayran, gold, each weapon) are drawn
  as small voxel sprites beside their values.
- **HUD upgrade** applied at runtime: the portrait is a one-off render of
  the game's own head group (`fig.head.clone(true)`) into a small
  offscreen WebGL scene, cached per palette, so the card shows the exact
  character sprite instead of a drawing. Each card also carries a pixel
  heart and a scrolling SVG ECG trace inside the health bar whose
  colour, speed and amplitude follow health (green >60 %, yellow >30 %,
  red below, flattening toward a flatline). The special meter gains a
  glow and a moving sheen when full.
- **Sound controls** in the menu header and pause menu (`voxelrage-audio-v1`):
  mute and a 0–100 volume slider drive the menu theme, the synthesized
  soundtrack via the patched `setVolume`, and the game's own mute flag
  so the `M` key agrees.
- **Language switch** mounted into the main menu (next to the kicker)
  and the pause menu through `VoxelI18n.attach()`, so the whole DOM
  follows exactly like the floating switch did before.
- **Lobby extras**: invite-link copy button, live connection pill,
  invite-link pre-fill, a toast when a controller connects, and a
  "host left" dialog with a one-click return to the menu instead of a
  frozen world.

The 3D views need WebGL; if it is unavailable the window reports it and
the rest of the game is unaffected.

## Verifying before calling it done

1. `node web/build.mjs` succeeds and `dist/` loads with no console
   errors, assets resolving under the subpath.
2. Solo run starts; movement and attacks work.
3. Language switch in the menu and the pause menu translates the whole
   interface; the choice survives a reload.
4. Pause menu opens with Esc/P, resumes, restarts, toggles sound and
   leaves; the controls and guide windows open from both menus.
5. The menu theme plays after a click, stops when a run starts, and the
   volume slider changes it; mute survives a reload.
6. Both 3D tabs render; a keyboard and a pad binding can be changed and
   survive a reload; a bound key is wiped to defaults again.
7. A simulated pad punches, moves and pauses the game.
8. The health bar's trace slows and turns red at low HP; the special
   meter glows at full charge; the portrait matches the chosen fighter.
9. Two browser contexts: host gets a code, the URL gains `?room=`, an
   invite link pre-fills the guest, the host starts, both play the same
   run, host pause reaches the guest, and closing the host shows the
   guest the "host left" dialog.
10. A third context cannot replace the existing guest; a wrong code and
    a relay loss produce usable feedback.

With `?debug=1` in the page URL the transport logs its state
transitions on-page, into `localStorage`, and on `debug.html`.
