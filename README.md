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
- **Control layout diagrams.** A glowing outline gamepad and a full 75 % keyboard, both bound to the live key map: every bound key names its action, and the arrow cluster lights as the second movement axis. Click a key or button in the controls window to remap it.
- **A tabbed How to Play popup.** Keyboard, controller and game-rule tabs in one scrollable window, with voxel keycaps, a controller diagram and the food and weapon pickups as voxel sprites.
- **Language switch in the menus.** DE | EN sits in the main menu and in the pause menu, and the whole interface follows — the same easy switch Leap Buddies uses.
- **A real pause menu.** Resume, restart, controls, guide, display filter, sound, language and leave, in the same gel-and-glass skin as the rest of the interface.
- **Display filters.** A vignette slider plus CRT, watercolour and cinematic toggles, saved locally and reachable from the main menu and the pause menu.
- **A 1638 skin.** Cinzel headings, gel buttons with a glass sheen, rounded panels, Ottoman corner ornaments and a thin gold hairline — same colours as before, modernised.
- **A period street.** Covered ox carts with striped canvas in place of cars, market stalls, clay amphorae, sandstone fountain posts, fig baskets and lantern-lit wooden posts, on cobblestone instead of painted asphalt.
- **A voxel HUD.** A portrait rendered from the character's own head mesh, a pixel heart and an ECG health trace that colours, slows and flattens as health drops — plus a flame-marked special meter built to the same 15 px / 186 px grid that glows at full charge.
- **One comfortable layout for both players.** Each player — host, guest or a local second pad — uses the same bindings: WASD *and* the arrow keys to move, `Z` punch, `X` kick, `F` throw, `G` grab, `L` Ottoman Slap, `E` mount, `Space` jump, `Shift` run, `Esc` pause. `Z` and `X` also confirm and cancel inside every menu.
- **Sound controls and a menu theme.** A muted/volume pair in the menu and pause menu drives the looped menu track and the in-game soundtrack.

## Latest revision

This pass rebuilt the wordmark, the controls and the meters:

- **The wordmark is purple and gold again, and RAGE burns.** A blocky voxel slab with a hard stepped extrusion: VOXEL in a lit gold gradient with a wide ember halo, RAGE carrying a living fire gradient inside its own letters. The flame rises on a slow loop, an ember band flickers across the glyphs, and the only ornament is the Ottoman diamond-and-hairline rule underneath.
- **The meters are one system.** Health and special now share a fixed three-column grid — icon, bar, number — so the heart and the new voxel flame, both 15 px, sit at the same x and both bars run the same 186 px at the same height. The flame replaces the old star and reads at 52 px.
- **The gamepad is a real silhouette.** A wide shell with shoulders that cradle two slim triggers and two rounded bumpers (LT/LB, RT/RB), a raised bridge with the round home button, an asymmetric stick pair, a plus-shaped D-pad and a four-button diamond labelled with its action — one continuous gold hairline over a purple glass body, symmetric about its centre. Clicking any drawn element still binds it.
- **Both players share one layout.** WASD *and* the arrow keys move, `Z` punch, `X` kick, `F` throw, `G` grab, `L` Ottoman Slap, `E` mount, `Space` jump, `Shift` run, `Esc` pause. The layout is the same for host, guest and player two, and the keyboard diagram lights the arrow cluster as the second movement axis.
- **Menus answer to Z and X.** `Z` confirms (start the battle, resume the pause) and `X` cancels out of any window, alongside `Esc`.
- **Pause is shared, and says who did it.** In online co-op the round stops for both players and the pause panel names the side that paused it in small caps — including the case where you paused and your partner is waiting.
- **The HUD portrait is framed, not cropped.** The offscreen camera now leaves margin around the character's own head mesh, so the turban and the chin are both inside the 52 px frame.
- **Small fixes.** The on-screen key strip is gone (the guide covers it), the weapon chip is smaller, and the special hint no longer collides with the centre banner.

