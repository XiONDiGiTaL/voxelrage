<p align="center">
  <a href="README.md"><img alt="English" src="https://img.shields.io/badge/EN-English-ffd76e?style=flat-square&labelColor=1a1428"></a>
  <a href="README_DE.md"><img alt="Deutsch" src="https://img.shields.io/badge/DE-Deutsch-8f86b8?style=flat-square&labelColor=1a1428"></a>
</p>

# VOXEL RAGE — Janissaries

**Play now: [xiondigital.net/voxelrage](https://xiondigital.net/voxelrage/)**

A voxel beat-'em-up set in Ottoman Istanbul. Every character, street, building and particle is built from cubes. This repository is the web edition of [player529/Jannitschar](https://github.com/player529/Jannitschar): the original game, plus hosted online co-op, controller support, in-menu language switching, a full pause menu, a How to Play guide, a voxel HUD and sound controls.

<p align="center">
  <img src="screenshots/menu.png" alt="Voxel Rage start menu" width="88%">
</p>

## What this fork adds

The game itself is [player529](https://github.com/player529/Jannitschar)'s work and keeps its art direction, combat feel and content. Everything below is layered on top for the web release at xiondigital.net/voxelrage and leaves the original game files untouched — the web layer is attached at build time.

- **Online co-op that actually connects.** Rooms run on the same Supabase Realtime transport as [Leap Buddies](https://github.com/XiONDiGiTaL/leapbuddies): one outbound WebSocket per browser, presence-based membership, host-authoritative play, no ports, no tunnels, no relay to host.
- **Invite links.** The host's room code is mirrored into the address bar. `Copy invite link` in the menu shares a URL that opens the game with the code already filled in.
- **Live connection state.** The lobby and pause menu show whether the room is open, who has joined, and whether the relay is reconnecting.
- **Graceful exits.** If the host leaves mid-run, the guest gets a clear message and a one-click return to the menu instead of a frozen street.
- **Plug-and-play controllers.** Standard-mapping gamepads work as soon as they are connected, with a beat-'em-up button layout.
- **3D control configuration.** A compact voxel gamepad with a D-pad, separated ABXY buttons and two sticks, and a 75 % voxel keyboard with a player-two arrow cluster. Both are clickable and show the current bindings; pick an action and press a button or key to remap it.
- **Language switch in the menus.** DE | EN sits in the main menu and in the pause menu, and the whole interface follows — the same easy switch Leap Buddies uses.
- **A real pause menu.** Resume, restart, controls, guide, sound, language and leave, drawn in the game's own voxel/noir style.
- **A How to Play guide.** Keycaps drawn as voxel keys for both players, with the food and weapon pickups shown as voxel sprites next to their values.
- **A voxel HUD.** A portrait rendered from the character's own head mesh, a pixel heart and an ECG health trace that colours, slows and flattens as health drops — plus a special meter that glows at full charge.
- **Sound controls and a menu theme.** A muted/volume pair in the menu and pause menu drives the looped menu track and the in-game soundtrack.

## Latest revision

This pass rebuilt the parts of the interface that still looked hand-drawn:

- **HUD portraits are exact sprite renders.** The game's own head group — geometry, hat, band, eyes and moustache — is cloned into a small offscreen scene and rendered once per palette, then cached as an image. The card now shows the same face that walks the street.
- **The 3D controller was rebuilt.** A compact rounded body with a clean D-pad, four separated face buttons (A / B / X / Y), two analog sticks with accent rings, shoulders and triggers. Face buttons are bound to the actions, so picking Punch and pressing the green button still works.
- **The 3D keyboard was rebuilt.** Chunky keycaps on a two-tone deck, a player-two arrow cluster, a bottom modifier row with both Shift keys, status LEDs and unlit key labels that stay readable from any angle.
- **The guide, pause menu, HUD and sound row are captured below** so the README shows the current build instead of an older menu.

## Screenshots

Captured from the running game, not mock-ups.

### Interface

| | |
|---|---|
| ![Start menu](screenshots/menu.png) | ![In-game HUD](screenshots/hud.png) |
| Start menu with language and sound controls | HUD: sprite portrait, heart, ECG health and special meter |
| ![How to Play](screenshots/how-to-play.png) | ![Pause menu](screenshots/pause-menu.png) |
| How to Play with voxel keycaps and item sprites | Pause menu with sound, guide and language |
| ![Controller configuration](screenshots/controls-controller.png) | ![Keyboard configuration](screenshots/controls-keyboard.png) |
| 3D controller configuration | 3D keyboard configuration |

### Combat

| | |
|---|---|
| ![Street combat](screenshots/voxel-rage-fight.png) | ![Boss encounter](screenshots/voxel-rage-boss.png) |
| Street combat | Boss encounter |
| ![Ottoman Slap](screenshots/voxel-rage-special.png) | ![Online co-op](screenshots/online-koop.png) |
| The Ottoman Slap special | Online co-op |
| ![Donkey riding](screenshots/donkey-final2.png) | ![Voxel Rage](screenshots/voxel-rage-menu-final.png) |
| Riding a donkey | Earlier menu capture |

More images live in [screenshots/](screenshots/).

## Play online

1. Open [xiondigital.net/voxelrage](https://xiondigital.net/voxelrage/) in two browsers, or on two devices.
2. One player picks **Online → Create room (Host)**. A four-character code appears, and the page URL becomes an invite link.
3. The other player either presses **Copy invite link** and opens it, or picks **Online**, types the code and presses **Join**.
4. The host presses **Start battle**. Both players enter the same run.

The host's browser runs the simulation and streams about ten snapshots per second; the guest sends inputs and renders. Both tabs must stay open, and the host's browser is the authoritative one. Solo and local co-op need no connection once the page has loaded.

Rooms are ephemeral Supabase broadcast channels (`voxelrage-v1-<CODE>`) with a public anonymous key; no game data is stored. A room holds exactly one host and one guest — a third browser is told the room is full.

## Play locally

```bash
node server.js                # http://127.0.0.1:8123, this computer only
node server.js 9000           # another port
node server.js 8123 0.0.0.0   # reachable on the local network
```

`server.js` is the original dependency-free static server and WebSocket relay. On the local network, friends open the printed address, pick Online, and use the room code. For internet play with the original relay, a Cloudflare Tunnel works:

```bash
cloudflared tunnel --url http://localhost:8123
```

The hosted edition does not need the relay; it uses the Supabase transport described above.

## Modes and difficulty

| Mode | Players | Notes |
|---|---|---|
| Solo | 1 | One Janissary, one keyboard. |
| Local co-op | 2 | Shared keyboard and a shared camera. |
| Online | 2 | Host + guest, host-authoritative, invite link or room code. |

Choose a difficulty before starting; the host's choice applies to an online run.

| Setting | Easy | Normal | Hard | Nightmare |
|---|---|---|---|---|
| Enemies per section | 14–18 | 18–24 | 24–32 | 28–32 |
| Loot per section | 7 | 5 | 4 | 3 |
| Enemy HP | 85% | 100% | 120% | 135% |
| Enemy damage | 75% | 100% | 125% | 145% |
| Reinforcements at | 4 left | 5 left | 6 left | 8 left |

Nightmare marks every third spawn as an elite (golden aura, shoulder plates, crown, +70% health) and puts three elite guards around every boss.

## Controls

### Keyboard (defaults)

| Action | Player 1 | Player 2 |
|---|---|---|
| Move | `W` `A` `S` `D` | `↑` `←` `↓` `→` |
| Punch / use weapon / pick up | `J` | `,` |
| Kick | `K` | `.` |
| Special (Ottoman Slap / Superkick) | `L` | `/` |
| Jump / donkey hop | `Space` | `Enter` |
| Run (hold) | `Shift` | `Right Shift` |
| Grab / chain / throw setup | `G` | `;` |
| Mount / dismount donkey | `E` | `'` |

`M` toggles music, `R` restarts, `Esc` or `P` pauses. Bindings are stored locally and shared with the host in online co-op.

### Controller (defaults)

Standard-mapping pads: Xbox-style, DualShock/DualSense, and most 8BitDo and generic pads.

| Action | Button |
|---|---|
| Move | Left stick or D-pad |
| Punch / pick up / fire | A (bottom) |
| Jump / donkey hop | B (right) |
| Kick | X (left) |
| Special | Y (top) |
| Grab / chain | LB |
| Mount | RB |
| Run (hold) | RT |
| Pause | Start |
| Restart | Back / View |

The pad translates into the game's own key bindings, so remapping a key also remaps the pad, and Player 2 in local co-op still uses the keyboard.

### How to play

The start menu has a **How to play** button — the same idea as Leap Buddies' field guide. It opens a two-column guide: movement, combat, grab and throw, the donkey, food and weapons. Every action shows the live key binding for both players as voxel keycaps (gold P1, cyan P2), and each pickup shows a small voxel sprite next to its effect. The guide follows remaps and the selected language, and it is reachable from the pause menu too.

### Remapping in 3D

Open **Set up controls** in the start menu, or **Controls** in the pause menu. The window has two tabs:

- **Controller** — a compact voxel gamepad with a D-pad, two sticks and four face buttons labelled A / B / X / Y. Pick an action on the right, then press a button on your pad, or click the 3D button directly. Drag the model to turn it.
- **Keyboard** — a voxel keyboard with every key lit in gold (P1) or cyan (P2) when it is bound. Pick a player and an action, then press the key or click the 3D key.

Bindings swap instead of duplicating, so no key is ever assigned twice. Pad layout is stored under `voxelrage-pad-v1`; keyboard bindings under `voxel-rage-bindings-v1`. Both are local to the browser.

## Pause menu and language

`Esc` or `P` freezes the simulation, the snapshots and the music, and opens the pause menu:

- **Resume** — continue.
- **Restart** — reset the run.
- **Controls** — open the 3D control configuration.
- **How to play** — open the guide.
- **Leave** — end the session and return to the menu.
- **Sound** — a speaker toggle and a volume slider under the buttons.
- **Language** — the same DE | EN switch as the main menu.

The language choice is stored under `voxelrage-lang` and applies to the whole interface, including HUD updates and status messages, not just the menus.

## HUD

Each player card is a voxel panel with a small portrait window of the chosen character, built from that character's own palette, next to the name and lives.

The health bar carries a pixel heart and an ECG trace — a scrolling SVG heartbeat mask inside the fill — running through it. The colour and pace follow the health: green above 60 %, yellow in the middle, red below 30 %. As health drops the trace slows down, loses amplitude and flattens toward a flatline, while the heart pulse slows with it. The numeric HP sits beside the bar.

The special meter glows cyan and runs a light sheen through the fill when it is full, so the Ottoman Slap / Superkick is readable at a glance. Weapons show as a highlighted chip under the bars.

## Sound

A speaker toggle and volume slider sit in the main menu header and in the pause menu. They control:

- the looped menu theme (`web/assets/menu-theme.mp3`), which plays only while the start menu is up and stops when a run begins,
- the synthesised district and boss soundtrack, through a volume control added to the music engine by the build,
- and the game's own sound effects via its mute flag, so the `M` key and the menu toggle stay in agreement.

The choice is stored under `voxelrage-audio-v1` and restored on the next visit. Browsers usually require one click before audio may start; the first interaction unlocks the theme.

## Gameplay

**Structure.** Ten districts with three sections each — 30 waves, each a 340-unit street with a gate and a boss at the end. Each district has its own sky, facades, music and boss.

**Combat.** Five-hit punch chain and three-hit kick chain, each stage with its own silhouette and range. Punch in the air for a divekick. The Ottoman Slap special sweeps a wide arc, leaves handprints and fills from landed hits.

**Grabbing.** Grab an enemy by the collar up close, or pull them in with the chain from up to 12.5 units. Walk them around, then throw them into other enemies and props. Bosses cannot be held.

**The donkey.** One per map, with hopping, front kick, spin kick and a full-meter superkick. Any hit throws the rider off, and the donkey bolts.

**Co-op survival.** At 0 HP a co-op player goes down instead of dying; stay close and the rescue bar revives them without losing a life. Solo at 0 HP loses a life immediately. Three lives each, an extra life every 2,000 personal points, separate score rows.

**Enemies.** Ten types with their own windups, reach and behaviour: dash, block, shield, ranged, exploding, elite variants. Health bars appear over wounded enemies, and every hit shows a damage number.

**Loot and destruction.** Döner, Ayran and Gold; pistol, rifle, bazooka, bat, knuckleduster and kusarigama. Cars, lamps, benches and props take staged damage; wrecked cars trigger alarms that distract enemies and call reinforcements.

**Sound.** Every in-game track is synthesized live in the browser — a sequencer per district and a faster minor-key boss track. The only audio file is the bundled menu theme.

## Build and deploy

```bash
node web/build.mjs    # writes dist/
```

Node 20+, no dependencies. The build:

- copies `vendor/` and `web/assets/` (menu theme)
- copies `web/net.js`, `web/i18n.js`, `web/gamepad.js` and `web/ui.js` next to the game
- copies `content.js` with an asserted patch that gives the music engine a 0–1 volume control
- injects the supabase-js UMD build and the web scripts into `index.html`
- patches `game.js` so the classic controls talk to the room transport, maps relay errors to readable messages, and exposes `window.VoxelGame` for the web UI
- fails loudly if an upstream anchor has moved, instead of publishing a stale patch

`.github/workflows/pages.yml` runs that build on every push to `main` and publishes `dist/` to GitHub Pages, which serves xiondigital.net/voxelrage. `server.js`, screenshots and `.check` never end up in `dist/`.

## Architecture

| File | Contents |
|---|---|
| `index.html` | HUD, start menu, online panel, CSS |
| `game.js` | Three.js scene, characters, combat, waves, items, host simulation, menu |
| `content.js` | Districts, enemies, bosses, weapons, items, 30 waves, music sequencer |
| `server.js` | Original dependency-free static server and WebSocket relay |
| `vendor/three.module.js` | Three.js r160, MIT |
| `web/net.js` | Supabase room transport, invite links, connection status |
| `web/i18n.js` | DE/EN DOM translation and the menu language switches |
| `web/gamepad.js` | Controller polling, default beat-'em-up map, rebinding |
| `web/ui.js` | Pause menu, guide, HUD, 3D control configuration, sound, lobby extras |
| `web/assets/menu-theme.mp3` | Main menu theme |
| `web/build.mjs` | Build and patch pipeline |
| `.github/workflows/pages.yml` | GitHub Pages build and deployment |

`window.__voxel` remains the game's development handle. The web layer uses the smaller `window.VoxelGame` bridge (bindings, net state, pause helpers) added by the build.

## Limitations

- Online co-op is host-authoritative for two players. The guest interpolates host positions from roughly ten snapshots per second; there is no prediction. The host's browser must stay open for the session to continue.
- A room holds one host and one guest. There is no lobby list or matchmaking beyond sharing a code or link.
- Districts are procedural variations of one street with distinct palettes, landmarks and props, not ten hand-modelled levels.
- The donkey is a single attempt per map; once the rider is knocked off it runs away.
- The 3D control views need WebGL. If it is unavailable the rest of the game still runs; the 2D key lists stay usable.
- Music and effects are synthesized in real time, so the mix depends on the browser; the menu theme is a bundled audio file and may need one click before the browser allows playback.
- The HUD reads the local simulation state, so in online co-op the guest's health card mirrors the host's snapshots.

## Credits

Original game, design and art direction: [player529](https://github.com/player529/Jannitschar) — *Janitscharen / Voxel Rage*. This fork keeps that vision intact and adds the web hosting, online transport, controller support and interface work. Three.js is MIT licensed; see `vendor/three.module.js`.

Main menu theme: *Voxel Rage (Main Menu)*, bundled for this fork as `web/assets/menu-theme.mp3`.