## Screenshots

Captured from the running game, not mock-ups.

### Interface

| | |
|---|---|
| ![Start menu](screenshots/menu.png) | ![In-game HUD](screenshots/hud.png) |
| Start menu with language and sound controls | HUD: sprite portrait, heart, ECG health and special meter |
| ![How to Play](screenshots/how-to-play.png) | ![Pause menu](screenshots/pause-menu.png) |
| How to Play: game rules, keycaps and item sprites | Pause menu with sound, guide, display and language |
| ![Keyboard guide](screenshots/controls-keyboard.png) | ![Controller guide](screenshots/controls-controller.png) |
| Keyboard diagram, arrows lit as the second movement axis | Controller diagram with the beat-'em-up layout |
| ![Display filters](screenshots/display-filters.png) | ![1638 street](screenshots/street-1638.png) |
| Display filters: vignette, CRT, watercolour, cinematic | Covered carts, market stalls and lanterns on cobblestone |

### Combat

| | |
|---|---|
| ![Street combat](screenshots/voxel-rage-fight.png) | ![Boss encounter](screenshots/voxel-rage-boss.png) |
| Street combat | Boss encounter |
| ![Ottoman Slap](screenshots/voxel-rage-special.png) | ![Online co-op](screenshots/online-koop.png) |
| The Ottoman Slap special | Online co-op |
| ![Donkey riding](screenshots/donkey-final2.png) | ![The 1638 street](screenshots/street-1638.png) |
| Riding a donkey | Covered carts and lanterns on the 1638 street |

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

Both players use the same, comfortable layout — each on their own keyboard. In local co-op on a single keyboard, remap player two in the controls window.

| Action | Key |
|---|---|
| Move | `W` `A` `S` `D` — the arrow keys always work too |
| Punch / use weapon / pick up | `Z` |
| Kick | `X` |
| Throw (while grabbing) | `F` |
| Special (Ottoman Slap / Superkick) | `L` |
| Jump / donkey hop | `Space` |
| Run (hold) | `Shift` |
| Grab / chain | `G` |
| Mount / dismount donkey | `E` |

`Z` confirms and `X` cancels inside the menus; `Esc` or `P` pauses, `M` toggles music, `R` restarts. Bindings are stored locally and shared with the host in online co-op.

### Controller (defaults)

Standard-mapping pads: Xbox-style, DualShock/DualSense, and most 8BitDo and generic pads.

| Action | Button |
|---|---|
| Move | Left stick or D-pad |
| Punch / pick up / fire | A (bottom) |
| Jump / donkey hop | B (right) |
| Kick | X (left) |
| Special | Y (top) |
| Throw (while grabbing) | LT |
| Grab / chain | LB |
| Mount | RB |
| Run (hold) | RT |
| Pause | Start |
| Restart | Back / View |

The pad translates into the game's own key bindings, so remapping a key also remaps the pad. Any standard-mapping pad is picked up the moment it is connected — no setup step.

### How to play

The start menu has a **How to play** button — the same idea as Leap Buddies' field guide. It opens a scrollable popup with three tabs:

- **Keyboard** — the full board, with every bound key lit gold and carrying its action name, the arrow cluster lit as the second movement axis, and a legend for movement and combat.
- **Controller** — the same layout as an outline pad: face buttons, D-pad, sticks, bumpers, triggers and the home button, each labelled with its action.
- **The game** — movement, combos, grab and throw, the donkey, food and weapons, with voxel sprites next to every pickup.

Every binding in the popup is live, so it follows a remap and the selected language. The guide is reachable from the main menu, the pause menu and the controls window.

### Remapping

Open **Set up controls** in the start menu, or **Controls** in the pause menu. The window has two tabs:

- **Controller** — a compact outline gamepad with a D-pad, two sticks, four face buttons labelled A / B / X / Y, both bumpers and both triggers. Pick an action on the right, then press a button on your pad, or click the drawn button directly.
- **Keyboard** — a full keyboard whose keys light gold when bound. Pick a player and an action, then press the key or click the keycap.

Bindings swap instead of duplicating, so no key is ever assigned twice. Pad layout is stored under `voxelrage-pad-v1`; keyboard bindings under `voxel-rage-bindings-v2`. Both are local to the browser.

### Display filters

**Display** in the main menu or the pause menu opens a small panel with a vignette slider and three toggles: CRT scanlines, a watercolour grain and a cinematic grade with letterbox bars. Settings apply immediately, also mid-run, and are stored under `voxel-rage-fx-v1`.

## Pause menu and language

`Esc` or `P` freezes the simulation, the snapshots and the music, and opens the pause menu:

- **Resume** — continue.
- **Restart** — reset the run.
- **Controls** — open the control configuration.
- **How to play** — open the guide.
- **Display** — vignette slider and the CRT, watercolour and cinematic filters.
- **Leave** — end the session and return to the menu.
- **Sound** — a speaker toggle and a volume slider under the buttons.
- **Language** — the same DE | EN switch as the main menu.

Pause is shared. In online co-op the host relays the stop, so both players wait, and the line under **Pause** names the side that stopped the round ("Player 2 paused — the round is held for both", or "You paused — the other player is waiting"). `Z` or `X` also leaves the menu, next to `Esc`.

The language choice is stored under `voxelrage-lang` and applies to the whole interface, including HUD updates and status messages, not just the menus.

## HUD

Each player card is a voxel panel with a small portrait of the chosen character — rendered offscreen from that character's own head mesh, not a drawing — next to the name and lives. Below it sit the two meters on one grid: a pixel heart beside the health bar, whose ECG trace colours, slows and flattens as health drops, and a voxel flame beside the special bar, which glows and runs a sheen when it is full.

The heartbeat inside the health bar is a scrolling ECG mask in the fill. Colour and pace follow health: green above 60 %, yellow in the middle, red below 30 %. As it drops, the trace slows, loses amplitude and flattens toward a flatline while the heart pulse slows with it; the numeric HP sits beside the bar.

The special meter follows the same grid — flame icon, 186 px shell, live number — and pulses with a light sheen once it is full, so the Ottoman Slap / Superkick is readable at a glance. Weapons show as a small chip under the bars.

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
| `web/ui.js` | Pause menu, guide, HUD, control diagrams, display filters, sound, lobby extras |
| `web/assets/menu-theme.mp3` | Main menu theme |
| `web/build.mjs` | Build and patch pipeline |
| `.github/workflows/pages.yml` | GitHub Pages build and deployment |

`window.__voxel` remains the game's development handle. The web layer uses the smaller `window.VoxelGame` bridge (bindings, net state, pause helpers) added by the build.

## Limitations

- Online co-op is host-authoritative for two players. The guest interpolates host positions from roughly ten snapshots per second; there is no prediction. The host's browser must stay open for the session to continue.
- A room holds one host and one guest. There is no lobby list or matchmaking beyond sharing a code or link.
- Districts are procedural variations of one street with distinct palettes, landmarks and props, not ten hand-modelled levels.
- The donkey is a single attempt per map; once the rider is knocked off it runs away.
- The control diagrams are SVG, so they need no WebGL and stay readable on every device.
- Music and effects are synthesized in real time, so the mix depends on the browser; the menu theme is a bundled audio file and may need one click before the browser allows playback.
- The HUD reads the local simulation state, so in online co-op the guest's health card mirrors the host's snapshots.

## Credits

Original game, design and art direction: [player529](https://github.com/player529/Jannitschar) — *Janitscharen / Voxel Rage*. This fork keeps that vision intact and adds the web hosting, online transport, controller support and interface work. Three.js is MIT licensed; see `vendor/three.module.js`.

Main menu theme: *Voxel Rage (Main Menu)*, bundled for this fork as `web/assets/menu-theme.mp3`.
