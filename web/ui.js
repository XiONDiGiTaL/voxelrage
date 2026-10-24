/* ui.js — the web edition's interface layer for VOXEL RAGE.
 *
 * Everything here is added on top of the game at runtime, so the game's
 * own files stay untouched (the same rule as net.js and i18n.js):
 *
 *   1. A real pause menu in the game's voxel/noir style, with resume,
 *      restart, controls, music, language and leave. The original
 *      overlay text is hidden, #pause still drives the game's own
 *      pause state.
 *   2. A controls window with two 3D guides built from voxels: a
 *      generic gamepad (no vendor branding) whose face buttons carry
 *      the beat-'em-up action names, and a keyboard whose keys light up
 *      with the current bindings. Both are clickable: pick an action,
 *      press a button/key, or click the 3D control directly.
 *   3. The DE | EN language switch in the main menu and the pause menu
 *      (mounted through VoxelI18n, so the whole game follows).
 *   4. Online lobby extras on top of net.js: invite link copy, a live
 *      connection pill, invite links that pre-fill the join code, and a
 *      clean "host left" exit instead of a frozen world.
 *
 * The game exposes the few internals this needs through window.VoxelGame
 * (written by web/build.mjs); without it this module simply does nothing,
 * so opening the repo's raw index.html still gives the plain game. */
(function (global) {
  'use strict';

  var SELF = (global.document && global.document.currentScript && global.document.currentScript.src) || '';
  var THREE = null;
  var booted = false;

  function bridge() { return global.VoxelGame || null; }

  /* ------------------------------ strings -------------------------------- */
  var TEXT = {
    de: {
      pause: 'PAUSE', resume: 'WEITERSPIELEN', restart: 'NEUSTART', controls: 'STEUERUNG',
      music: 'MUSIK', on: 'AN', off: 'AUS', leave: 'VERLASSEN', language: 'SPRACHE',
      pauseNote: 'ESC ODER P · WEITERSPIELEN    R · NEUSTART    M · MUSIK',
      controlsTitle: 'STEUERUNG', tabPad: 'CONTROLLER', tabKeys: 'TASTATUR',
      player1: 'SPIELER 1', player2: 'SPIELER 2', reset: 'STANDARD', done: 'FERTIG',
      hintPad: 'Aktion wählen, dann die Taste am Controller drücken — oder direkt auf den 3D-Button klicken.',
      hintKeys: 'Aktion wählen, dann die Taste drücken — oder direkt auf die 3D-Taste klicken.',
      drag: 'Ziehen zum Drehen', listening: 'Warte auf Eingabe …',
      padConnected: 'Controller verbunden', padNone: 'Kein Controller — anschließen und eine Taste drücken',
      padLabel: 'Controller', reserved: 'ist für Pause, Musik oder Neustart reserviert.',
      inviteCopy: 'EINLADUNGSLINK KOPIEREN', copied: 'Link kopiert — an den Partner senden.',
      noRoom: 'Erst einen Raum erstellen.', copyFail: 'Kopieren nicht möglich — Link aus der Adresszeile kopieren.',
      statusIdle: 'NICHT VERBUNDEN', statusHost: 'RAUM OFFEN', statusGuest: 'WARTE AUF HOST',
      statusReady: 'VERBUNDEN', statusLost: 'VERBINDUNG GETRENNT', statusReconnect: 'VERBINDE NEU …',
      inviteFound: 'Einladung erkannt — Code übernommen. Auf „Beitreten“ drücken.',
      hostLeft: 'DER HOST HAT DEN RAUM VERLASSEN',
      hostLeftBody: 'Die Sitzung ist beendet. Zurück ins Menü, um eine neue Runde zu starten.',
      toMenu: 'ZURÜCK ZUM MENÜ', guestLeft: 'Der Gast hat den Raum verlassen.',
      padToast: 'Controller verbunden', padGone: 'Controller getrennt',
      sound: 'SOUND', volume: 'LAUTSTÄRKE', soundOn: 'Ton an', soundOff: 'Ton aus',
      howTo: 'SO WIRD GESPIELT', setup: 'STEUERUNG EINRICHTEN',
      guideTitle: 'SO WIRD GESPIELT',
      guideLede: 'Alles, was du auf der Straße brauchst — Tasten, Kombos, Beute und Waffen.',
      gtabPlay: 'SPIELPRINZIP',
      guideKeys: 'Die Tastatur mit der aktuellen Belegung. Gold ist belegt — auf jeder Taste steht, was sie tut. WASD und die Pfeiltasten bewegen immer beide.',
      guideKeysNote: 'Beide Spieler nutzen dieselbe Belegung — jeder an seiner eigenen Tastatur. Lässt sich im Steuerungsfenster frei umlegen.',
      guidePad: 'Ein Standard-Gamepad (Xbox-, DualShock- oder 8BitDo-Layout). Anschließen, Stick bewegen, fertig.',
      guidePadNote: 'Das Pad folgt deinen Tastaturbelegungen: änderst du im Steuerungsfenster eine Taste, ändert sich das Pad mit.',
      clickBind: 'Taste oder Button anklicken zum Belegen',
      pickFirst: 'Wähle zuerst rechts eine Aktion.',
      guideClose: 'VERSTANDEN',
      gMove: 'BEWEGUNG', gCombat: 'KAMPF', gGrabTitle: 'GREIFEN &amp; WERFEN', gDonkey: 'DER ESEL',
      gFood: 'VERPFLEGUNG', gWeapons: 'WAFFEN',
      gWalk: 'Laufen', gWalkD: 'Seitwärts und in die Tiefe; der Gehweg ist begehbar.',
      gRun: 'Rennen', gRunD: 'Taste halten — nach 0,85 s läuft die Figur von selbst.',
      gJump: 'Sprung', gJumpD: 'In der Luft + Schlag wird zum Sprungangriff.',
      gPunch: 'Schlagkette', gPunchD: 'Fünf Schläge in Folge; der fünfte ist der Finisher.',
      gKick: 'Trittkette', gKickD: 'Drei Tritte in Folge; der dritte ist der Roundhouse-Finisher.',
      gSpecial: 'Osmanische Schelle', gSpecialD: 'Spezial bei vollem Balken — trifft mehrere Gegner.',
      gGrab: 'Greifen', gGrabD: 'Am Kragen packen oder mit der Kette heranziehen.',
      gThrow: 'Werfen', gThrowD: 'Im Griff mit Schlag werfen — trifft weitere Gegner.',
      gMount: 'Aufsteigen', gMountD: 'Beim Esel drücken; erneut drücken steigt ab.',
      gHop: 'Hüpfen', gHopD: 'Sprung im Sattel — in der Luft steuerbar.',
      gFront: 'Fronttritt', gFrontD: 'Schlag im Sattel: 18 Schaden.',
      gSpin: 'Drehtritt', gSpinD: 'Kick im Sattel: 24 Schaden, trifft auch hinter dir.',
      gSuper: 'Superkick', gSuperD: 'Spezial bei vollem Balken: 46 Schaden.',
      gFoodD: 'Mit der Schlag-Taste in Reichweite aufnehmen.',
      gWeaponsD: 'Waffen liegen auf der Straße; Schlag-Taste halten feuert automatisch.',
      wPistol: 'PISTOLE', wRifle: 'GEWEHR', wBazooka: 'BAZOOKA', wBat: 'SCHLÄGER',
      wKnuckle: 'SCHLAGRING', wKusarigama: 'KUSARIGAMA',
      wPistolD: '12 Schuss', wRifleD: '8 Schuss · durchschlägt', wBazookaD: '3 Schuss · Fläche',
      wBatD: '14 Treffer', wKnuckleD: '22 Treffer · schnell', wKusarigamaD: '10 Treffer · zieht heran',
      iDoner: 'DÖNER', iDonerD: '+40 Leben', iAyran: 'AYRAN', iAyranD: '+15 Leben',
      iGold: 'GOLD', iGoldD: '+50 Punkte', hpShort: 'LEBEN',
      act: {
        punch: 'SCHLAG', kick: 'KICK', special: 'SCHELLE', jump: 'SPRUNG', sprint: 'RENNEN',
        grapple: 'GREIFEN', mount: 'ESEL', throw: 'WERFEN', pause: 'PAUSE', restart: 'NEUSTART',
        left: 'LINKS', right: 'RECHTS', up: 'HOCH', down: 'RUNTER',
      },
      pauseByYou: 'DU HAST PAUSIERT — DER ANDERE SPIELER WARTET',
      pauseByP1: 'SPIELER 1 HAT PAUSIERT — DIE RUNDE STEHT FÜR BEIDE',
      pauseByP2: 'SPIELER 2 HAT PAUSIERT — DIE RUNDE STEHT FÜR BEIDE',
      pauseSolo: 'DIE RUNDE STEHT',
      keysPitch: 'Tasten gelten für den gewählten Spieler und werden wie im Spiel lokal gespeichert.',
      padPitch: 'Der Controller steuert den lokalen Spieler und folgt automatisch deiner Tastenbelegung.',
      display: 'BILDSCHIRM', displayTitle: 'BILDSCHIRM-FILTER',
      fxVignette: 'VIGNETTE', fxCRT: 'CRT-RÖHRE', fxWatercolor: 'AQUARELL',
      fxCinematic: 'KINOFILM', fxNote: 'Lokal gespeichert und sofort sichtbar.',
      fxHint: 'Vignette dunkelt die Ränder ab; die Schalter legen Filmkorn, Zeilen und Farbstich über die Straße.',
    },
    en: {
      pause: 'PAUSE', resume: 'RESUME', restart: 'RESTART', controls: 'CONTROLS',
      music: 'MUSIC', on: 'ON', off: 'OFF', leave: 'LEAVE', language: 'LANGUAGE',
      pauseNote: 'ESC OR P · RESUME    R · RESTART    M · MUSIC',
      controlsTitle: 'CONTROLS', tabPad: 'CONTROLLER', tabKeys: 'KEYBOARD',
      player1: 'PLAYER 1', player2: 'PLAYER 2', reset: 'DEFAULTS', done: 'DONE',
      hintPad: 'Pick an action, then press a controller button — or click the 3D button directly.',
      hintKeys: 'Pick an action, then press the key — or click the 3D key directly.',
      drag: 'drag to rotate', listening: 'waiting for input …',
      padConnected: 'Controller connected', padNone: 'No controller — plug one in and press a button',
      padLabel: 'Controller', reserved: 'is reserved for pause, music or restart.',
      inviteCopy: 'COPY INVITE LINK', copied: 'Link copied — send it to your partner.',
      noRoom: 'Create a room first.', copyFail: 'Copy blocked — copy the link from the address bar.',
      statusIdle: 'NOT CONNECTED', statusHost: 'ROOM OPEN', statusGuest: 'WAITING FOR HOST',
      statusReady: 'CONNECTED', statusLost: 'CONNECTION LOST', statusReconnect: 'RECONNECTING …',
      inviteFound: 'Invite detected — code filled in. Press “Join”.',
      hostLeft: 'THE HOST LEFT THE ROOM',
      hostLeftBody: 'The session ended. Go back to the menu to start a new run.',
      toMenu: 'BACK TO MENU', guestLeft: 'Your partner left the room.',
      padToast: 'Controller connected', padGone: 'Controller disconnected',
      sound: 'SOUND', volume: 'VOLUME', soundOn: 'Sound on', soundOff: 'Sound off',
      howTo: 'HOW TO PLAY', setup: 'SET UP CONTROLS',
      guideTitle: 'HOW TO PLAY',
      guideLede: 'Everything you need on the street — keys, combos, loot and weapons.',
      gtabPlay: 'THE GAME',
      guideKeys: 'The keyboard with your current bindings. Gold is bound — every key names what it does. WASD and the arrow keys always move.',
      guideKeysNote: 'Both players use the same layout — each on their own keyboard. Remap anything in the controls window.',
      guidePad: 'A standard gamepad (Xbox, DualShock or 8BitDo layout). Plug it in, move a stick and it works.',
      guidePadNote: 'The pad follows your key bindings: change a key in the controls window and the pad changes with it.',
      clickBind: 'Click a key or button to bind',
      pickFirst: 'Pick an action on the right first.',
      guideClose: 'GOT IT',
      gMove: 'MOVEMENT', gCombat: 'COMBAT', gGrabTitle: 'GRAB &amp; THROW', gDonkey: 'THE DONKEY',
      gFood: 'FOOD', gWeapons: 'WEAPONS',
      gWalk: 'Walk', gWalkD: 'Sideways and into depth; the sidewalk is walkable.',
      gRun: 'Run', gRunD: 'Hold — after 0.85 s the character runs on its own.',
      gJump: 'Jump', gJumpD: 'In the air + punch becomes a dive attack.',
      gPunch: 'Punch chain', gPunchD: 'Five punches in a row; the fifth is the finisher.',
      gKick: 'Kick chain', gKickD: 'Three kicks in a row; the third is the roundhouse finisher.',
      gSpecial: 'Ottoman Slap', gSpecialD: 'Special with a full meter — hits several enemies.',
      gGrab: 'Grab', gGrabD: 'Seize by the collar, or pull distant targets in with the chain.',
      gThrow: 'Throw', gThrowD: 'While holding, punch to throw — hits other enemies too.',
      gMount: 'Mount', gMountD: 'Press at the donkey; press again to dismount.',
      gHop: 'Hop', gHopD: 'Jump in the saddle — steerable in the air.',
      gFront: 'Front kick', gFrontD: 'Punch while mounted: 18 damage.',
      gSpin: 'Spin kick', gSpinD: 'Kick while mounted: 24 damage, also hits behind you.',
      gSuper: 'Superkick', gSuperD: 'Special with a full meter: 46 damage.',
      gFoodD: 'Pick up with the punch key when in reach.',
      gWeaponsD: 'Weapons lie on the street; hold the punch key to fire automatically.',
      wPistol: 'PISTOL', wRifle: 'RIFLE', wBazooka: 'BAZOOKA', wBat: 'BASEBALL BAT',
      wKnuckle: 'KNUCKLEDUSTER', wKusarigama: 'KUSARIGAMA',
      wPistolD: '12 shots', wRifleD: '8 shots · pierces', wBazookaD: '3 shots · splash',
      wBatD: '14 hits', wKnuckleD: '22 hits · fast', wKusarigamaD: '10 hits · pulls in',
      iDoner: 'DONER', iDonerD: '+40 health', iAyran: 'AYRAN', iAyranD: '+15 health',
      iGold: 'GOLD', iGoldD: '+50 points', hpShort: 'HEALTH',
      act: {
        punch: 'PUNCH', kick: 'KICK', special: 'SLAP', jump: 'JUMP', sprint: 'RUN',
        grapple: 'GRAB', mount: 'DONKEY', throw: 'THROW', pause: 'PAUSE', restart: 'RESTART',
        left: 'LEFT', right: 'RIGHT', up: 'UP', down: 'DOWN',
      },
      pauseByYou: 'YOU PAUSED — THE OTHER PLAYER IS WAITING',
      pauseByP1: 'PLAYER 1 PAUSED — THE ROUND IS HELD FOR BOTH',
      pauseByP2: 'PLAYER 2 PAUSED — THE ROUND IS HELD FOR BOTH',
      pauseSolo: 'THE ROUND IS HELD',
      keysPitch: 'Keys apply to the chosen player and are stored locally, exactly like in-game.',
      padPitch: 'The controller drives the local player and follows your key bindings automatically.',
      display: 'DISPLAY', displayTitle: 'DISPLAY FILTER',
      fxVignette: 'VIGNETTE', fxCRT: 'CRT SCREEN', fxWatercolor: 'WATERCOLOUR',
      fxCinematic: 'CINEMATIC', fxNote: 'Saved locally and applied instantly.',
      fxHint: 'The vignette darkens the edges; the switches lay film grain, scanlines and a colour grade over the street.',
    },
  };
  function lang() { return global.VoxelI18n ? global.VoxelI18n.getLang() : 'de'; }
  function T(key) {
    var d = TEXT[lang()] || TEXT.de;
    if (key.indexOf('act.') === 0) return (d.act && d.act[key.slice(4)]) || key.slice(4).toUpperCase();
    return d[key] != null ? d[key] : (TEXT.de[key] != null ? TEXT.de[key] : key);
  }

  /* ------------------------------- styles -------------------------------- */
  var CSS = [
    '.vr-hidden{display:none!important}',
    '#bindToggle,#bindPanel,.bindbar{display:none!important}',
    '#pause>div:not(.vr-pause-wrap){display:none!important}',
    '#pause{pointer-events:auto;background:rgba(8,5,14,.78)!important;display:none;align-items:center;justify-content:center}',
    '#pause.on{display:flex!important}',
    /* menu language bar */
    /* safe centering: when the menu is taller than the viewport it starts at
       the top and scrolls, instead of overflowing above the screen */
    '#menu{align-items:safe center}',
    '.vr-menubar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px}',
    '.vr-menubar .kicker{margin-bottom:0}',
    /* buttons shared with the game's look */
    '.vr-btn{font:inherit;font-size:10.5px;letter-spacing:.2em;text-transform:uppercase;color:#c9c0e6;' +
      'background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.18);border-radius:3px;' +
      'padding:10px 14px;cursor:pointer;transition:all .15s;font-family:inherit}',
    '.vr-btn:hover{border-color:rgba(255,215,110,.65);color:#fff;background:rgba(255,215,110,.08)}',
    '.vr-btn.primary{background:linear-gradient(180deg,#ffd76e,#d9a04a);color:#241a10;border:none;font-weight:700}',
    '.vr-btn.primary:hover{filter:brightness(1.08)}',
    '.vr-btn.danger{color:#ff9bab;border-color:rgba(255,95,109,.45)}',
    '.vr-btn.danger:hover{border-color:#ff5f6d;color:#ffd0d6;background:rgba(255,47,109,.12)}',
    '.vr-btn.small{font-size:9px;padding:7px 9px;letter-spacing:.14em}',
    /* pause menu */
    '.vr-pause-wrap{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:22px;overflow:auto}',
    '.vr-pause-panel{width:min(560px,100%);background:rgba(12,8,20,.94);border:1px solid rgba(255,255,255,.16);' +
      'border-radius:5px;padding:22px 24px 20px;box-shadow:0 24px 70px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.06);' +
      'position:relative;text-align:left}',
    '.vr-pause-panel:before{content:"";position:absolute;left:0;right:0;top:0;height:2px;' +
      'background:linear-gradient(90deg,#ff2f6d,#ffd76e,#6be0ff);opacity:.85}',
    '.vr-kicker{font-size:9px;letter-spacing:.36em;color:#6be0ff;text-transform:uppercase}',
    '.vr-pause-title{font-size:44px;letter-spacing:.26em;font-weight:800;color:#ffd76e;line-height:1;margin:6px 0 6px;' +
      'text-shadow:0 0 30px rgba(255,200,90,.5),0 4px 0 rgba(0,0,0,.45)}',
    '.vr-pause-sub{font-size:10.5px;letter-spacing:.16em;color:#b3a9d6;line-height:1.7;min-height:15px}',
    '.vr-pause-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:18px}',
    '@media(max-width:560px){.vr-pause-grid{grid-template-columns:1fr}.vr-pause-title{font-size:32px}}',
    '.vr-pause-grid .vr-btn{text-align:left;padding:12px 14px;display:flex;align-items:center;gap:9px}',
    '.vr-pause-grid .vr-btn .ic{font-size:13px;opacity:.85;width:16px;text-align:center}',
    '.vr-pause-grid .vr-btn.wide{grid-column:1/-1}',
    '.vr-pause-lang{display:flex;align-items:center;justify-content:space-between;gap:10px;grid-column:1/-1;' +
      'border:1px solid rgba(255,255,255,.1);border-radius:3px;padding:8px 10px;background:rgba(255,255,255,.03)}',
    '.vr-pause-lang span.vr-langlabel{font-size:9.5px;letter-spacing:.22em;color:#8f86b8;text-transform:uppercase}',
    '.vr-pause-note{margin-top:14px;font-size:9px;letter-spacing:.16em;color:#7f76a6;line-height:1.8}',
    /* modal */
    '.vr-modal{position:fixed;inset:0;z-index:70;display:flex;align-items:center;justify-content:center;padding:18px;' +
      'background:rgba(6,4,12,.82);overflow:auto}',
    '.vr-modal[hidden]{display:none}',
    '.vr-sheet{width:min(1060px,100%);background:rgba(12,8,20,.97);border:1px solid rgba(255,255,255,.16);' +
      'border-radius:6px;box-shadow:0 30px 90px rgba(0,0,0,.7);position:relative;display:flex;flex-direction:column;max-height:94vh}',
    '.vr-sheet:before{content:"";position:absolute;left:0;right:0;top:0;height:2px;' +
      'background:linear-gradient(90deg,#ff2f6d,#ffd76e,#6be0ff);opacity:.85}',
    '.vr-sheet-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:18px 20px 12px}',
    '.vr-sheet-head h2{margin:3px 0 0;font-size:26px;letter-spacing:.2em;color:#fff;font-weight:800}',
    '.vr-head-right{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end}',
    '.vr-x{font:inherit;font-size:13px;color:#c9c0e6;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.18);' +
      'border-radius:3px;width:30px;height:28px;cursor:pointer;line-height:1}',
    '.vr-x:hover{border-color:#ff5f6d;color:#fff}',
    '.vr-tabs{display:flex;gap:6px;padding:0 20px 12px;border-bottom:1px solid rgba(255,255,255,.1)}',
    '.vr-tab{font:inherit;font-size:10.5px;letter-spacing:.2em;text-transform:uppercase;color:#8f86b8;' +
      'background:transparent;border:1px solid rgba(255,255,255,.16);border-radius:3px;padding:9px 14px;cursor:pointer}',
    '.vr-tab:hover{color:#fff;border-color:rgba(255,215,110,.6)}',
    '.vr-tab.on{background:rgba(255,215,110,.14);border-color:#ffd76e;color:#ffd76e}',
    '.vr-body{display:grid;grid-template-columns:1.25fr .95fr;gap:16px;padding:16px 20px;overflow:auto}',
    '@media(max-width:880px){.vr-body{grid-template-columns:1fr}}',
    '.vr-stage{position:relative;min-height:300px;background:radial-gradient(ellipse at 50% 42%,rgba(70,40,90,.55),rgba(8,5,14,.85) 72%);' +
      'border:1px solid rgba(255,255,255,.12);border-radius:5px;overflow:hidden}',
    '.vr-stage canvas{display:block;width:100%;height:320px;touch-action:none;cursor:grab}',
    '.vr-stage .vr-stagehint{position:absolute;left:10px;bottom:8px;font-size:8.5px;letter-spacing:.18em;color:#8f86b8;' +
      'text-transform:uppercase;pointer-events:none}',
    '.vr-side{display:flex;flex-direction:column;min-height:0}',
    '.vr-side-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}',
    '.vr-seg{display:flex;gap:5px}',
    '.vr-seg button{font:inherit;font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:#8f86b8;' +
      'background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.16);border-radius:3px;padding:6px 9px;cursor:pointer}',
    '.vr-seg button.on{color:#241a10;background:linear-gradient(180deg,#ffd76e,#d9a04a);border-color:transparent;font-weight:700}',
    '.vr-list{overflow:auto;max-height:340px;border:1px solid rgba(255,255,255,.1);border-radius:4px;background:rgba(0,0,0,.28)}',
    '.vr-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:7px 10px;cursor:pointer;' +
      'border-bottom:1px solid rgba(255,255,255,.05);font-size:10.5px;letter-spacing:.1em;color:#c9c0e6}',
    '.vr-row:last-child{border-bottom:none}',
    '.vr-row:hover{background:rgba(255,215,110,.07);color:#fff}',
    '.vr-row.listening{background:rgba(107,224,255,.1);color:#bffcff}',
    '.vr-row .vr-row-label{text-transform:uppercase;letter-spacing:.16em}',
    '.vr-row .vr-key{font:inherit;font-size:9.5px;letter-spacing:.12em;min-width:88px;text-align:center;padding:5px 7px;' +
      'border:1px solid rgba(255,255,255,.2);border-radius:3px;background:rgba(255,255,255,.06);color:#e6dfff}',
    '.vr-row.listening .vr-key{border-color:#6be0ff;color:#bffcff;box-shadow:0 0 12px rgba(107,224,255,.35)}',
    '.vr-fixed{margin-top:8px;font-size:8.5px;letter-spacing:.12em;color:#7f76a6;line-height:1.8}',
    '.vr-sheet-foot{display:flex;align-items:center;gap:10px;padding:12px 20px 16px;border-top:1px solid rgba(255,255,255,.1);flex-wrap:wrap}',
    '.vr-sheet-foot .vr-note{flex:1;font-size:8.5px;letter-spacing:.1em;color:#7f76a6;line-height:1.7}',
    /* online extras */
    '.vr-online-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:8px}',
    '.vr-online-row .vr-copymsg{font-size:8.5px;letter-spacing:.1em;color:#8f86b8}',
    '.vr-netstate{display:flex;align-items:center;gap:7px;margin-top:9px;font-size:9px;letter-spacing:.18em;' +
      'text-transform:uppercase;color:#8f86b8}',
    '.vr-netstate i{width:7px;height:7px;border-radius:50%;background:#5a527a;box-shadow:0 0 8px rgba(90,82,122,.6)}',
    '.vr-netstate.ok i{background:#6be0ff;box-shadow:0 0 10px rgba(107,224,255,.8)}',
    '.vr-netstate.wait i{background:#ffd76e;box-shadow:0 0 10px rgba(255,215,110,.8);animation:vrPulse 1.1s ease-in-out infinite}',
    '.vr-netstate.bad i{background:#ff5f6d;box-shadow:0 0 10px rgba(255,95,109,.8)}',
    '@keyframes vrPulse{50%{opacity:.45}}',
    '.vr-toast{position:fixed;left:50%;bottom:64px;transform:translateX(-50%);z-index:80;background:rgba(10,7,18,.92);' +
      'border:1px solid rgba(107,224,255,.45);border-radius:3px;padding:8px 14px;font-size:10px;letter-spacing:.18em;' +
      'text-transform:uppercase;color:#8fe8ff;opacity:0;transition:opacity .2s;pointer-events:none}',
    '.vr-toast.on{opacity:1}',

    /* ------------------------- HUD: voxel hero cards ------------------------ */
    '#players .panel{position:relative;border-radius:6px;padding:9px 11px 10px;' +
      'background:linear-gradient(180deg,rgba(18,12,28,.94),rgba(9,6,16,.88));' +
      'border:1px solid rgba(255,255,255,.13);' +
      'box-shadow:0 8px 24px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.05)}',
    '#players .panel:before{content:"";position:absolute;left:0;top:0;bottom:0;width:2px;border-radius:6px 0 0 6px;' +
      'background:linear-gradient(180deg,#ffd76e,rgba(255,215,110,0));opacity:.75}',
    '#p2Panel:before{background:linear-gradient(180deg,#6be0ff,rgba(107,224,255,0))!important}',
    '.vr-hero{display:flex;gap:9px;align-items:center;margin-bottom:8px}',
    '.vr-portrait{width:52px;height:52px;flex:0 0 auto;padding:0;border:1px solid rgba(255,255,255,.18);' +
      'border-radius:4px;overflow:hidden;background:#120d1c;box-shadow:0 0 0 1px rgba(0,0,0,.5),0 4px 12px rgba(0,0,0,.45)}',
    '.vr-portrait svg,.vr-portrait img{display:block;width:100%;height:100%;image-rendering:pixelated}',
    '.vr-portrait img{object-fit:cover}',
    '.vr-hero-meta{min-width:0;flex:1}',
    '.vr-hero-meta .label{margin-bottom:2px;font-size:8.5px;letter-spacing:.26em}',
    '.vr-hero-meta #pName,.vr-hero-meta #p2Name{margin-bottom:2px;font-size:13px}',
    /* Both meters share one grid: icon, bar, number — so heart and flame,
       bar length and height line up exactly. */
    '.vr-hprow{display:grid;grid-template-columns:15px minmax(0,1fr) 24px;gap:6px;align-items:center;margin:1px 0 2px}',
    '.vr-heart{width:15px;height:15px;flex:0 0 auto;color:var(--ecg,#9dff6b);' +
      'filter:drop-shadow(0 0 6px var(--ecg,#9dff6b));animation:vrBeat var(--beat,1s) ease-in-out infinite}',
    '.vr-heart svg{display:block;width:100%;height:100%}',
    '.vr-hp{position:relative;width:100%;height:14px;padding:2px;border-radius:999px;overflow:hidden;' +
      'border:1px solid rgba(255,255,255,.26);background:rgba(0,0,0,.6);' +
      'box-shadow:inset 0 2px 6px rgba(0,0,0,.65)}',
    '.vr-hp>i{display:block;height:100%;border-radius:2px;' +
      'background:linear-gradient(90deg,var(--ecg-dark,#d9a04a),var(--ecg,#ffd76e))!important;' +
      'box-shadow:0 0 10px var(--ecg-glow,rgba(255,200,90,.55))!important;' +
      'transition:width .14s linear,background .3s}',
    '.vr-ecg{position:absolute;inset:2px;pointer-events:none;opacity:.85;mix-blend-mode:screen;' +
      'background-color:var(--ecg,#9dff6b);transform:scaleY(var(--ecg-amp,.9));transform-origin:center;' +
      '-webkit-mask-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 120 30\'%3E%3Cpath d=\'M0 15 H26 L33 15 L38 6 L44 25 L50 15 H72 L78 11 L84 19 L90 15 H120\' fill=\'none\' stroke=\'%23fff\' stroke-width=\'2.2\' stroke-linejoin=\'round\'/%3E%3C/svg%3E");' +
      'mask-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 120 30\'%3E%3Cpath d=\'M0 15 H26 L33 15 L38 6 L44 25 L50 15 H72 L78 11 L84 19 L90 15 H120\' fill=\'none\' stroke=\'%23fff\' stroke-width=\'2.2\' stroke-linejoin=\'round\'/%3E%3C/svg%3E");' +
      '-webkit-mask-size:120px 100%;mask-size:120px 100%;-webkit-mask-repeat:repeat-x;mask-repeat:repeat-x;' +
      'animation:vrEcg var(--ecg-dur,2.2s) linear infinite}',
    '.vr-hpnum{font-size:9px;letter-spacing:.1em;color:var(--ecg,#9dff6b);min-width:22px;text-align:right;' +
      'font-variant-numeric:tabular-nums}',
    '@keyframes vrBeat{0%,100%{transform:scale(1)}12%{transform:scale(1.18)}24%{transform:scale(1)}36%{transform:scale(1.08)}48%{transform:scale(1)}}',
    '@keyframes vrEcg{from{-webkit-mask-position:0 50%;mask-position:0 50%}to{-webkit-mask-position:120px 50%;mask-position:120px 50%}}',
    '#players .panel.vr-low .vr-hp{border-color:rgba(255,95,109,.75);box-shadow:inset 0 2px 6px rgba(0,0,0,.65),0 0 14px rgba(255,95,109,.3)}',
    '#players .panel.vr-down .vr-portrait{filter:grayscale(.85) brightness(.7)}',
    '#players .panel.vr-down .vr-hpnum{color:#ff5f6d}',
    '.vr-meterrow{margin-top:5px}',
    '.vr-energyicon{width:15px;height:15px;flex:0 0 auto;color:#6be0ff;' +
      'filter:drop-shadow(0 0 6px rgba(107,224,255,.7))}',
    '.vr-energyicon svg{display:block;width:100%;height:100%}',
    '.vr-energynum{font-size:9px;letter-spacing:.1em;color:#6be0ff;min-width:22px;text-align:right;' +
      'font-variant-numeric:tabular-nums}',
    '.vr-meter{position:relative;width:100%;height:14px!important;padding:2px;border-radius:999px;overflow:hidden;' +
      'border:1px solid rgba(107,224,255,.4)!important;background:rgba(0,0,0,.6)!important;' +
      'box-shadow:inset 0 2px 6px rgba(0,0,0,.65)!important}',
    '.vr-meter>i{border-radius:999px!important}',
    '.vr-meter>i{border-radius:2px;background:linear-gradient(90deg,#3f9fd0,#6be0ff 45%,#9b6bff)!important;' +
      'box-shadow:0 0 12px rgba(107,224,255,.55)!important}',
    '.vr-meter.ready{border-color:#6be0ff!important;animation:vrMeterPulse 1.3s ease-in-out infinite}',
    '.vr-meter.ready>i{background:linear-gradient(90deg,#6be0ff,#bffcff,#9b6bff,#6be0ff)!important;background-size:220% 100%!important;' +
      'animation:vrSheen 1.8s linear infinite}',
    '.vr-meter .vr-sheen{position:absolute;inset:0;pointer-events:none;opacity:0;' +
      'background:linear-gradient(100deg,transparent 20%,rgba(255,255,255,.55) 46%,transparent 62%);background-size:220% 100%}',
    '.vr-meter.ready .vr-sheen{opacity:.7;animation:vrSheen 1.8s linear infinite}',
    '@keyframes vrSheen{from{background-position:180% 0}to{background-position:-80% 0}}',
    '@keyframes vrMeterPulse{50%{box-shadow:0 0 18px rgba(107,224,255,.65),inset 0 0 10px rgba(107,224,255,.35)}}',
    '.vr-weapon{font-size:8px!important;letter-spacing:.12em;padding:2px 5px;border-radius:3px;' +
      'background:rgba(107,224,255,.07);border:1px solid rgba(107,224,255,.18);display:inline-block;align-self:flex-start}',
    '#specialHint,#hint{display:none!important}',
    '#p1Lives,#p2Lives{font-size:10.5px;letter-spacing:.14em}',
    '.panel#stats{border-radius:6px;background:linear-gradient(180deg,rgba(18,12,28,.94),rgba(9,6,16,.88));' +
      'border:1px solid rgba(255,255,255,.13);box-shadow:0 8px 24px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.05)}',
    '#centerTop{border-radius:6px;border-color:rgba(255,255,255,.14);' +
      'background:linear-gradient(180deg,rgba(18,12,28,.92),rgba(9,6,16,.86));box-shadow:0 10px 26px rgba(0,0,0,.35)}',
    '#hint{border-radius:5px;background:rgba(10,7,18,.62);border-color:rgba(255,255,255,.12)}',
    '#stats .big{text-shadow:0 0 18px rgba(255,215,110,.4)}',

    /* ------------------------- menu: guide + chips ------------------------- */
    '#menu .card{background:linear-gradient(180deg,rgba(18,12,28,.92),rgba(9,6,16,.88));' +
      'border:1px solid rgba(255,255,255,.13);border-radius:6px;box-shadow:0 12px 34px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.05)}',
    '#controlsHelp b{display:inline-block;min-width:17px;text-align:center;padding:1px 5px;margin:0 1px;' +
      'border:1px solid rgba(255,255,255,.24);border-bottom-width:2px;border-radius:3px;' +
      'background:linear-gradient(180deg,rgba(255,255,255,.12),rgba(255,255,255,.03));' +
      'color:#ffe9b0;font-size:9px;font-weight:700;box-shadow:0 1px 0 rgba(0,0,0,.45)}',
    '.vr-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px}',
    '.vr-actions .vr-copymsg{font-size:8.5px;letter-spacing:.1em;color:#8f86b8}',
    '.vr-itemgrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:8px 0 4px}',
    '.vr-itemgrid.vr-weapons{grid-template-columns:repeat(2,minmax(0,1fr))}',
    '.vr-item{display:flex;gap:7px;align-items:center;padding:6px 8px;border:1px solid rgba(255,255,255,.1);' +
      'border-radius:4px;background:rgba(255,255,255,.03);min-width:0}',
    '.vr-item svg{width:22px;height:22px;flex:0 0 auto}',
    '.vr-item .vr-itemtxt{min-width:0}',
    '.vr-item b{display:block;font-size:8.5px;letter-spacing:.12em;color:#ffd76e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.vr-item span{display:block;font-size:8px;color:#b3a9d6;letter-spacing:.04em;margin-top:1px}',

    /* ------------------------------ guide modal ---------------------------- */
    '.vr-guide-sheet{width:min(900px,100%)}',
    '.vr-guide-body{padding:14px 20px 6px;overflow:auto}',
    '.vr-guide-lede{font-size:10.5px;letter-spacing:.1em;color:#b3a9d6;line-height:1.9;margin:0 0 14px}',
    '.vr-guide-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px 16px}',
    '@media(max-width:760px){.vr-guide-grid{grid-template-columns:1fr}}',
    '.vr-gsec{border:1px solid rgba(255,255,255,.1);border-radius:5px;padding:10px 12px 8px;background:rgba(255,255,255,.025)}',
    '.vr-gsec h3{margin:0 0 8px;font-size:9.5px;letter-spacing:.3em;color:#ffd76e;font-weight:700}',
    '.vr-grow{display:flex;gap:9px;align-items:flex-start;padding:5px 0;border-top:1px solid rgba(255,255,255,.05)}',
    '.vr-grow:first-of-type{border-top:none}',
    '.vr-gicon{width:24px;height:24px;flex:0 0 auto;margin-top:1px}',
    '.vr-gicon svg{width:100%;height:100%;display:block}',
    '.vr-gtext{min-width:0;font-size:9.5px;line-height:1.65;color:#b3a9d6;letter-spacing:.04em}',
    '.vr-gtext b{color:#fff;font-size:10px;letter-spacing:.08em;display:block;margin-bottom:1px}',
    '.vr-caps{display:inline-flex;gap:3px;flex-wrap:wrap;margin-bottom:3px}',
    '.vr-cap{display:inline-block;min-width:16px;text-align:center;padding:1px 5px;border:1px solid rgba(255,255,255,.22);' +
      'border-bottom-width:2px;border-radius:3px;background:linear-gradient(180deg,rgba(255,255,255,.12),rgba(255,255,255,.03));' +
      'color:#ffe9b0;font-size:8.5px;font-weight:700;letter-spacing:.06em}',
    '.vr-cap.p2{border-color:rgba(107,224,255,.35);color:#bffcff}',
    '.vr-capgrp{display:inline-flex;gap:3px;align-items:center}',
    '.vr-capgrp .vr-caplabel{font-size:7.5px;letter-spacing:.14em;color:#7f76a6;margin-right:2px}',

    /* ------------------------------- sound UI ------------------------------ */
    '.vr-sound{display:flex;align-items:center;gap:7px;flex-wrap:wrap}',
    '.vr-sound-toggle{font:inherit;font-size:12px;line-height:1;width:30px;height:28px;cursor:pointer;' +
      'border:1px solid rgba(255,255,255,.2);border-radius:3px;background:rgba(255,255,255,.05);color:#c9c0e6}',
    '.vr-sound-toggle:hover{border-color:#ffd76e;color:#fff}',
    '.vr-sound-toggle.off{color:#7f76a6}',
    '.vr-range{-webkit-appearance:none;appearance:none;width:96px;height:4px;border-radius:2px;cursor:pointer;' +
      'background:linear-gradient(90deg,#ffd76e,var(--vr-vol,#ffd76e)) no-repeat rgba(255,255,255,.14);' +
      'background-size:var(--vr-volpct,70%) 100%}',
    '.vr-range::-webkit-slider-thumb{-webkit-appearance:none;width:11px;height:11px;border-radius:50%;' +
      'background:#ffd76e;box-shadow:0 0 8px rgba(255,215,110,.6);border:1px solid #241a10;cursor:pointer}',
    '.vr-range::-moz-range-thumb{width:11px;height:11px;border-radius:50%;background:#ffd76e;' +
      'box-shadow:0 0 8px rgba(255,215,110,.6);border:1px solid #241a10;cursor:pointer}',
    '.vr-volnum{font-size:8.5px;letter-spacing:.1em;color:#8f86b8;min-width:24px;text-align:right}',
    '.vr-soundrow{grid-column:1/-1;display:flex;align-items:center;gap:9px;border:1px solid rgba(255,255,255,.1);' +
      'border-radius:3px;padding:8px 10px;background:rgba(255,255,255,.03)}',
    '.vr-soundrow .vr-langlabel{font-size:9.5px;letter-spacing:.22em;color:#8f86b8;text-transform:uppercase;white-space:nowrap}',
    '.vr-soundrow .vr-range{flex:1;width:auto}',
    '.vr-menubar .vr-sound{margin-left:auto}',
    /* ========================= 1638 interface skin ========================= */
    '@import url("https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Manrope:wght@400;500;600;700;800&family=Rubik+Mono+One&display=swap");',
    ':root{--orn:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 60 60%27%3E%3Cg fill=%27none%27 stroke=%27%23d9b45a%27 stroke-width=%271.1%27%3E%3Cpath d=%27M30 5 L55 30 L30 55 L5 30 Z%27 opacity=%27.45%27/%3E%3Cpath d=%27M30 14 L46 30 L30 46 L14 30 Z%27 opacity=%27.22%27/%3E%3Cpath d=%27M30 23 L37 30 L30 37 L23 30 Z%27 opacity=%27.6%27/%3E%3C/g%3E%3C/svg%3E")}',
    'body,#menu,.vr-modal,.vr-pause-wrap,.vr-sheet,.vr-pause-panel,input[type=text],.seg button,.btn{font-family:"Manrope",ui-sans-serif,system-ui,-apple-system,sans-serif}',
    '#menu h1,.vr-sheet h2,.vr-pause-title,#menu .card .h{font-family:"Cinzel",Georgia,serif}',
    /* Voxel wordmark: a blocky, slab-square face cut like stacked voxels —
       gold VOXEL with a hard extruded side and a wide ember halo, then RAGE
       carrying a living fire gradient inside its own letters. Ottoman
       hairlines and the diamond sit underneath as the only ornament. */
    '#menu h1{font-family:"Rubik Mono One","Arial Black",ui-sans-serif,sans-serif;font-weight:400;' +
      'letter-spacing:.015em;line-height:1.16;padding:0 2px .1em;' +
      'background:linear-gradient(180deg,#fffdf2 0%,#ffedb4 26%,#ffd76e 52%,#e0aa4c 74%,#a4701f 100%);' +
      '-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;' +
      'text-shadow:2px 2px 0 #b07a2a,4px 4px 0 #9a6722,6px 6px 0 #82541c,8px 8px 0 #6a4316,' +
        '10px 10px 0 #523210,12px 12px 0 #3a220a,18px 20px 28px rgba(0,0,0,.6);' +
      'filter:drop-shadow(0 0 16px rgba(255,205,110,.34)) drop-shadow(0 0 44px rgba(255,170,60,.2))}',
    /* RAGE carries fire inside the glyphs: a vertical flame gradient clipped to
       the letters, slowly rising, with an ember band flickering over it. */
    '#menu h1 span{position:relative;display:inline-block;isolation:isolate;' +
      '-webkit-text-fill-color:transparent;color:transparent;' +
      'background-image:' +
        'radial-gradient(60% 38% at 50% 104%,rgba(255,255,235,.92),rgba(255,220,140,.35) 55%,rgba(255,190,90,0) 78%),' +
        'linear-gradient(0deg,#8f1405 0%,#e32d08 16%,#ff6b0c 38%,#ffa41b 58%,#ffcf5e 76%,#fff4cf 100%);' +
      'background-size:100% 100%,100% 240%;background-position:50% 100%,50% 92%;background-repeat:no-repeat,no-repeat;' +
      '-webkit-background-clip:text;background-clip:text;' +
      'animation:vrFlame 3.8s ease-in-out infinite;' +
      'text-shadow:2px 2px 0 #8a2c0c,4px 4px 0 #742407,6px 6px 0 #5c1b05,8px 8px 0 #441203,' +
        '10px 10px 0 #2e0c02,12px 12px 0 #1c0601,18px 20px 28px rgba(0,0,0,.6);' +
      'filter:drop-shadow(0 0 12px rgba(255,120,30,.55)) drop-shadow(0 0 34px rgba(255,70,10,.32))}',
    '#menu h1 span:before{content:"RAGE";position:absolute;left:0;top:0;z-index:-1;' +
      '-webkit-text-fill-color:#4a1505;color:#4a1505;-webkit-text-stroke:0;animation:none;' +
      'text-shadow:2px 2px 0 #6a220a,4px 4px 0 #571a06,6px 6px 0 #3f1204,8px 8px 0 #2a0b02,' +
        '10px 10px 0 #1a0601,18px 20px 28px rgba(0,0,0,.55)}',
    '#menu h1 span:after{content:"RAGE";position:absolute;left:0;top:0;z-index:1;pointer-events:none;' +
      'color:transparent;-webkit-text-fill-color:transparent;' +
      'background-image:repeating-linear-gradient(0deg,rgba(255,230,150,.75) 0 4px,rgba(255,120,20,.35) 4px 11px,rgba(255,60,0,0) 11px 20px);' +
      'background-size:100% 220%;background-position:50% 100%;' +
      '-webkit-background-clip:text;background-clip:text;mix-blend-mode:screen;' +
      'animation:vrEmbers 2.2s steps(9) infinite}',
    '@keyframes vrFlame{0%,100%{background-position:50% 100%,50% 96%}40%{background-position:50% 100%,50% 38%}70%{background-position:50% 100%,50% 68%}}',
    '@keyframes vrEmbers{0%{background-position:50% 100%;opacity:.55}50%{background-position:50% 30%;opacity:.8}100%{background-position:50% -40%;opacity:.5}}',
    '#menu h1:after{content:"";display:block;width:min(360px,62%);height:11px;margin-top:12px;' +
      'background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 60 14%27%3E%3Cg fill=%27none%27 stroke=%27%23ffd76e%27 stroke-width=%271.1%27%3E%3Cpath d=%27M18 7 L30 -5 L42 7 L30 19 Z%27 opacity=%27.85%27/%3E%3Cpath d=%27M24 7 L30 1 L36 7 L30 13 Z%27/%3E%3C/g%3E%3C/svg%3E"),' +
      'linear-gradient(90deg,rgba(255,215,110,0),rgba(255,215,110,.55) 18%,rgba(255,215,110,.55) 42%,rgba(255,215,110,0) 44%),' +
      'linear-gradient(270deg,rgba(255,215,110,0),rgba(255,215,110,.55) 18%,rgba(255,215,110,.55) 42%,rgba(255,215,110,0) 44%);' +
      'background-repeat:no-repeat,no-repeat,no-repeat;background-position:center,left center,right center;' +
      'background-size:60px 14px,calc(50% - 32px) 2px,calc(50% - 32px) 2px;' +
      'filter:drop-shadow(0 0 8px rgba(255,200,90,.35))}',
    '#menu .lede{font-size:12.5px;letter-spacing:.015em;line-height:1.85;color:#b9b0d8;max-width:780px}',

    /* ornaments */
    '.vr-corners{position:absolute;inset:0;pointer-events:none;border-radius:inherit;overflow:hidden}',
    '.vr-corners i{position:absolute;width:32px;height:32px;background:var(--orn) center/contain no-repeat;opacity:.55}',
    '.vr-corners i:nth-child(1){top:9px;left:9px}',
    '.vr-corners i:nth-child(2){top:9px;right:9px;transform:scaleX(-1)}',
    '.vr-corners i:nth-child(3){bottom:9px;left:9px;transform:scaleY(-1)}',
    '.vr-corners i:nth-child(4){bottom:9px;right:9px;transform:scale(-1,-1)}',

    /* glass cards in the start menu */
    '#menu .box{position:relative}',
    '#menu .card{position:relative;border-radius:18px;padding:16px 18px;' +
      'background:linear-gradient(180deg,rgba(38,26,58,.62),rgba(14,9,24,.72));' +
      'border:1px solid rgba(255,215,110,.16);' +
      'box-shadow:0 26px 70px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.07);' +
      'backdrop-filter:blur(16px) saturate(1.15);-webkit-backdrop-filter:blur(16px) saturate(1.15)}',
    '#menu .card .h{color:#d9b45a;font-size:10.5px;letter-spacing:.3em;font-weight:600;text-shadow:0 0 16px rgba(217,180,90,.25)}',
    '#menu .card .h:after{content:"";display:block;height:1px;margin-top:8px;' +
      'background:linear-gradient(90deg,rgba(217,180,90,.5),rgba(217,180,90,0))}',
    '#menu .keys{display:none!important}',

    /* gel buttons */
    '.seg button,.btn,.vr-btn{position:relative;overflow:hidden;border-radius:999px;' +
      'font-family:"Manrope",sans-serif;font-weight:700;letter-spacing:.13em;' +
      'background:linear-gradient(180deg,rgba(255,255,255,.17),rgba(255,255,255,.05) 52%,rgba(0,0,0,.2));' +
      'border:1px solid rgba(255,255,255,.2);color:#d8d0ee;' +
      'box-shadow:inset 0 1px 0 rgba(255,255,255,.35),inset 0 -10px 16px rgba(0,0,0,.22),0 8px 18px rgba(0,0,0,.28);' +
      'transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease,filter .16s ease}',
    '.seg button:before,.btn:before,.vr-btn:before{content:"";position:absolute;left:8%;right:8%;top:2px;height:44%;' +
      'border-radius:999px;background:linear-gradient(180deg,rgba(255,255,255,.38),rgba(255,255,255,0));pointer-events:none;opacity:.7}',
    '.seg button:hover,.btn:hover,.vr-btn:hover{transform:translateY(-1px);border-color:rgba(255,215,110,.6);color:#fff;' +
      'box-shadow:inset 0 1px 0 rgba(255,255,255,.45),inset 0 -10px 16px rgba(0,0,0,.2),0 12px 24px rgba(0,0,0,.32)}',
    '.seg button.on,.seg button.active{border-color:rgba(255,240,190,.9);color:#2a1a08;' +
      'background:linear-gradient(180deg,#fff1c4,#ffd76e 52%,#d9a04a);' +
      'box-shadow:inset 0 1px 0 rgba(255,255,255,.75),0 8px 22px rgba(255,200,90,.28)}',
    '.btn.primary,.vr-btn.primary{border:none;color:#2a1a08;' +
      'background:linear-gradient(180deg,#fff1c4,#ffd76e 52%,#d9a04a);' +
      'box-shadow:inset 0 1px 0 rgba(255,255,255,.8),0 10px 26px rgba(255,200,90,.3)}',
    '.btn.primary:before,.vr-btn.primary:before{background:linear-gradient(180deg,rgba(255,255,255,.65),rgba(255,255,255,0))}',
    '.vr-btn.danger{color:#ffb3bf;border-color:rgba(255,95,109,.4)}',
    '.vr-btn.danger:hover{border-color:#ff5f6d;color:#fff}',
    '.vr-btn[disabled]{opacity:.45;transform:none}',

    'input[type=text]{border-radius:12px;background:rgba(6,4,12,.55);border:1px solid rgba(255,255,255,.14);' +
      'box-shadow:inset 0 2px 8px rgba(0,0,0,.45);font-family:"Manrope";font-weight:600}',
    'input[type=text]:focus{border-color:#ffd76e;box-shadow:inset 0 2px 8px rgba(0,0,0,.45),0 0 0 1px rgba(255,215,110,.35),0 0 22px rgba(255,215,110,.14)}',

    /* modal shells */
    '.vr-modal{padding:20px}',
    '.vr-sheet{position:relative;border-radius:20px;overflow:hidden;' +
      'background:linear-gradient(180deg,rgba(26,18,42,.94),rgba(10,7,18,.94));' +
      'border:1px solid rgba(255,215,110,.2);' +
      'box-shadow:0 40px 110px rgba(0,0,0,.65),inset 0 1px 0 rgba(255,255,255,.08);' +
      'backdrop-filter:blur(20px) saturate(1.2);-webkit-backdrop-filter:blur(20px) saturate(1.2)}',
    '.vr-sheet-head{padding:18px 22px 14px;background:linear-gradient(180deg,rgba(255,255,255,.04),transparent)}',
    '.vr-sheet-head h2{font-size:26px;letter-spacing:.1em;font-weight:700;color:#ffe7a6;' +
      'text-shadow:0 0 28px rgba(255,215,110,.25)}',
    '.vr-sheet-head .vr-kicker{color:#d9b45a;letter-spacing:.42em;font-size:8.5px;font-family:"Manrope";font-weight:700}',
    '.vr-sheet-foot{padding:14px 22px;border-top:1px solid rgba(255,255,255,.08);' +
      'background:linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,.25))}',
    '.vr-x{width:34px;height:34px;border-radius:50%;border:1px solid rgba(255,255,255,.18);' +
      'background:rgba(255,255,255,.05);color:#c9c0e6;font-size:13px;cursor:pointer;' +
      'box-shadow:inset 0 1px 0 rgba(255,255,255,.25);transition:all .16s}',
    '.vr-x:hover{color:#fff;border-color:#ffd76e;transform:rotate(90deg)}',
    '.vr-padstate{font-size:8.5px;letter-spacing:.1em;color:#8f86b8;max-width:230px;text-align:right;line-height:1.6}',

    /* tabs */
    '.vr-tabs{padding:0 22px 12px;gap:8px}',
    '.vr-tab{border-radius:999px;padding:9px 16px;font-weight:700;letter-spacing:.14em}',
    '.vr-tab.on{background:linear-gradient(180deg,rgba(255,215,110,.22),rgba(255,215,110,.06));' +
      'border-color:rgba(255,215,110,.7);color:#ffe9b0;box-shadow:inset 0 1px 0 rgba(255,255,255,.25),0 0 20px rgba(255,200,90,.12)}',

    /* controls window */
    '.vr-body{padding:0 22px 20px;gap:18px}',
    '.vr-stage{position:relative;min-height:360px;border-radius:18px;overflow:hidden;' +
      'background:radial-gradient(ellipse at 50% 42%,rgba(120,90,190,.18),rgba(8,5,14,.55) 68%);' +
      'border:1px solid rgba(255,255,255,.1);' +
      'box-shadow:inset 0 1px 0 rgba(255,255,255,.06),inset 0 -30px 60px rgba(0,0,0,.35)}',
    '.vr-diagram{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:18px}',
    '.vr-diagram svg{width:100%;height:auto;max-height:100%;overflow:visible}',
    '.vr-stagehint{position:absolute;left:14px;bottom:10px;font-size:8.5px;letter-spacing:.18em;color:#8f86b8;text-transform:uppercase}',
    '.vr-side{background:rgba(255,255,255,.02);border-radius:16px;border:1px solid rgba(255,255,255,.07);padding:10px}',
    '.vr-row{border-radius:10px;padding:7px 9px}',
    '.vr-row:hover{background:rgba(255,255,255,.04)}',
    '.vr-row.listening{background:rgba(255,215,110,.1)}',
    '.vr-key{border-radius:999px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);' +
      'padding:5px 12px;min-width:74px;font-weight:700;letter-spacing:.1em}',
    '.vr-key:hover{border-color:rgba(255,215,110,.6);color:#fff}',
    '.vr-seg button{border-radius:999px;padding:6px 14px}',

    /* SVG keyboard */
    '.vr-kb{filter:drop-shadow(0 20px 30px rgba(0,0,0,.45))}',
    '.vkey .kt{fill:url(#kbKey);stroke:rgba(255,255,255,.1);stroke-width:1;transition:stroke .15s,fill .15s}',
    '.vkey .kl{fill:#dcd4f4;text-anchor:middle;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:700;letter-spacing:.02em}',
    '.vkey .ka{fill:#a99bd4;text-anchor:middle;font-family:"Manrope",sans-serif;font-size:6.2px;font-weight:800;letter-spacing:.1em}',
    '.vkey .kb{fill:rgba(0,0,0,.35)}',
    '.vkey.bound .kt{fill:url(#kbGold)}',
    '.vkey.bound.p2 .kt{fill:url(#kbCyan)}',
    '.vkey.bound .kl{fill:#241a10}',
    '.vkey.bound .ka{fill:rgba(36,26,16,.7)}',
    '.vkey[data-code]{cursor:pointer}',
    '.vkey[data-code]:hover .kt{stroke:#ffeab2;stroke-width:1.8}',
    '.vkey.is-listen .kt{stroke:#fff;stroke-width:2.2}',

    /* SVG controller */
    '.vr-pad{filter:drop-shadow(0 24px 34px rgba(0,0,0,.5))}',
    '.vpadbtn{cursor:pointer}',
    '.vpadbtn .pb-base{fill:rgba(0,0,0,.3);stroke:rgba(255,255,255,.08)}',
    '.vpadbtn .pb-top{fill:rgba(255,255,255,.05);stroke:#ffd76e;stroke-width:1.6;transition:fill .15s,stroke .15s}',
    '.vpadbtn .pb-letter{fill:#ffe9b0;text-anchor:middle;font-family:ui-monospace,Menlo,monospace;font-size:12px;font-weight:700}',
    '.vpadbtn .pb-act{fill:#a99bd4;text-anchor:middle;font-family:"Manrope",sans-serif;font-size:5.4px;font-weight:800;letter-spacing:.06em}',
    '.vpadbtn:hover .pb-top{fill:rgba(255,215,110,.16)}',
    '.vpadbtn.is-listen .pb-top{fill:rgba(255,215,110,.3);stroke:#fff}',
    '.vpd path{fill:rgba(255,255,255,.05);stroke:rgba(255,215,110,.5);stroke-width:1.3;stroke-linejoin:round}',
    '.vpd circle{fill:rgba(255,215,110,.5)}',
    '.vp-label{fill:#8f86b8;text-anchor:middle;font-family:"Manrope",sans-serif;font-size:5.4px;font-weight:700;letter-spacing:.12em}',
    '.vs-base{fill:rgba(0,0,0,.28);stroke:rgba(255,255,255,.1)}',
    '.vs-ring{fill:rgba(255,255,255,.02);stroke:rgba(107,224,255,.5);stroke-width:1.4}',
    '.vs-dot{fill:rgba(107,224,255,.22)}',
    '.vpbumper{cursor:pointer}',
    '.vpbumper rect{fill:transparent;stroke:transparent;stroke-width:0;transition:fill .15s}',
    '.vpbumper:hover rect{fill:rgba(255,215,110,.16)}',
    '.vpbumper.is-listen rect{fill:rgba(255,215,110,.3)}',
    '.vpguide,.vpstart{cursor:pointer}',
    '.vpguide:hover circle:first-child,.vpstart:hover rect{fill:rgba(255,215,110,.2)}',

    /* guide */
    '.vr-guide-sheet{width:min(1020px,100%);max-height:min(93vh,940px);display:flex;flex-direction:column}',
    '.vr-gtabs{display:flex;gap:8px;padding:0 22px 14px;flex-wrap:wrap}',
    '.vr-gtab{border-radius:999px;padding:9px 18px;font-size:10px;letter-spacing:.16em;text-transform:uppercase;' +
      'font-weight:800;color:#c9c0e6;background:linear-gradient(180deg,rgba(255,255,255,.12),rgba(255,255,255,.03));' +
      'border:1px solid rgba(255,255,255,.16);cursor:pointer;transition:all .16s;' +
      'box-shadow:inset 0 1px 0 rgba(255,255,255,.25)}',
    '.vr-gtab:hover{border-color:rgba(255,215,110,.55);color:#fff}',
    '.vr-gtab.on{color:#2a1a08;border-color:rgba(255,240,190,.9);' +
      'background:linear-gradient(180deg,#fff1c4,#ffd76e 55%,#d9a04a);' +
      'box-shadow:inset 0 1px 0 rgba(255,255,255,.7),0 8px 20px rgba(255,200,90,.22)}',
    '.vr-guide-body{flex:1;min-height:0;overflow:auto;padding:0 22px 18px;scrollbar-width:thin;' +
      'scrollbar-color:rgba(255,215,110,.4) transparent}',
    '.vr-guide-lede{font-size:11px;letter-spacing:.04em;line-height:1.9;color:#b9b0d8;margin:0 0 14px;max-width:860px}',
    '.vr-gdiagram{max-width:860px;margin:0 auto 18px}',
    '.vr-gdiagram svg{width:100%;height:auto;display:block}',
    '.vr-gdiagram-pad{max-width:600px;margin:0 auto 10px}',
    '.vr-glegend{display:grid;grid-template-columns:1fr 1fr;gap:16px 26px;max-width:860px;margin:0 auto}',
    '@media(max-width:760px){.vr-glegend{grid-template-columns:1fr}}',
    '.vr-legcol h4{font-family:"Cinzel",serif;font-size:10.5px;letter-spacing:.22em;color:#d9b45a;' +
      'margin:0 0 6px;padding-bottom:6px;border-bottom:1px solid rgba(217,180,90,.18)}',
    '.vr-legrow{display:grid;grid-template-columns:1fr auto auto;gap:6px;align-items:center;' +
      'padding:5px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:9.5px;letter-spacing:.08em;color:#cfc6ea}',
    '.vr-legrow .vr-cap{margin-left:2px}',
    '.vr-padkey{display:inline-block;min-width:34px;text-align:center;padding:2px 8px;border-radius:999px;' +
      'border:1px solid rgba(255,215,110,.35);background:rgba(255,215,110,.08);color:#ffe9b0;' +
      'font-size:8.5px;font-weight:700;letter-spacing:.08em}',
    '.vr-gnote{max-width:860px;margin:16px auto 0;font-size:8.5px;letter-spacing:.1em;color:#7f76a6;line-height:1.8}',
    '.vr-guide-grid{display:block;columns:2;column-gap:14px}',
    '.vr-guide-grid>.vr-gsec{break-inside:avoid;-webkit-column-break-inside:avoid;margin:0 0 14px}',
    '@media(max-width:760px){.vr-guide-grid{columns:1}}',
    '.vr-gsec{align-self:start;border-radius:14px;padding:12px 14px;background:linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.015));' +
      'border:1px solid rgba(255,255,255,.08)}',
    '.vr-gsec h3{font-family:"Cinzel",serif;font-size:10px;letter-spacing:.24em;color:#d9b45a;margin-bottom:8px}',
    '.vr-grow{display:flex;gap:8px;padding:6px 0;border-top:1px dashed rgba(255,255,255,.06)}',
    '.vr-grow:first-of-type{border-top:none}',

    /* pause menu */
    '.vr-pause-panel{position:relative;border-radius:24px;padding:26px 26px 22px;' +
      'background:linear-gradient(180deg,rgba(28,19,45,.96),rgba(10,7,18,.96));' +
      'border:1px solid rgba(255,215,110,.2);box-shadow:0 40px 110px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.08)}',
    '.vr-pause-title{font-family:"Cinzel",serif;font-size:36px;letter-spacing:.18em;color:#ffe7a6;' +
      'text-shadow:0 0 34px rgba(255,215,110,.28)}',
    '.vr-pause-sub{color:#9d92c4;letter-spacing:.16em;font-size:9px}',
    '.vr-pause-grid{gap:8px}',
    '.vr-pause-grid .vr-btn.wide{padding:14px 18px}',

    /* HUD polish */
    '#players .panel{border-radius:14px;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);' +
      'border-color:rgba(255,215,110,.16);background:linear-gradient(180deg,rgba(26,18,42,.86),rgba(9,6,16,.8))}',
    '.vr-portrait{border-radius:8px}',
    '#stats{border-radius:14px}',

    /* display filters */
    '#hud{z-index:3}',
    '#vignette{display:none}',
    '#vrFx{position:fixed;inset:0;pointer-events:none;z-index:1;overflow:hidden}',
    '#vrFx i{position:absolute;inset:0;display:block;opacity:0;transition:opacity .3s ease}',
    '#vrFx .fx-vig{background:radial-gradient(ellipse at 50% 46%,rgba(0,0,0,0) 36%,rgba(5,2,10,.92) 100%);opacity:var(--vig,.35)}',
    '#vrFx .fx-scan{background:repeating-linear-gradient(0deg,rgba(0,0,0,.3) 0 1px,rgba(0,0,0,0) 1px 3px);mix-blend-mode:multiply}',
    '#vrFx.crt .fx-scan{opacity:.55}',
    '#vrFx.crt .fx-vig{opacity:calc(var(--vig,.35) + .12)}',
    '#vrFx .fx-grain{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27120%27 height=%27120%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%27.9%27 numOctaves=%272%27/%3E%3C/filter%3E%3Crect width=%27120%27 height=%27120%27 filter=%27url(%23n)%27 opacity=%27.55%27/%3E%3C/svg%3E");' +
      'mix-blend-mode:soft-light}',
    '#vrFx.watercolor .fx-grain{opacity:.35}',
    '#vrFx .fx-grade{background:linear-gradient(155deg,rgba(255,150,80,.22),rgba(20,60,90,.3));mix-blend-mode:soft-light}',
    '#vrFx .fx-bars{background:linear-gradient(180deg,#000 0 6%,transparent 6% 94%,#000 94% 100%)}',
    '#vrFx.cinematic .fx-bars{opacity:1}',
    '#vrFx.cinematic .fx-grade{opacity:.55}',
    '#vrFx.cinematic .fx-vig{opacity:calc(var(--vig,.35) + .1)}',

    /* display settings rows */
    '.vr-fxrow{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:12px 2px;' +
      'border-bottom:1px solid rgba(255,255,255,.07);font-size:10.5px;letter-spacing:.16em;color:#cfc6ea;text-transform:uppercase}',
    '.vr-fxrow:last-of-type{border-bottom:none}',
    '.vr-fxrow .vr-fxval{color:#ffd76e;font-weight:700;min-width:42px;text-align:right}',
    '.vr-fxslider{display:flex;align-items:center;gap:12px;flex:1;max-width:280px}',
    '.vr-fxslider input[type=range]{flex:1;width:auto}',
    '.vr-switch{width:46px;height:24px;border-radius:999px;border:1px solid rgba(255,255,255,.2);' +
      'background:rgba(255,255,255,.06);cursor:pointer;position:relative;transition:all .18s;flex:0 0 auto}',
    '.vr-switch:after{content:"";position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:50%;' +
      'background:linear-gradient(180deg,#f3eeff,#b9b0d8);box-shadow:0 2px 6px rgba(0,0,0,.4);transition:all .18s}',
    '.vr-switch.on{background:linear-gradient(180deg,#ffe9a8,#d9a04a);border-color:#ffd76e}',
    '.vr-switch.on:after{left:24px;background:linear-gradient(180deg,#fff,#ffd76e)}',
    '.vr-visuals-sheet{width:min(560px,100%)}',
    '.vr-visuals-body{padding:6px 22px 18px}',

    /* menu rhythm: wide, top-aligned, scroll-safe */
    '#menu{align-items:flex-start;padding:26px 24px}',
    '#menu .box{width:min(1060px,100%);margin-block:auto}',
    '#menu h1{font-size:clamp(46px,6.9vw,82px);line-height:1.12;margin-bottom:6px}',
    '#menu .lede{margin-top:14px;max-width:850px;font-size:12px;line-height:1.95}',
    '#menu .grid{margin-top:20px;gap:20px}',
    '.vr-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:14px}',
    '.vr-actions .vr-copymsg{flex:0 0 100%;font-size:8.5px;letter-spacing:.12em;color:#8f86b8}',
    '.vr-btn.small{font-size:10px;padding:9px 15px;letter-spacing:.14em}',
    '.vr-itemgrid{gap:8px}',
    'body:has(#menu:not(.hide)) #hud{opacity:0;transition:opacity .2s}',
    '#hud{transition:opacity .2s}',
    /* motion */
    '.vr-modal{animation:vrPop .18s ease-out}',
    '@keyframes vrPop{from{opacity:0;transform:translateY(8px) scale(.985)}to{opacity:1;transform:none}}',
  ].join('\n');

  function injectCSS() {
    if (global.document.getElementById('vrStyles')) return;
    var s = global.document.createElement('style');
    s.id = 'vrStyles';
    s.textContent = CSS;
    (global.document.head || global.document.documentElement).appendChild(s);
  }

  /* ------------------------------- helpers -------------------------------- */
  function el(tag, cls, html) {
    var n = global.document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function toast(msg) {
    var t = global.document.getElementById('vrToast');
    if (!t) {
      t = el('div', 'vr-toast');
      t.id = 'vrToast';
      global.document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(t.__t);
    t.__t = setTimeout(function () { t.classList.remove('on'); }, 2600);
  }

  /* ---------------------------- voxel sprites ----------------------------- */
  function svg16(body) {
    return '<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">' + body + '</svg>';
  }
  var ICONS = {
    doner: svg16('<rect x="4" y="2" width="8" height="3" fill="#d9a04a"/>' +
      '<rect x="3" y="5" width="10" height="2" fill="#8a4a2a"/>' +
      '<rect x="5" y="6" width="2" height="1" fill="#e05a2a"/>' +
      '<rect x="9" y="6" width="2" height="1" fill="#6bbf6b"/>' +
      '<rect x="3" y="7" width="10" height="2" fill="#c07a34"/>' +
      '<rect x="4" y="9" width="8" height="2" fill="#d9a04a"/>' +
      '<rect x="5" y="11" width="6" height="3" fill="#b9822f"/>' +
      '<rect x="6" y="12" width="4" height="1" fill="#ffd76e"/>'),
    ayran: svg16('<rect x="4" y="4" width="8" height="1" fill="#6be0ff"/>' +
      '<rect x="5" y="5" width="6" height="9" fill="#eef2f8"/>' +
      '<rect x="5" y="8" width="6" height="2" fill="#cfe2f2"/>' +
      '<rect x="6" y="13" width="4" height="1" fill="#b9c6d6"/>' +
      '<rect x="7" y="2" width="2" height="2" fill="#eef2f8"/>'),
    gold: svg16('<rect x="4" y="5" width="8" height="2" fill="#ffd76e"/>' +
      '<rect x="3" y="7" width="10" height="3" fill="#d9a04a"/>' +
      '<rect x="5" y="8" width="6" height="1" fill="#fff1b8"/>' +
      '<rect x="2" y="10" width="12" height="3" fill="#ffd76e"/>' +
      '<rect x="4" y="11" width="8" height="1" fill="#b9822f"/>' +
      '<rect x="5" y="13" width="6" height="1" fill="#8a6a3a"/>'),
    pistole: svg16('<rect x="2" y="6" width="9" height="3" fill="#d9d9e6"/>' +
      '<rect x="10" y="5" width="4" height="2" fill="#a8a8ba"/>' +
      '<rect x="2" y="9" width="5" height="1" fill="#8a8a99"/>' +
      '<rect x="4" y="10" width="3" height="4" fill="#5a5a6a"/>' +
      '<rect x="3" y="14" width="5" height="1" fill="#3a3a48"/>'),
    gewehr: svg16('<rect x="1" y="8" width="11" height="2" fill="#8a6a3a"/>' +
      '<rect x="1" y="6" width="7" height="2" fill="#a07a44"/>' +
      '<rect x="11" y="7" width="4" height="2" fill="#3a3a44"/>' +
      '<rect x="14" y="7" width="1" height="1" fill="#cfd2dc"/>' +
      '<rect x="3" y="10" width="3" height="2" fill="#5a4426"/>' +
      '<rect x="7" y="10" width="2" height="4" fill="#4a3a24"/>'),
    bazooka: svg16('<rect x="2" y="6" width="11" height="4" fill="#4a6a3a"/>' +
      '<rect x="13" y="5" width="2" height="6" fill="#2a3a24"/>' +
      '<rect x="3" y="5" width="2" height="1" fill="#6b8a52"/>' +
      '<rect x="5" y="4" width="2" height="2" fill="#3a5230"/>' +
      '<rect x="3" y="10" width="3" height="3" fill="#2a3a24"/>' +
      '<rect x="2" y="7" width="2" height="2" fill="#ffb347"/>'),
    baseball: svg16('<rect x="2" y="12" width="3" height="3" fill="#8a5c2a"/>' +
      '<rect x="4" y="9" width="3" height="3" fill="#b98a4a"/>' +
      '<rect x="6" y="6" width="3" height="3" fill="#c99a5a"/>' +
      '<rect x="8" y="3" width="4" height="3" fill="#d9aa6a"/>' +
      '<rect x="10" y="2" width="4" height="2" fill="#e8c08a"/>'),
    schlagring: svg16('<rect x="3" y="3" width="2" height="2" fill="#c0c0cc"/>' +
      '<rect x="6" y="3" width="2" height="2" fill="#c0c0cc"/>' +
      '<rect x="9" y="3" width="2" height="2" fill="#c0c0cc"/>' +
      '<rect x="2" y="5" width="11" height="4" fill="#a8a8ba"/>' +
      '<rect x="3" y="9" width="9" height="3" fill="#7a7a8a"/>' +
      '<rect x="4" y="12" width="7" height="2" fill="#5a5a6a"/>'),
    kusarigama: svg16('<rect x="1" y="12" width="4" height="2" fill="#6a6a7a"/>' +
      '<rect x="4" y="10" width="2" height="2" fill="#9a9aa8"/>' +
      '<rect x="6" y="8" width="2" height="2" fill="#9a9aa8"/>' +
      '<rect x="8" y="6" width="2" height="2" fill="#9a9aa8"/>' +
      '<rect x="10" y="2" width="2" height="5" fill="#d9d9e6"/>' +
      '<rect x="12" y="3" width="2" height="2" fill="#bffcff"/>' +
      '<rect x="11" y="7" width="2" height="1" fill="#5a5a6a"/>'),
  };

  function heartSVG() {
    return '<svg viewBox="0 0 12 11" shape-rendering="crispEdges" fill="currentColor" aria-hidden="true">' +
      '<rect x="1" y="1" width="3" height="2"/><rect x="8" y="1" width="3" height="2"/>' +
      '<rect x="0" y="3" width="12" height="3"/><rect x="1" y="6" width="10" height="2"/>' +
      '<rect x="3" y="8" width="6" height="1"/><rect x="5" y="9" width="2" height="1"/></svg>';
  }

  /* Voxel flame for the special meter: same 12-cell weight and crisp edges as
   * the heart, so both meters read as one pair. */
  function energySVG() {
    return '<svg viewBox="0 0 12 12" shape-rendering="crispEdges" fill="currentColor" aria-hidden="true">' +
      '<rect x="4" y="0" width="4" height="2"/>' +
      '<rect x="3" y="2" width="2" height="2"/><rect x="6" y="2" width="3" height="2"/>' +
      '<rect x="2" y="4" width="6" height="3"/>' +
      '<rect x="3" y="7" width="6" height="3"/>' +
      '<rect x="4" y="10" width="4" height="2"/></svg>';
  }

  function portraitSVG(pal) {
    var col = function (hex, fallback) { return '#' + (hex || fallback || 0x2a2440).toString(16).padStart(6, '0'); };
    var coat = col(pal && (pal.coat || pal.shirt), 0x2f5a4a);
    var trim = col(pal && (pal.trim || pal.shirt2), 0xd9b45a);
    var skin = col(pal && pal.skin, 0xd9a574);
    var hair = col(pal && pal.hair, 0x2a1a12);
    var band = col(pal && (pal.hatBand || pal.band), 0xc9a24a);
    var must = col(pal && (pal.mustache || pal.hair), 0x2a1a12);
    return '<svg viewBox="0 0 14 14" shape-rendering="crispEdges" aria-hidden="true">' +
      '<rect x="3" y="0" width="8" height="2" fill="' + coat + '"/>' +
      '<rect x="2" y="2" width="10" height="1" fill="' + band + '"/>' +
      '<rect x="3" y="3" width="8" height="2" fill="' + skin + '"/>' +
      '<rect x="3" y="5" width="2" height="3" fill="' + hair + '"/>' +
      '<rect x="9" y="5" width="2" height="3" fill="' + hair + '"/>' +
      '<rect x="5" y="4" width="4" height="1" fill="' + hair + '"/>' +
      '<rect x="5" y="5" width="1" height="1" fill="#0d0a12"/>' +
      '<rect x="8" y="5" width="1" height="1" fill="#0d0a12"/>' +
      '<rect x="5" y="7" width="4" height="1" fill="' + skin + '"/>' +
      '<rect x="4" y="8" width="6" height="1" fill="' + must + '"/>' +
      '<rect x="5" y="9" width="4" height="1" fill="' + skin + '"/>' +
      '<rect x="1" y="10" width="12" height="4" fill="' + coat + '"/>' +
      '<rect x="6" y="10" width="2" height="4" fill="' + trim + '"/>' +
      '</svg>';
  }

  /* --------------------------- exact HUD portrait --------------------------
   * The HUD used to carry a hand-drawn face that shared nothing but the
   * colours with the model on the street. Instead the game's own head group
   * (the exact voxel mesh, hat, eyes and moustache) is cloned into a tiny
   * offscreen scene, rendered once and cached as a data URL. Same sprite,
   * no redraw drift. */
  var portraitCache = {};
  function portraitKey(p) {
    var pal = (p && p.pal) || {};
    var parts = [];
    Object.keys(pal).sort().forEach(function (k) {
      var v = pal[k];
      if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string') parts.push(k + ':' + v);
    });
    return parts.join('|');
  }
  function renderPortrait(p) {
    var vox = global.__voxel;
    var T = (vox && vox.THREE) || THREE;
    if (!T || !p || !p.fig || !p.fig.head) return null;
    var key = portraitKey(p);
    if (portraitCache[key]) return portraitCache[key];
    var renderer = null;
    try {
      var size = 128;
      var canvas = global.document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      renderer = new T.WebGLRenderer({ canvas: canvas, alpha: true, antialias: false, preserveDrawingBuffer: true });
      renderer.setPixelRatio(1);
      renderer.setSize(size, size, false);
      if (T.SRGBColorSpace && renderer.outputColorSpace !== undefined) renderer.outputColorSpace = T.SRGBColorSpace;
      renderer.setClearColor(0x000000, 0);

      var scene = new T.Scene();
      scene.add(new T.AmbientLight(0xffffff, 1.45));
      var keyLight = new T.DirectionalLight(0xffe6bc, 1.5);
      keyLight.position.set(2.4, 3.2, 4.5);
      scene.add(keyLight);
      var rim = new T.DirectionalLight(0x6be0ff, 0.55);
      rim.position.set(-3, 1.2, -2.4);
      scene.add(rim);

      var head = p.fig.head.clone(true);
      head.position.set(0, 0, 0);
      scene.add(head);
      head.updateMatrixWorld(true);

      var box = new T.Box3().setFromObject(head);
      var centre = box.getCenter(new T.Vector3());
      var radius = Math.max(0.001, box.getSize(new T.Vector3()).length() / 2);
      head.position.set(-centre.x, -centre.y, -centre.z);

      /* A little margin around the head so the turban and the chin are not
       * cropped by the square frame. */
      var cam = new T.PerspectiveCamera(30, 1, radius * 0.1, radius * 30);
      cam.position.set(0, radius * 0.1, radius * 4.3);
      cam.lookAt(0, radius * 0.02, 0);
      renderer.render(scene, cam);

      var url = canvas.toDataURL('image/png');
      portraitCache[key] = url;
      return url;
    } catch (e) {
      return null;
    } finally {
      if (renderer) {
        try { renderer.dispose(); } catch (e) {}
        try { renderer.forceContextLoss && renderer.forceContextLoss(); } catch (e) {}
      }
    }
  }
  function paintPortrait(port, p) {
    if (!port) return;
    var sig = portraitKey(p) || 'none';
    if (port.dataset.portraitSig === sig) return;
    port.dataset.portraitSig = sig;
    var url = renderPortrait(p);
    if (url) {
      port.innerHTML = '<img alt="" draggable="false" src="' + url + '">';
    } else {
      port.innerHTML = portraitSVG(p && p.pal);
    }
  }

  /* ---------------------------- sound & volume ---------------------------- */
  var AUDIO_KEY = 'voxelrage-audio-v1';
  var sound = { on: true, volume: 0.7, el: null, unlocked: false };
  var lastMute = null;

  function loadSound() {
    try {
      var raw = JSON.parse(global.localStorage.getItem(AUDIO_KEY) || 'null');
      if (raw && typeof raw === 'object') {
        sound.on = raw.on !== false;
        if (typeof raw.volume === 'number') sound.volume = Math.max(0, Math.min(1, raw.volume));
      }
    } catch (e) {}
  }
  function saveSound() {
    try { global.localStorage.setItem(AUDIO_KEY, JSON.stringify({ on: sound.on, volume: sound.volume })); } catch (e) {}
  }
  function menuAudio() {
    if (sound.el) return sound.el;
    var el = global.document.createElement('audio');
    el.id = 'vrMenuTheme';
    el.src = './assets/menu-theme.mp3';
    el.loop = true;
    el.preload = 'auto';
    el.setAttribute('data-noi18n', '');
    global.document.body.appendChild(el);
    sound.el = el;
    return el;
  }
  function applySound() {
    var el = menuAudio();
    el.volume = sound.volume;
    el.muted = !sound.on || sound.volume === 0;
    var b = bridge();
    if (b) {
      if (b.setAudioMuted && lastMute !== !sound.on) {
        lastMute = !sound.on;
        b.setAudioMuted(lastMute);
      }
      if (b.music && b.music.setVolume) b.music.setVolume(sound.volume);
    }
    saveSound();
    renderSoundUI();
    syncMenuMusic();
  }
  function syncMenuMusic() {
    var b = bridge();
    var el = sound.el;
    if (!el || !b) return;
    var inMenu = !b.started;
    if (inMenu && sound.on && sound.volume > 0) {
      if (el.paused) {
        var p = el.play();
        if (p && p.catch) p.catch(function () { /* needs a user gesture */ });
      }
    } else if (!el.paused) {
      el.pause();
    }
  }
  function unlockAudio() {
    sound.unlocked = true;
    syncMenuMusic();
  }
  function toggleSound() {
    sound.on = !sound.on;
    applySound();
  }
  function setVolumePct(v) {
    sound.volume = Math.max(0, Math.min(1, v / 100));
    if (sound.volume <= 0) sound.on = false;
    else if (!sound.on) sound.on = true;
    applySound();
  }
  /* Keep the menu in step when the player uses the game's own M key. */
  function syncGameMute() {
    var b = bridge();
    if (!b || !b.started || typeof b.muted !== 'boolean') return;
    var want = !b.muted;
    if (sound.on === want) return;
    sound.on = want;
    lastMute = b.muted;
    saveSound();
    menuAudio().muted = !sound.on;
    renderSoundUI();
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach(function (type) {
    global.addEventListener(type, unlockAudio, { once: true, capture: true });
  });

  function renderSoundUI() {
    var pct = Math.round(sound.volume * 100);
    global.document.querySelectorAll('.vr-sound-toggle').forEach(function (btn) {
      btn.textContent = sound.on ? '🔊' : '🔇';
      btn.title = T('sound') + ': ' + (sound.on ? T('soundOn') : T('soundOff'));
      btn.setAttribute('aria-label', btn.title);
      btn.setAttribute('aria-pressed', sound.on ? 'true' : 'false');
      btn.classList.toggle('off', !sound.on);
    });
    global.document.querySelectorAll('.vr-range').forEach(function (r) {
      if (global.document.activeElement !== r) r.value = String(pct);
      r.style.setProperty('--vr-volpct', pct + '%');
      r.setAttribute('aria-valuetext', pct + '%');
    });
    global.document.querySelectorAll('.vr-volnum').forEach(function (n) {
      n.textContent = sound.on ? pct + '%' : '—';
    });
  }
  function buildSoundUI() {
    var menubar = global.document.querySelector('.vr-menubar');
    if (!menubar || menubar.querySelector('.vr-sound')) return;
    var wrap = el('span', 'vr-sound');
    var btn = el('button', 'vr-sound-toggle');
    btn.type = 'button';
    var range = global.document.createElement('input');
    range.type = 'range';
    range.min = '0';
    range.max = '100';
    range.step = '1';
    range.className = 'vr-range';
    var num = el('span', 'vr-volnum');
    wrap.appendChild(btn);
    wrap.appendChild(range);
    wrap.appendChild(num);
    menubar.appendChild(wrap);
    btn.addEventListener('click', toggleSound);
    range.addEventListener('input', function () { setVolumePct(+range.value); });
  }

  /* ------------------------------ voxel HUD ------------------------------- */
  function enhanceHud() {
    var vox = global.__voxel;
    if (!vox || !vox.players) return;
    for (var i = 0; i < 2; i++) {
      var panel = global.document.getElementById(i === 0 ? 'p1Panel' : 'p2Panel');
      if (!panel || panel.dataset.vrHud) continue;
      panel.dataset.vrHud = '1';
      var label = panel.querySelector('.label');
      var name = panel.querySelector(i === 0 ? '#pName' : '#p2Name');
      var lives = panel.querySelector(i === 0 ? '#p1Lives' : '#p2Lives');
      var fill = panel.querySelector(i === 0 ? '#hpFill' : '#p2HpFill');
      var bar = fill ? fill.parentElement : null;
      var meter = panel.querySelector(i === 0 ? '#meterWrap' : '#p2MeterWrap');
      var weapon = panel.querySelector(i === 0 ? '#p1Weapon' : '#p2Weapon');

      var hero = el('div', 'vr-hero');
      var port = el('div', 'vr-portrait');
      paintPortrait(port, vox.players[i]);
      var meta = el('div', 'vr-hero-meta');
      hero.appendChild(port);
      hero.appendChild(meta);
      if (label) meta.appendChild(label);
      if (name) meta.appendChild(name);
      if (lives) meta.appendChild(lives);
      panel.insertBefore(hero, panel.firstChild);

      if (bar) {
        bar.classList.add('vr-hp');
        bar.appendChild(el('span', 'vr-ecg'));
        var row = el('div', 'vr-hprow');
        var heart = el('span', 'vr-heart');
        heart.innerHTML = heartSVG();
        var num = el('span', 'vr-hpnum', '100');
        panel.insertBefore(row, bar);
        row.appendChild(heart);
        row.appendChild(bar);
        row.appendChild(num);
      }
      if (meter) {
        meter.classList.add('vr-meter');
        meter.appendChild(el('span', 'vr-sheen'));
        var mrow = el('div', 'vr-hprow vr-meterrow');
        var star = el('span', 'vr-energyicon');
        star.innerHTML = energySVG();
        var mnum = el('span', 'vr-energynum', '0');
        panel.insertBefore(mrow, meter);
        mrow.appendChild(star);
        mrow.appendChild(meter);
        mrow.appendChild(mnum);
      }
      if (weapon) weapon.classList.add('vr-weapon');
    }
    updateHud();
  }
  function updateHud() {
    var vox = global.__voxel;
    if (!vox || !vox.players) return;
    for (var i = 0; i < 2; i++) {
      var p = vox.players[i];
      var panel = global.document.getElementById(i === 0 ? 'p1Panel' : 'p2Panel');
      if (!p || !panel || !panel.dataset.vrHud) continue;
      var ratio = Math.max(0, Math.min(1, p.hp / 100));
      var col = ratio > 0.6 ? '#9dff6b' : ratio > 0.3 ? '#ffd76e' : '#ff5f6d';
      var dark = ratio > 0.6 ? '#3f7a24' : ratio > 0.3 ? '#a06b12' : '#8a1f2a';
      var glow = ratio > 0.6 ? 'rgba(157,255,107,.55)' : ratio > 0.3 ? 'rgba(255,215,110,.55)' : 'rgba(255,95,109,.6)';
      panel.style.setProperty('--ecg', col);
      panel.style.setProperty('--ecg-dark', dark);
      panel.style.setProperty('--ecg-glow', glow);
      panel.style.setProperty('--ecg-dur', (2.1 + (1 - ratio) * 6.5).toFixed(2) + 's');
      panel.style.setProperty('--ecg-amp', (0.16 + ratio * 0.84).toFixed(2));
      panel.style.setProperty('--beat', (0.8 + (1 - ratio) * 2.6).toFixed(2) + 's');
      panel.classList.toggle('vr-low', ratio <= 0.3);
      panel.classList.toggle('vr-down', !!p.down || !!p.out || p.hp <= 0);
      var num = panel.querySelector('.vr-hpnum');
      if (num) num.textContent = String(Math.max(0, Math.round(p.hp)));
      paintPortrait(panel.querySelector('.vr-portrait'), p);
      var meter = panel.querySelector('.vr-meter');
      if (meter) {
        meter.classList.toggle('ready', p.meter >= 100);
        var mnum = panel.querySelector('.vr-energynum');
        if (mnum) mnum.textContent = String(Math.max(0, Math.round(p.meter || 0)));
      }
    }
  }

  /* ------------------------------- how to play ---------------------------- */
  function capsPair(actions) {
    var b = bridge();
    if (!b || !b.controls) return '';
    var group = function (idx, actions) {
      return '<span class="vr-capgrp"><span class="vr-caplabel">P' + (idx + 1) + '</span>' +
        actions.map(function (a) {
          return '<span class="vr-cap' + (idx ? ' p2' : '') + '">' + b.keyLabel(b.controls[idx][a]) + '</span>';
        }).join('') + '</span>';
    };
    return '<div class="vr-caps">' + group(0, actions) + group(1, actions) + '</div>';
  }
  function grow(iconHtml, title, desc, caps) {
    return '<div class="vr-grow">' +
      (iconHtml ? '<span class="vr-gicon">' + iconHtml + '</span>' : '') +
      '<div class="vr-gtext">' + (caps || '') + (title ? '<b>' + title + '</b>' : '') + desc + '</div>' +
      '</div>';
  }
  function gsec(title, rows) {
    return '<div class="vr-gsec"><h3>' + title + '</h3>' + rows.join('') + '</div>';
  }

  /* ------------------------------ control diagrams ------------------------- */
  var KEY_CAPTIONS = {
    Quote: "'", Comma: ',', Period: '.', Slash: '/', Semicolon: ';', Space: 'SPACE',
    Enter: 'ENTER', ShiftLeft: 'SHIFT', ShiftRight: 'SHIFT', ControlLeft: 'CTRL',
    ControlRight: 'CTRL', AltLeft: 'ALT', AltRight: 'ALT', Escape: 'ESC',
    ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Backspace: '⌫',
    BracketLeft: '[', BracketRight: ']', Backslash: '\\', Minus: '-', Equal: '=',
    Backquote: '`', Tab: 'TAB', CapsLock: 'CAPS', Delete: 'DEL', Home: 'HOME',
    End: 'END', PageUp: 'PGUP', PageDown: 'PGDN', Insert: 'INS',
  };
  function capFor(code) {
    if (KEY_CAPTIONS[code]) return KEY_CAPTIONS[code];
    if (/^Key[A-Z]$/.test(code)) return code.slice(3);
    if (/^Digit[0-9]$/.test(code)) return code.slice(5);
    if (/^Numpad[0-9]$/.test(code)) return 'NUM' + code.slice(6);
    if (/^F([1-9]|1[0-2])$/.test(code)) return code;
    return code.replace(/Left$|Right$/, '').toUpperCase().slice(0, 5);
  }

  var KEY_ACTIONS = ['left', 'right', 'up', 'down', 'sprint', 'jump', 'punch', 'kick', 'throw', 'special', 'grapple', 'mount'];
  var PAD_ACTIONS = ['punch', 'kick', 'special', 'jump', 'throw', 'sprint', 'grapple', 'mount', 'pause', 'restart'];

  /* Full 75 %-style board. Each row lists [code, width-in-units]; a GAP
   * entry is a spacer so the F-key clusters breathe. */
  var KB_UNIT = 42;
  var KB_GAP = 4;
  var KB_ROWS = [
    { y: 38, keys: [['Escape', 1], ['GAP', 0.55], ['F1', 1], ['F2', 1], ['F3', 1], ['F4', 1],
      ['GAP', 0.3], ['F5', 1], ['F6', 1], ['F7', 1], ['F8', 1],
      ['GAP', 0.3], ['F9', 1], ['F10', 1], ['F11', 1], ['F12', 1]] },
    { y: 78, keys: [['Backquote', 1], ['Digit1', 1], ['Digit2', 1], ['Digit3', 1], ['Digit4', 1],
      ['Digit5', 1], ['Digit6', 1], ['Digit7', 1], ['Digit8', 1], ['Digit9', 1], ['Digit0', 1],
      ['Minus', 1], ['Equal', 1], ['Backspace', 1.8]] },
    { y: 118, keys: [['Tab', 1.5], ['KeyQ', 1], ['KeyW', 1], ['KeyE', 1], ['KeyR', 1], ['KeyT', 1],
      ['KeyY', 1], ['KeyU', 1], ['KeyI', 1], ['KeyO', 1], ['KeyP', 1],
      ['BracketLeft', 1], ['BracketRight', 1], ['Backslash', 1.5]] },
    { y: 158, keys: [['CapsLock', 1.8], ['KeyA', 1], ['KeyS', 1], ['KeyD', 1], ['KeyF', 1], ['KeyG', 1],
      ['KeyH', 1], ['KeyJ', 1], ['KeyK', 1], ['KeyL', 1], ['Semicolon', 1], ['Quote', 1],
      ['Enter', 2.2]] },
    { y: 198, keys: [['ShiftLeft', 2.35], ['KeyZ', 1], ['KeyX', 1], ['KeyC', 1], ['KeyV', 1], ['KeyB', 1],
      ['KeyN', 1], ['KeyM', 1], ['Comma', 1], ['Period', 1], ['Slash', 1], ['ShiftRight', 2.35]] },
    { y: 238, keys: [['ControlLeft', 1.3], ['AltLeft', 1.2], ['Space', 6.2], ['AltRight', 1.2], ['ControlRight', 1.3]] },
  ];
  var KB_ARROWS = [['ArrowUp', 806, 158], ['ArrowLeft', 760, 198], ['ArrowDown', 806, 198], ['ArrowRight', 852, 198]];

  /* One keycap: shadow, lit top face, letter and (when bound) its action. */
  function keySvg(code, x, y, w, player, action) {
    var cap = capFor(code);
    var cls = 'vkey' + (action ? ' bound' : '') + (player === 1 ? ' p2' : '');
    var lx = x + w / 2;
    var h = 32;
    var letterY = action ? y + 14 : y + 21;
    var fs = cap.length > 4 ? 7.4 : cap.length > 2 ? 8.8 : 12;
    var out = '<g class="' + cls + '"' + (code ? ' data-code="' + code + '"' : '') + '>' +
      '<rect class="kb" x="' + x + '" y="' + (y + 3) + '" width="' + w + '" height="' + h + '" rx="7"/>' +
      '<rect class="kt" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="7"/>' +
      '<rect x="' + (x + 4) + '" y="' + (y + 2.5) + '" width="' + (w - 8) + '" height="' + (h / 2 - 3) +
        '" rx="5" fill="rgba(255,255,255,.05)"/>' +
      '<text class="kl" x="' + lx + '" y="' + letterY + '" style="font-size:' + fs + 'px">' + cap + '</text>';
    if (action) {
      out += '<text class="ka" x="' + lx + '" y="' + (y + 26) + '">' + T('act.' + action).slice(0, 10) + '</text>';
    }
    return out + '</g>';
  }

  function svgKeyboard(opts) {
    opts = opts || {};
    var player = opts.player || 0;
    var both = !!opts.both;
    var actFor = function (code) {
      if (ARROW_ACTS[code]) return { a: ARROW_ACTS[code], p: player };
      var a1 = actionForCode(code, 0);
      var a2 = actionForCode(code, 1);
      if (both) return a1 ? { a: a1, p: 0 } : a2 ? { a: a2, p: 1 } : null;
      var a = actionForCode(code, player);
      return a ? { a: a, p: player } : null;
    };
    /* Arrow keys are a permanent second movement axis, so they light up with
     * the direction they drive even though WASD is what is bound. */
    var ARROW_ACTS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
    var body = '';
    var x0 = 36;
    var maxX = x0;
    KB_ROWS.forEach(function (row) {
      var x = x0;
      row.keys.forEach(function (k) {
        var w = k[1] * KB_UNIT + (k[1] - 1) * KB_GAP;
        if (k[0] === 'GAP') {
          w = k[1] * KB_UNIT;
        } else {
          var hit = actFor(k[0]);
          body += keySvg(k[0], x, row.y, w, hit ? hit.p : 0, hit ? hit.a : null);
        }
        x += w + KB_GAP;
      });
      if (x > maxX) maxX = x;
    });
    KB_ARROWS.forEach(function (triple) {
      var hit = actFor(triple[0]);
      body += keySvg(triple[0], triple[1], triple[2], KB_UNIT, hit ? hit.p : 0, hit ? hit.a : null);
    });

    return '<svg class="vr-kb" viewBox="0 0 920 300" role="img" aria-label="' + T('tabKeys') + '">' +
      '<defs>' +
        '<linearGradient id="kbDeck" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#2a2042"/><stop offset="1" stop-color="#140e22"/>' +
        '</linearGradient>' +
        '<linearGradient id="kbGold" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#fff3c9"/><stop offset=".55" stop-color="#ffd76e"/><stop offset="1" stop-color="#c98f38"/>' +
        '</linearGradient>' +
        '<linearGradient id="kbCyan" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#dcfbff"/><stop offset=".55" stop-color="#6be0ff"/><stop offset="1" stop-color="#2b7f95"/>' +
        '</linearGradient>' +
        '<linearGradient id="kbKey" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#3a2e5a"/><stop offset="1" stop-color="#241c38"/>' +
        '</linearGradient>' +
        '<filter id="kbGlow" x="-30%" y="-30%" width="160%" height="170%">' +
          '<feDropShadow dx="0" dy="6" stdDeviation="9" flood-color="#000" flood-opacity=".5"/>' +
          '<feDropShadow dx="0" dy="0" stdDeviation="1.6" flood-color="#ffd76e" flood-opacity=".18"/>' +
        '</filter>' +
      '</defs>' +
      '<g filter="url(#kbGlow)">' +
        '<rect x="18" y="12" width="884" height="274" rx="20" fill="url(#kbDeck)" stroke="rgba(255,215,110,.3)" stroke-width="1.5"/>' +
        '<rect x="26" y="20" width="868" height="258" rx="16" fill="none" stroke="rgba(255,255,255,.05)"/>' +
      '</g>' +
      '<g class="vr-keys">' + body + '</g>' +
      '<text x="880" y="278" text-anchor="end" font-family="Cinzel,serif" font-size="7" letter-spacing="2.4" fill="rgba(217,180,90,.55)">VOXEL RAGE</text>' +
      '</svg>';
  }

  function padButtonSvg(cx, cy, r, letter, action, index, p2) {
    return '<g class="vpadbtn' + (p2 ? ' p2' : '') + '" data-pad="' + index + '" data-act="' + action + '">' +
      '<circle class="pb-base" cx="' + cx + '" cy="' + (cy + 2) + '" r="' + (r + 3) + '"/>' +
      '<circle class="pb-top" cx="' + cx + '" cy="' + cy + '" r="' + r + '"/>' +
      '<circle cx="' + cx + '" cy="' + (cy - r * 0.3) + '" r="' + (r * 0.6) + '" fill="rgba(255,255,255,.05)"/>' +
      '<text class="pb-letter" x="' + cx + '" y="' + (cy - 1) + '">' + letter + '</text>' +
      '<text class="pb-act" x="' + cx + '" y="' + (cy + 11) + '">' + T('act.' + action).slice(0, 7) + '</text>' +
      '</g>';
  }

  /* The gamepad: one continuous outline in the style of a modern pad — wide
   * shoulders that cradle two slim bumpers, a small raised bridge with the
   * round home button, a plus-shaped D-pad, four face buttons and two sticks —
   * drawn as a single gold hairline over a purple glass body. Mirror-symmetric
   * about x = 460. Clicking any element binds it. */
  var PAD_OUTLINE =
    'M392 206C384 208 376 216 374 232C360 228 352 224 344 220C330 214 314 206 300 200' +
    'C282 192 266 189 252 190C230 190 212 192 200 196C184 202 170 210 166 222' +
    'C160 236 156 250 156 266C156 288 158 304 162 320C166 340 172 356 178 372' +
    'C182 392 184 414 186 436C190 470 194 520 200 546C206 572 220 590 244 592' +
    'C268 594 286 580 292 554C296 528 298 500 304 478C308 468 312 464 320 458' +
    'C336 446 350 444 362 442C394 434 426 432 460 432C494 432 526 434 558 442' +
    'C570 444 584 446 600 458C608 464 612 468 616 478C622 500 624 528 628 554' +
    'C634 580 652 594 676 592C700 590 714 572 720 546C726 520 730 470 734 436' +
    'C736 414 738 392 742 372C748 356 754 340 758 320C762 304 764 288 764 266' +
    'C764 250 760 236 754 222C750 210 736 202 720 196C708 192 690 190 668 190' +
    'C654 189 638 192 620 200C606 206 590 214 576 220C568 224 560 228 546 232' +
    'C544 216 536 208 528 206Z';

  function svgPad(opts) {
    opts = opts || {};

    var face = [
      padButtonSvg(634, 250, 22, 'Y', 'special', 3, false),
      padButtonSvg(586, 300, 22, 'X', 'kick', 2, false),
      padButtonSvg(682, 300, 22, 'B', 'jump', 1, false),
      padButtonSvg(634, 350, 22, 'A', 'punch', 0, false),
    ].join('');

    var dpad =
      '<g class="vpd">' +
        '<path d="M306 396 H334 V416 H360 V444 H334 V464 H306 V444 H280 V416 H306 Z"/>' +
        '<circle cx="320" cy="430" r="3.6"/>' +
      '</g>';

    var stick = function (cx, cy, label) {
      return '<g class="vpstick">' +
        '<circle class="vs-base" cx="' + cx + '" cy="' + (cy + 2) + '" r="42"/>' +
        '<circle class="vs-ring" cx="' + cx + '" cy="' + cy + '" r="32"/>' +
        '<circle class="vs-ring" cx="' + cx + '" cy="' + cy + '" r="21" stroke-opacity=".32"/>' +
        '<circle class="vs-dot" cx="' + cx + '" cy="' + cy + '" r="8"/>' +
        (label ? '<text class="vp-label" x="' + cx + '" y="' + (cy + 60) + '">' + label + '</text>' : '') +
      '</g>';
    };

    /* Slim triggers behind, rounded bumpers in front — both hugging the
     * shoulder ridge so the pad reads as one piece. */
    /* Shoulders follow the shell: a slim trigger peeking out behind a rounded
     * bumper, both angled with the top-left / top-right edge. */
    var bumpers =
      '<g transform="rotate(-8 251 191)">' +
        '<rect x="192" y="162" width="124" height="13" rx="6.5" fill="rgba(255,255,255,.06)" stroke="rgba(255,215,110,.3)" stroke-width="1.1"/>' +
        '<text x="254" y="171.5" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-size="7.5" font-weight="700" fill="#8f86b8" letter-spacing="1">LT</text>' +
        '<rect x="182" y="178" width="148" height="26" rx="13" fill="rgba(255,255,255,.06)" stroke="rgba(255,215,110,.55)" stroke-width="1.5"/>' +
        '<text x="256" y="196" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-size="10.5" font-weight="700" fill="#d8cdf2" letter-spacing="1">LB</text>' +
      '</g>' +
      '<g transform="rotate(8 669 191)">' +
        '<rect x="604" y="162" width="124" height="13" rx="6.5" fill="rgba(255,255,255,.06)" stroke="rgba(255,215,110,.3)" stroke-width="1.1"/>' +
        '<text x="666" y="171.5" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-size="7.5" font-weight="700" fill="#8f86b8" letter-spacing="1">RT</text>' +
        '<rect x="590" y="178" width="148" height="26" rx="13" fill="rgba(255,255,255,.06)" stroke="rgba(255,215,110,.55)" stroke-width="1.5"/>' +
        '<text x="664" y="196" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-size="10.5" font-weight="700" fill="#d8cdf2" letter-spacing="1">RB</text>' +
      '</g>';

    /* Bumpers and triggers are their own click targets, so they sit above the
     * body stroke rather than inside it. */
    var bumperHits =
      '<g class="vpbumper" data-pad="4" data-act="grapple">' +
        '<rect x="182" y="178" width="148" height="26" rx="13" transform="rotate(-8 251 191)"/>' +
      '</g>' +
      '<g class="vpbumper" data-pad="5" data-act="mount">' +
        '<rect x="590" y="178" width="148" height="26" rx="13" transform="rotate(8 669 191)"/>' +
      '</g>' +
      '<g class="vpbumper" data-pad="6" data-act="throw">' +
        '<rect x="192" y="162" width="124" height="13" rx="6.5" transform="rotate(-8 251 191)"/>' +
      '</g>' +
      '<g class="vpbumper" data-pad="7" data-act="sprint">' +
        '<rect x="604" y="162" width="124" height="13" rx="6.5" transform="rotate(8 669 191)"/>' +
      '</g>';

    var centre =
      '<g class="vpguide" data-pad="9" data-act="pause">' +
        '<circle cx="460" cy="248" r="15.5" fill="rgba(255,255,255,.05)" stroke="#ffd76e" stroke-width="1.6"/>' +
        '<circle cx="460" cy="248" r="9" fill="none" stroke="rgba(255,215,110,.5)" stroke-width="1.2"/>' +
        '<path d="M460 241 l2.6 4.4 4.8 1 -3.4 3.6 0.8 4.9 -4.8 -2.3 -4.8 2.3 0.8 -4.9 -3.4 -3.6 4.8 -1 z" ' +
          'fill="rgba(255,215,110,.85)"/>' +
      '</g>' +
      '<g class="vpstart" data-pad="8" data-act="restart">' +
        '<rect x="420" y="304" width="28" height="10" rx="5" fill="rgba(255,255,255,.16)" stroke="rgba(255,255,255,.3)" stroke-width="1"/>' +
        '<rect x="472" y="304" width="28" height="10" rx="5" fill="rgba(255,255,255,.16)" stroke="rgba(255,255,255,.3)" stroke-width="1"/>' +
      '</g>';

    return '<svg class="vr-pad" viewBox="134 136 652 480" role="img" aria-label="' + T('tabPad') + '">' +
      '<defs>' +
        '<linearGradient id="padFill" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#403059" stop-opacity=".97"/>' +
          '<stop offset=".46" stop-color="#271d3d" stop-opacity=".98"/>' +
          '<stop offset="1" stop-color="#120d20" stop-opacity=".99"/>' +
        '</linearGradient>' +
        '<linearGradient id="padSheen" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#ffffff" stop-opacity=".2"/>' +
          '<stop offset=".5" stop-color="#ffffff" stop-opacity=".03"/>' +
          '<stop offset="1" stop-color="#ffffff" stop-opacity="0"/>' +
        '</linearGradient>' +
        '<linearGradient id="padEdge" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#ffe9b0"/>' +
          '<stop offset=".55" stop-color="#ffd76e"/>' +
          '<stop offset="1" stop-color="#a8722a"/>' +
        '</linearGradient>' +
        '<filter id="padGlow" x="-25%" y="-25%" width="150%" height="150%">' +
          '<feDropShadow dx="0" dy="16" stdDeviation="16" flood-color="#000" flood-opacity=".55"/>' +
          '<feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="#ffc861" flood-opacity=".3"/>' +
        '</filter>' +
      '</defs>' +
      '<g filter="url(#padGlow)">' +
        '<path d="' + PAD_OUTLINE + '" fill="url(#padFill)"/>' +
        '<path d="' + PAD_OUTLINE + '" fill="url(#padSheen)"/>' +
        '<path d="' + PAD_OUTLINE + '" fill="none" stroke="url(#padEdge)" stroke-width="3.2" stroke-linejoin="round"/>' +
        '<path d="' + PAD_OUTLINE + '" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="1" stroke-linejoin="round" transform="translate(0,2)"/>' +
      '</g>' +
      '<path d="M404 240C420 226 440 218 460 218C480 218 500 226 516 240" fill="none" ' +
        'stroke="rgba(255,215,110,.22)" stroke-width="1.6" stroke-linecap="round"/>' +
      bumpers + bumperHits +
      stick(296, 300, 'MOVE') + dpad +
      stick(550, 396, '') +
      face + centre +
      '</svg>';
  }
  /* One row in a diagram legend: action name, P1 key, P2 key. */
  function legendRows(actions, usePad) {
    var b = bridge();
    var map = global.VoxelPad ? global.VoxelPad.getMap() : {};
    return actions.map(function (a) {
      var right = '';
      if (usePad) {
        right = '<span class="vr-padkey">' + (global.VoxelPad ? global.VoxelPad.padName(map[a]) : 'B' + map[a]) + '</span>';
      } else {
        var c1 = b && b.controls ? b.keyLabel(b.controls[0][a]) : '';
        var c2 = b && b.controls ? b.keyLabel(b.controls[1][a]) : '';
        /* Both players share one layout, so show the key once. */
        right = c1 === c2
          ? '<span class="vr-cap">' + c1 + '</span>'
          : '<span class="vr-cap">' + c1 + '</span><span class="vr-cap p2">' + c2 + '</span>';
      }
      return '<div class="vr-legrow"><span class="vr-legname">' + T('act.' + a) + '</span>' + right + '</div>';
    }).join('');
  }

  var GUIDE_TABS = [
    ['keys', 'tabKeys'], ['pad', 'tabPad'], ['play', 'gtabPlay'],
  ];

  function buildGuide() {
    var modal = el('div', 'vr-modal');
    modal.id = 'vrGuide';
    modal.hidden = true;
    modal.setAttribute('data-noi18n', '');
    modal.innerHTML =
      '<div class="vr-sheet vr-guide-sheet" role="dialog" aria-modal="true">' +
        '<div class="vr-sheet-head"><div><div class="vr-kicker">VOXEL RAGE</div><h2></h2></div>' +
        '<div class="vr-head-right"><span class="vr-langslot"></span>' +
        '<button class="vr-x" type="button" aria-label="close">✕</button></div></div>' +
        '<div class="vr-gtabs">' +
          GUIDE_TABS.map(function (t) {
            return '<button class="vr-gtab" type="button" data-gtab="' + t[0] + '">' + T(t[1]) + '</button>';
          }).join('') +
        '</div>' +
        '<div class="vr-guide-body"></div>' +
        '<div class="vr-sheet-foot"><span class="vr-note"></span>' +
        '<button class="vr-btn primary" type="button" data-act="close"></button></div>' +
      '</div>';
    global.document.body.appendChild(modal);
    ui.guide = modal;
    addCorners(modal.querySelector('.vr-sheet'));
    if (global.VoxelI18n) global.VoxelI18n.attach(modal.querySelector('.vr-langslot'));
    modal.querySelector('.vr-x').addEventListener('click', closeGuide);
    modal.querySelector('[data-act="close"]').addEventListener('click', closeGuide);
    modal.addEventListener('click', function (ev) { if (ev.target === modal) closeGuide(); });
    modal.querySelectorAll('.vr-gtab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        ui.guideTab = btn.dataset.gtab;
        renderGuide();
      });
    });
    renderGuide();
  }

  function renderGuide() {
    var modal = ui.guide;
    if (!modal) return;
    var tab = ui.guideTab || 'keys';
    modal.querySelector('h2').textContent = T('guideTitle');
    modal.querySelectorAll('.vr-gtab').forEach(function (b) {
      b.textContent = T(b.dataset.gtab === 'keys' ? 'tabKeys' : b.dataset.gtab === 'pad' ? 'tabPad' : 'gtabPlay');
      b.classList.toggle('on', b.dataset.gtab === tab);
    });
    var body = modal.querySelector('.vr-guide-body');
    if (tab === 'keys') {
      body.innerHTML =
        '<p class="vr-guide-lede">' + T('guideKeys') + '</p>' +
        '<div class="vr-gdiagram">' + svgKeyboard({ both: true }) + '</div>' +
        '<div class="vr-glegend">' +
          '<div class="vr-legcol"><h4>' + T('gMove') + '</h4>' +
            legendRows(['left', 'right', 'up', 'down', 'sprint', 'jump']) + '</div>' +
          '<div class="vr-legcol"><h4>' + T('gCombat') + '</h4>' +
            legendRows(['punch', 'kick', 'throw', 'special', 'grapple', 'mount']) + '</div>' +
        '</div>' +
        '<p class="vr-gnote">' + T('guideKeysNote') + '</p>';
    } else if (tab === 'pad') {
      body.innerHTML =
        '<p class="vr-guide-lede">' + T('guidePad') + '</p>' +
        '<div class="vr-gdiagram vr-gdiagram-pad">' + svgPad({}) + '</div>' +
        '<div class="vr-glegend">' +
          '<div class="vr-legcol"><h4>' + T('gCombat') + '</h4>' +
            legendRows(['punch', 'kick', 'special', 'jump', 'throw'], true) + '</div>' +
          '<div class="vr-legcol"><h4>' + T('gMove') + '</h4>' +
            legendRows(['sprint', 'grapple', 'mount', 'pause', 'restart'], true) + '</div>' +
        '</div>' +
        '<p class="vr-gnote">' + T('guidePadNote') + '</p>';
    } else {
      var food = [
        grow(ICONS.doner, T('iDoner'), T('iDonerD')),
        grow(ICONS.ayran, T('iAyran'), T('iAyranD')),
        grow(ICONS.gold, T('iGold'), T('iGoldD')),
      ];
      var weapons = [
        grow(ICONS.pistole, T('wPistol'), T('wPistolD')),
        grow(ICONS.gewehr, T('wRifle'), T('wRifleD')),
        grow(ICONS.bazooka, T('wBazooka'), T('wBazookaD')),
        grow(ICONS.baseball, T('wBat'), T('wBatD')),
        grow(ICONS.schlagring, T('wKnuckle'), T('wKnuckleD')),
        grow(ICONS.kusarigama, T('wKusarigama'), T('wKusarigamaD')),
      ];
      var sections = [
        gsec(T('gMove'), [
          grow('', T('gWalk'), T('gWalkD'), capsPair(['left', 'right', 'up', 'down'])),
          grow('', T('gRun'), T('gRunD'), capsPair(['sprint'])),
          grow('', T('gJump'), T('gJumpD'), capsPair(['jump'])),
        ]),
        gsec(T('gCombat'), [
          grow('', T('gPunch'), T('gPunchD'), capsPair(['punch'])),
          grow('', T('gKick'), T('gKickD'), capsPair(['kick'])),
          grow('', T('gSpecial'), T('gSpecialD'), capsPair(['special'])),
        ]),
        gsec(T('gGrabTitle'), [
          grow('', T('gGrab'), T('gGrabD'), capsPair(['grapple'])),
          grow('', T('gThrow'), T('gThrowD'), capsPair(['punch'])),
        ]),
        gsec(T('gDonkey'), [
          grow('', T('gMount'), T('gMountD'), capsPair(['mount'])),
          grow('', T('gHop'), T('gHopD'), capsPair(['jump'])),
          grow('', T('gFront'), T('gFrontD')),
          grow('', T('gSpin'), T('gSpinD')),
          grow('', T('gSuper'), T('gSuperD')),
        ]),
        gsec(T('gFood'), food.concat([grow('', '', T('gFoodD'))])),
        gsec(T('gWeapons'), weapons.concat([grow('', '', T('gWeaponsD'))])),
      ];
      body.innerHTML =
        '<p class="vr-guide-lede">' + T('guideLede') + '</p>' +
        '<div class="vr-guide-grid">' + sections.join('') + '</div>';
    }
    modal.querySelector('.vr-sheet-foot .vr-note').textContent = '';
    modal.querySelector('[data-act="close"]').textContent = T('guideClose');
  }
  function openGuide(tab) {
    if (!ui.guide) return;
    if (tab) ui.guideTab = tab;
    ui.guide.hidden = false;
    if (global.VoxelPad && global.VoxelPad.setActive) global.VoxelPad.setActive(false);
    renderGuide();
  }
  function closeGuide() {
    if (!ui.guide) return;
    ui.guide.hidden = true;
    if (global.VoxelPad && global.VoxelPad.setActive) global.VoxelPad.setActive(true);
  }
  function guideOpen() { return !!(ui.guide && !ui.guide.hidden); }

  /* ---------------------------- controls window --------------------------- */
  var ui = {
    modal: null, tab: 'pad', player: 0, listen: null, padState: null,
    guide: null, guideTab: 'keys',
  };

  function boundColor(code, player) {
    var b = bridge();
    if (!b || !b.controls) return 0;
    var set = b.controls[player] || {};
    for (var a in set) if (set[a] === code) return player === 0 ? 0xffd76e : 0x6be0ff;
    return 0;
  }

  function renderControlsText() {
    if (!ui.modal) return;
    var q = function (s) { return ui.modal.querySelector(s); };
    q('.vr-sheet-head h2').textContent = T('controlsTitle');
    ui.modal.querySelectorAll('.vr-tab').forEach(function (b) {
      b.textContent = (b.dataset.tab === 'pad' ? '🎮 ' : '⌨ ') + T(b.dataset.tab === 'pad' ? 'tabPad' : 'tabKeys');
      b.classList.toggle('on', b.dataset.tab === ui.tab);
    });
    q('.vr-stagehint').textContent = T('clickBind');
    q('[data-act="reset"]').textContent = T('reset');
    q('[data-act="close"]').textContent = T('done');
    q('.vr-note').textContent = ui.tab === 'pad' ? T('padPitch') : T('keysPitch');
    var seg = q('.vr-seg');
    seg.classList.toggle('vr-hidden', ui.tab !== 'keys');
    seg.querySelectorAll('button').forEach(function (b, i) {
      b.textContent = i === 0 ? 'P1' : 'P2';
      b.classList.toggle('on', ui.player === i);
    });
    q('.vr-padstate').textContent = ui.padState && ui.padState.connected
      ? T('padConnected') : T('padNone');
    renderDiagram();
    renderList();
  }

  function renderDiagram() {
    if (!ui.modal) return;
    var stage = ui.modal.querySelector('.vr-diagram');
    if (!stage) return;
    stage.innerHTML = ui.tab === 'pad'
      ? svgPad({})
      : svgKeyboard({ player: ui.player, interactive: true });
    highlightModel();
  }

  function renderList() {
    if (!ui.modal) return;
    var list = ui.modal.querySelector('.vr-list');
    var b = bridge();
    var rows = ui.tab === 'pad' ? PAD_ACTIONS : KEY_ACTIONS;
    var map = global.VoxelPad ? global.VoxelPad.getMap() : {};
    list.innerHTML = '';
    rows.forEach(function (action) {
      var row = el('div', 'vr-row');
      row.dataset.action = action;
      var label = el('span', 'vr-row-label', T('act.' + action));
      var value = el('button', 'vr-key');
      value.type = 'button';
      if (ui.tab === 'pad') {
        value.textContent = global.VoxelPad ? global.VoxelPad.padName(map[action]) : ('B' + map[action]);
      } else {
        var code = b && b.controls && b.controls[ui.player] ? b.controls[ui.player][action] : '';
        value.textContent = b && b.keyLabel ? b.keyLabel(code) : (code || '—');
      }
      if (ui.listen && ui.listen.action === action) {
        row.classList.add('listening');
        value.textContent = T('listening');
      }
      row.appendChild(label);
      row.appendChild(value);
      row.addEventListener('click', function () { startListen(action); });
      list.appendChild(row);
    });
    var fixed = ui.modal.querySelector('.vr-fixed');
    if (ui.tab === 'pad') {
      fixed.textContent = T('act.left') + ' / ' + T('act.right') + ' / ' + T('act.up') + ' / ' + T('act.down')
        + '  ·  ' + (lang() === 'de' ? 'linker Stick + Steuerkreuz (fest)' : 'left stick + D-pad (fixed)');
    } else {
      fixed.textContent = lang() === 'de'
        ? 'P, M, R, ESC und Funktionstasten bleiben Spieltasten.'
        : 'P, M, R, ESC and function keys stay game keys.';
    }
    highlightModel();
  }

  function highlightModel() {
    if (!ui.modal) return;
    var svg = ui.modal.querySelector('.vr-diagram svg');
    if (!svg) return;
    svg.querySelectorAll('.is-listen').forEach(function (n) { n.classList.remove('is-listen'); });
    if (!ui.listen) return;
    var action = ui.listen.action;
    if (ui.tab === 'keys') {
      var b = bridge();
      var code = b && b.controls && b.controls[ui.player] ? b.controls[ui.player][action] : null;
      var node = code ? svg.querySelector('.vkey[data-code="' + code + '"]') : null;
      if (node) node.classList.add('is-listen');
    } else {
      var map = global.VoxelPad ? global.VoxelPad.getMap() : {};
      var idx = map[action];
      var el2 = idx != null ? svg.querySelector('[data-pad="' + idx + '"]') : null;
      if (el2) el2.classList.add('is-listen');
    }
  }

  function actionForCode(code, player) {
    var b = bridge();
    if (!b || !b.controls) return null;
    var set = b.controls[player] || {};
    for (var a in set) if (set[a] === code) return a;
    return null;
  }

  function startListen(action) {
    ui.listen = { action: action };
    renderList();
    if (ui.tab === 'pad' && global.VoxelPad) {
      global.VoxelPad.beginCapture(function (btn) {
        if (!ui.listen) return;
        assignPad(ui.listen.action, btn);
      });
    }
  }

  function assignPad(action, button) {
    if (!global.VoxelPad) return;
    global.VoxelPad.setBinding(action, button);
    ui.listen = null;
    renderList();
  }

  function assignKey(code) {
    var b = bridge();
    if (!b || !b.controls) return;
    if (b.isReservedBind && b.isReservedBind(code)) {
      toast((b.keyLabel ? b.keyLabel(code) : code) + ' ' + T('reserved'));
      return;
    }
    var pick = ui.listen;
    if (!pick) return;
    var old = b.controls[ui.player][pick.action];
    var set = b.controls[ui.player];
    if (old === code) { ui.listen = null; renderList(); return; }
    /* Swap instead of duplicating, exactly like the in-game remap. */
    for (var p = 0; p < 2; p++) {
      for (var a in b.controls[p]) {
        if (p === ui.player && a === pick.action) continue;
        if (b.controls[p][a] === code) b.controls[p][a] = old;
      }
    }
    set[pick.action] = code;
    ui.listen = null;
    if (b.saveBindings) b.saveBindings();
    if (b.refreshBindingUI) b.refreshBindingUI();
    renderList();
    renderDiagram();
  }

  function bindDiagramPointer() {
    var stage = ui.modal.querySelector('.vr-diagram');
    if (!stage) return;
    stage.addEventListener('click', function (ev) {
      var key = ev.target.closest('.vkey[data-code]');
      if (key) {
        if (!ui.listen) { toast(T('pickFirst')); return; }
        assignKey(key.dataset.code);
        return;
      }
      var pad = ev.target.closest('[data-pad]');
      if (pad) {
        if (!ui.listen) { toast(T('pickFirst')); return; }
        assignPad(ui.listen.action, +pad.dataset.pad);
      }
    });
  }

  function buildControlsModal() {
    var modal = el('div', 'vr-modal');
    modal.id = 'vrControls';
    modal.hidden = true;
    modal.setAttribute('data-noi18n', '');
    modal.innerHTML =
      '<div class="vr-sheet" role="dialog" aria-modal="true">' +
        '<div class="vr-sheet-head">' +
          '<div><div class="vr-kicker">VOXEL RAGE</div><h2></h2></div>' +
          '<div class="vr-head-right"><span class="vr-padstate"></span>' +
            '<span class="vr-langslot"></span>' +
            '<button class="vr-x" type="button" aria-label="close">✕</button></div>' +
        '</div>' +
        '<div class="vr-tabs">' +
          '<button class="vr-tab on" type="button" data-tab="pad"></button>' +
          '<button class="vr-tab" type="button" data-tab="keys"></button>' +
        '</div>' +
        '<div class="vr-body">' +
          '<div class="vr-stage"><div class="vr-diagram"></div><div class="vr-stagehint"></div></div>' +
          '<div class="vr-side">' +
            '<div class="vr-side-head"><div class="vr-seg vr-hidden">' +
              '<button type="button" data-p="0">P1</button><button type="button" data-p="1">P2</button>' +
            '</div></div>' +
            '<div class="vr-list"></div>' +
            '<div class="vr-fixed"></div>' +
          '</div>' +
        '</div>' +
        '<div class="vr-sheet-foot">' +
          '<button class="vr-btn" type="button" data-act="reset"></button>' +
          '<span class="vr-note"></span>' +
          '<button class="vr-btn primary" type="button" data-act="close"></button>' +
        '</div>' +
      '</div>';
    global.document.body.appendChild(modal);
    ui.modal = modal;
    addCorners(modal.querySelector('.vr-sheet'));

    if (global.VoxelI18n) global.VoxelI18n.attach(modal.querySelector('.vr-langslot'));

    modal.querySelector('.vr-x').addEventListener('click', closeControls);
    modal.querySelector('[data-act="close"]').addEventListener('click', closeControls);
    modal.addEventListener('click', function (ev) {
      if (ev.target === modal) closeControls();
    });
    modal.querySelectorAll('.vr-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        ui.tab = btn.dataset.tab;
        ui.listen = null;
        if (global.VoxelPad) global.VoxelPad.cancelCapture();
        ui.modal.querySelectorAll('.vr-tab').forEach(function (b) { b.classList.toggle('on', b === btn); });
        renderControlsText();
      });
    });
    modal.querySelectorAll('.vr-seg button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        ui.player = +btn.dataset.p;
        ui.listen = null;
        renderControlsText();
      });
    });
    modal.querySelector('[data-act="reset"]').addEventListener('click', function () {
      var b = bridge();
      if (ui.tab === 'pad') {
        if (global.VoxelPad) global.VoxelPad.reset();
      } else if (b && b.controls) {
        b.controls.forEach(function (set, i) {
          if (b.defaultControls && b.defaultControls[i]) Object.assign(set, b.defaultControls[i]);
        });
        if (b.saveBindings) b.saveBindings();
        if (b.refreshBindingUI) b.refreshBindingUI();
      }
      ui.listen = null;
      if (global.VoxelPad) global.VoxelPad.cancelCapture();
      renderControlsText();
    });
    modal.querySelector('.vr-list').addEventListener('keydown', function (ev) { ev.stopPropagation(); });
    bindDiagramPointer();
  }

  function openControls() {
    if (!ui.modal) return;
    ui.modal.hidden = false;
    if (global.VoxelPad && global.VoxelPad.setActive) global.VoxelPad.setActive(false);
    renderControlsText();
  }
  function closeControls() {
    if (!ui.modal) return;
    ui.modal.hidden = true;
    ui.listen = null;
    if (global.VoxelPad) {
      global.VoxelPad.cancelCapture();
      if (global.VoxelPad.setActive) global.VoxelPad.setActive(true);
    }
  }
  function rebuildScene() { renderDiagram(); }

  /* ---------------------------- display filters --------------------------- */
  var FX_KEY = 'voxel-rage-fx-v1';
  var fx = { vignette: 35, crt: false, watercolor: false, cinematic: false };
  var fxEl = null;
  var visualsModal = null;

  function loadFx() {
    try {
      var raw = global.localStorage && global.localStorage.getItem(FX_KEY);
      if (!raw) return;
      var o = JSON.parse(raw);
      if (o.vignette != null) fx.vignette = Math.max(0, Math.min(100, +o.vignette || 0));
      fx.crt = !!o.crt;
      fx.watercolor = !!o.watercolor;
      fx.cinematic = !!o.cinematic;
    } catch (e) {}
  }
  function saveFx() {
    try { global.localStorage.setItem(FX_KEY, JSON.stringify(fx)); } catch (e) {}
  }
  function buildFxLayer() {
    if (fxEl) return fxEl;
    fxEl = el('div');
    fxEl.id = 'vrFx';
    fxEl.setAttribute('aria-hidden', 'true');
    fxEl.innerHTML = '<i class="fx-grade"></i><i class="fx-grain"></i><i class="fx-scan"></i>' +
      '<i class="fx-vig"></i><i class="fx-bars"></i>';
    global.document.body.appendChild(fxEl);
    applyFx();
    return fxEl;
  }
  function applyFx() {
    if (fxEl) {
      fxEl.style.setProperty('--vig', (fx.vignette / 100 * 0.92).toFixed(3));
      fxEl.classList.toggle('crt', fx.crt);
      fxEl.classList.toggle('watercolor', fx.watercolor);
      fxEl.classList.toggle('cinematic', fx.cinematic);
    }
    refreshFxUI();
  }

  function fxRow(label, control) {
    return '<div class="vr-fxrow"><span>' + label + '</span>' + control + '</div>';
  }
  function buildVisualsModal() {
    var modal = el('div', 'vr-modal');
    modal.id = 'vrVisuals';
    modal.hidden = true;
    modal.setAttribute('data-noi18n', '');
    modal.innerHTML =
      '<div class="vr-sheet vr-visuals-sheet" role="dialog" aria-modal="true">' +
        '<div class="vr-sheet-head"><div><div class="vr-kicker">VOXEL RAGE</div><h2></h2></div>' +
        '<div class="vr-head-right"><span class="vr-langslot"></span>' +
        '<button class="vr-x" type="button" aria-label="close">✕</button></div></div>' +
        '<div class="vr-visuals-body">' +
          '<div class="vr-fxrow"><span data-role="viglabel"></span>' +
            '<div class="vr-fxslider">' +
              '<input class="vr-range" type="range" min="0" max="100" step="1" data-fx="vignette">' +
              '<span class="vr-fxval" data-role="vigval"></span>' +
            '</div>' +
          '</div>' +
          '<div data-role="rows"></div>' +
          '<div class="vr-gnote" data-role="note" style="margin-top:12px"></div>' +
        '</div>' +
        '<div class="vr-sheet-foot">' +
          '<button class="vr-btn" type="button" data-act="fxreset"></button>' +
          '<span class="vr-note"></span>' +
          '<button class="vr-btn primary" type="button" data-act="fxclose"></button>' +
        '</div>' +
      '</div>';
    global.document.body.appendChild(modal);
    visualsModal = modal;
    addCorners(modal.querySelector('.vr-sheet'));
    if (global.VoxelI18n) global.VoxelI18n.attach(modal.querySelector('.vr-langslot'));

    modal.querySelector('.vr-x').addEventListener('click', closeVisuals);
    modal.querySelector('[data-act="fxclose"]').addEventListener('click', closeVisuals);
    modal.addEventListener('click', function (ev) { if (ev.target === modal) closeVisuals(); });
    modal.querySelector('[data-act="fxreset"]').addEventListener('click', function () {
      fx.vignette = 35; fx.crt = false; fx.watercolor = false; fx.cinematic = false;
      saveFx(); applyFx(); renderVisuals();
    });
    modal.querySelector('[data-fx="vignette"]').addEventListener('input', function (ev) {
      fx.vignette = +ev.target.value;
      saveFx(); applyFx();
    });
    renderVisuals();
  }

  function renderVisuals() {
    if (!visualsModal) return;
    var q = function (s) { return visualsModal.querySelector(s); };
    q('h2').textContent = T('displayTitle');
    q('[data-act="fxclose"]').textContent = T('done');
    q('[data-act="fxreset"]').textContent = T('reset');
    q('.vr-note').textContent = T('fxNote');
    q('[data-role="note"]').textContent = T('fxHint');
    q('[data-role="viglabel"]').textContent = T('fxVignette');
    var rows = q('[data-role="rows"]');
    rows.innerHTML =
      fxRow(T('fxCRT'), '<button class="vr-switch' + (fx.crt ? ' on' : '') + '" type="button" data-fx="crt" aria-pressed="' + fx.crt + '"></button>') +
      fxRow(T('fxWatercolor'), '<button class="vr-switch' + (fx.watercolor ? ' on' : '') + '" type="button" data-fx="watercolor" aria-pressed="' + fx.watercolor + '"></button>') +
      fxRow(T('fxCinematic'), '<button class="vr-switch' + (fx.cinematic ? ' on' : '') + '" type="button" data-fx="cinematic" aria-pressed="' + fx.cinematic + '"></button>');
    var vig = q('[data-fx="vignette"]');
    if (vig) vig.value = fx.vignette;
    refreshFxUI();
    rows.querySelectorAll('.vr-switch').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.dataset.fx;
        fx[key] = !fx[key];
        saveFx();
        applyFx();
        renderVisuals();
      });
    });
  }

  function refreshFxUI() {
    if (visualsModal) {
      var v = visualsModal.querySelector('[data-role="vigval"]');
      if (v) v.textContent = fx.vignette + '%';
      var vig = visualsModal.querySelector('[data-fx="vignette"]');
      if (vig && document.activeElement !== vig) vig.value = fx.vignette;
    }
    if (ui.fxLine) {
      var on = [];
      if (fx.crt) on.push('CRT');
      if (fx.watercolor) on.push('AQUA');
      if (fx.cinematic) on.push('FILM');
      ui.fxLine.textContent = T('display') + ': ' + fx.vignette + '%' + (on.length ? ' · ' + on.join(' · ') : '');
    }
  }

  function openVisuals() {
    if (!visualsModal) { buildVisualsModal(); }
    renderVisuals();
    visualsModal.hidden = false;
    if (global.VoxelPad && global.VoxelPad.setActive) global.VoxelPad.setActive(false);
  }
  function closeVisuals() {
    if (!visualsModal) return;
    visualsModal.hidden = true;
    if (global.VoxelPad && global.VoxelPad.setActive) global.VoxelPad.setActive(true);
  }

  function addCorners(node) {
    if (!node || node.querySelector(':scope > .vr-corners')) return;
    var c = el('div', 'vr-corners');
    c.setAttribute('aria-hidden', 'true');
    c.innerHTML = '<i></i><i></i><i></i><i></i>';
    node.appendChild(c);
  }

  /* ------------------------------ pause menu ------------------------------ */
  var pauseWrap = null;
  function buildPauseMenu() {
    var pause = global.document.getElementById('pause');
    if (!pause || pause.querySelector('.vr-pause-wrap')) return;
    pauseWrap = el('div', 'vr-pause-wrap');
    pauseWrap.setAttribute('data-noi18n', '');
    pauseWrap.innerHTML =
      '<div class="vr-pause-panel" role="dialog" aria-modal="true">' +
        '<div class="vr-kicker">VOXEL RAGE</div>' +
        '<div class="vr-pause-title">PAUSE</div>' +
        '<div class="vr-pause-sub" data-role="status"></div>' +
        '<div class="vr-pause-grid">' +
          '<button class="vr-btn primary wide" type="button" data-act="resume"><span class="ic">▶</span><span data-t="resume"></span></button>' +
          '<button class="vr-btn" type="button" data-act="restart"><span class="ic">↻</span><span data-t="restart"></span></button>' +
          '<button class="vr-btn" type="button" data-act="controls"><span class="ic">⌨</span><span data-t="controls"></span></button>' +
          '<button class="vr-btn" type="button" data-act="guide"><span class="ic">?</span><span data-t="howTo"></span></button>' +
          '<button class="vr-btn" type="button" data-act="visuals"><span class="ic">◎</span><span data-t="display"></span></button>' +
          '<button class="vr-btn danger wide" type="button" data-act="leave"><span class="ic">⏻</span><span data-t="leave"></span></button>' +
          '<div class="vr-soundrow"><button class="vr-sound-toggle" type="button" data-act="sound"></button>' +
            '<span class="vr-langlabel" data-t="volume"></span>' +
            '<input class="vr-range" type="range" min="0" max="100" step="1">' +
            '<span class="vr-volnum"></span></div>' +
          '<div class="vr-pause-lang"><span class="vr-langlabel" data-t="language"></span><span class="vr-langslot"></span></div>' +
        '</div>' +
        '<div class="vr-pause-note" data-role="note"></div>' +
      '</div>';
    pause.appendChild(pauseWrap);
    addCorners(pauseWrap.querySelector('.vr-pause-panel'));

    /* The game resumes on any click on #pause; our panel must not let
     * button clicks bubble there. The dim backdrop deliberately does
     * nothing — the Resume button is the way back. */
    pauseWrap.addEventListener('click', function (ev) { ev.stopPropagation(); });
    pauseWrap.addEventListener('mousedown', function (ev) { ev.stopPropagation(); });

    if (global.VoxelI18n) global.VoxelI18n.attach(pauseWrap.querySelector('.vr-langslot'));

    pauseWrap.addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-act]');
      if (!btn) return;
      var b = bridge();
      var act = btn.dataset.act;
      if (act === 'resume') { if (b) b.setPaused(false); }
      else if (act === 'restart') { dispatchKey('KeyR'); }
      else if (act === 'controls') { openControls(); }
      else if (act === 'guide') { openGuide(); }
      else if (act === 'visuals') { openVisuals(); }
      else if (act === 'sound') { toggleSound(); }
      else if (act === 'leave') { leaveRun(); }
    });
    var range = pauseWrap.querySelector('.vr-range');
    if (range) range.addEventListener('input', function () { setVolumePct(+range.value); });
    renderPauseText();
  }

  function dispatchKey(code) {
    try {
      global.dispatchEvent(new global.KeyboardEvent('keydown', { code: code, key: code, bubbles: true, cancelable: true }));
      global.dispatchEvent(new global.KeyboardEvent('keyup', { code: code, key: code, bubbles: true, cancelable: true }));
    } catch (e) {}
  }

  function renderPauseText() {
    if (!pauseWrap) return;
    var b = bridge();
    var q = function (s) { return pauseWrap.querySelector(s); };
    q('.vr-pause-title').textContent = T('pause');
    pauseWrap.querySelectorAll('[data-t]').forEach(function (n) { n.textContent = T(n.dataset.t); });
    q('[data-role="note"]').textContent = T('pauseNote');
    q('[data-role="status"]').textContent = pauseStatusLine();
    renderSoundUI();
  }

  /* The pause notice names whoever stopped the round. It has to appear the
   * moment the menu opens, so a light poll keeps it in sync without
   * re-rendering the whole panel. */
  function syncPauseStatus() {
    if (!pauseWrap) return;
    var node = pauseWrap.querySelector('[data-role="status"]');
    if (!node) return;
    var line = pauseStatusLine();
    if (node.textContent !== line) node.textContent = line;
  }

  function pauseStatusLine() {
    var b = bridge();
    if (!b) return '';
    var by = b.pausedBy;
    var role = b.net && b.net.role;
    if (by === 'host' || by === 'guest') {
      var mine = (role === 'host' && by === 'host') || (role === 'guest' && by === 'guest');
      if (mine) return T('pauseByYou');
      return by === 'host' ? T('pauseByP1') : T('pauseByP2');
    }
    if (by === 'local') return T('pauseSolo');
    return '';
  }

  /* ---------------------------- online extras ----------------------------- */
  var onlineEls = null;
  function buildOnlineExtras() {
    var box = global.document.getElementById('onlineBox');
    if (!box || box.querySelector('.vr-online-row')) return;
    var row = el('div', 'vr-online-row');
    var btn = el('button', 'vr-btn small');
    btn.type = 'button';
    btn.textContent = T('inviteCopy');
    var msg = el('span', 'vr-copymsg');
    row.appendChild(btn);
    row.appendChild(msg);
    var state = el('div', 'vr-netstate');
    state.innerHTML = '<i></i><span></span>';
    box.appendChild(row);
    box.appendChild(state);
    onlineEls = { btn: btn, msg: msg, state: state, label: state.querySelector('span') };

    btn.addEventListener('click', function (ev) {
      ev.preventDefault();
      var b = bridge();
      var code = b && b.net && b.net.room;
      if (!code) { msg.textContent = T('noRoom'); return; }
      var url = global.Net && global.Net.inviteUrl ? global.Net.inviteUrl(code) : (global.location.origin + global.location.pathname + '?room=' + code);
      copyText(url).then(function (ok) {
        msg.textContent = ok ? T('copied') : T('copyFail');
        if (ok) toast(T('copied'));
      });
    });
  }

  function copyText(text) {
    if (global.navigator && global.navigator.clipboard && global.navigator.clipboard.writeText) {
      return global.navigator.clipboard.writeText(text).then(function () { return true; }).catch(function () { return legacyCopy(text); });
    }
    return Promise.resolve(legacyCopy(text));
  }
  function legacyCopy(text) {
    try {
      var ta = global.document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0;left:-9999px';
      global.document.body.appendChild(ta);
      ta.select();
      var ok = global.document.execCommand('copy');
      global.document.body.removeChild(ta);
      return !!ok;
    } catch (e) { return false; }
  }

  var relayState = '';
  /* net.js dispatches on window, so listen there (not on document). */
  global.addEventListener('voxel-net-status', function (ev) {
    relayState = ev.detail && ev.detail.state ? ev.detail.state : '';
  });

  function netBadge() {
    var b = bridge();
    if (!b || !b.net || !b.net.role) return { cls: '', label: T('statusIdle') };
    if (relayState === 'reconnecting') {
      return { cls: 'wait', label: T('statusReconnect') };
    }
    if (b.net.role === 'host') {
      return b.net.peer
        ? { cls: 'ok', label: T('statusReady') + ' · ' + (b.net.room || '') }
        : { cls: 'wait', label: T('statusHost') + (b.net.room ? ' · ' + b.net.room : '') };
    }
    return b.net.peer
      ? { cls: 'ok', label: T('statusReady') + ' · ' + T('player2') }
      : { cls: 'wait', label: T('statusGuest') };
  }

  function pollOnline() {
    var b = bridge();
    if (!onlineEls) return;
    var badge = netBadge();
    onlineEls.state.className = 'vr-netstate ' + badge.cls;
    onlineEls.label.textContent = badge.label;
    onlineEls.btn.textContent = T('inviteCopy');
    var hasRole = !!(b && b.net && b.net.role);
    if (!hasRole && !onlineEls.msg.textContent) onlineEls.msg.textContent = T('noRoom');
    else if (hasRole && onlineEls.msg.textContent === T('noRoom')) onlineEls.msg.textContent = '';
    renderPauseText();
  }

  function handleInviteLink() {
    if (!global.Net || !global.Net.roomFromUrl) return;
    var code = global.Net.roomFromUrl();
    if (!code) return;
    var modeBtn = global.document.querySelector('#modeSeg button[data-mode="online"]');
    if (modeBtn) modeBtn.click();
    var input = global.document.getElementById('joinCode');
    var netMsg = global.document.getElementById('netMsg');
    if (input && !input.value) input.value = code;
    if (netMsg) netMsg.textContent = T('inviteFound');
    setTimeout(function () {
      if (input) { try { input.focus(); } catch (e) {} }
    }, 120);
  }

  /* Guests must not stay in a frozen world if the host leaves. */
  var lostShown = false;
  function watchSession() {
    var b = bridge();
    if (!b || !b.net || !b.started) return;
    if (b.net.role !== 'guest') return;
    if (!lostShown && (!b.net.peer || !b.net.live)) {
      lostShown = true;
      showLost();
    }
  }
  function showLost() {
    var modal = el('div', 'vr-modal');
    modal.setAttribute('data-noi18n', '');
    modal.innerHTML =
      '<div class="vr-sheet" style="width:min(520px,100%)">' +
        '<div class="vr-sheet-head"><div><div class="vr-kicker">VOXEL RAGE</div>' +
        '<h2 style="font-size:20px;letter-spacing:.14em"></h2></div></div>' +
        '<div style="padding:0 20px 6px;font-size:10.5px;letter-spacing:.12em;color:#b3a9d6;line-height:1.9"></div>' +
        '<div class="vr-sheet-foot"><button class="vr-btn primary" type="button"></button></div>' +
      '</div>';
    modal.querySelector('h2').textContent = T('hostLeft');
    modal.querySelector('div[style*="padding:0 20px"]').textContent = T('hostLeftBody');
    var btn = modal.querySelector('button');
    btn.textContent = T('toMenu');
    btn.addEventListener('click', leaveRun);
    global.document.body.appendChild(modal);
  }

  function leaveRun() {
    var b = bridge();
    try { if (b && b.net && b.net.close) b.net.close(); } catch (e) {}
    try { if (global.Net && global.Net.clearRoomParam) global.Net.clearRoomParam(); } catch (e) {}
    try { global.location.reload(); } catch (e) {}
  }

  /* --------------------------- menu guide & loot -------------------------- */
  function itemChip(icon, name, value) {
    return '<div class="vr-item"><span class="vr-gicon">' + icon + '</span>' +
      '<span class="vr-itemtxt"><b>' + name + '</b><span>' + value + '</span></span></div>';
  }
  function renderMenuExtras() {
    if (ui.menuFood) {
      ui.menuFood.innerHTML =
        itemChip(ICONS.doner, T('iDoner'), T('iDonerD')) +
        itemChip(ICONS.ayran, T('iAyran'), T('iAyranD')) +
        itemChip(ICONS.gold, T('iGold'), T('iGoldD'));
    }
    if (ui.menuWeapons) {
      ui.menuWeapons.innerHTML =
        itemChip(ICONS.pistole, T('wPistol'), T('wPistolD')) +
        itemChip(ICONS.gewehr, T('wRifle'), T('wRifleD')) +
        itemChip(ICONS.bazooka, T('wBazooka'), T('wBazookaD')) +
        itemChip(ICONS.baseball, T('wBat'), T('wBatD')) +
        itemChip(ICONS.schlagring, T('wKnuckle'), T('wKnuckleD')) +
        itemChip(ICONS.kusarigama, T('wKusarigama'), T('wKusarigamaD'));
    }
    if (ui.menuWeaponNote) ui.menuWeaponNote.textContent = T('gWeaponsD');
    if (ui.menuGuideBtn) ui.menuGuideBtn.textContent = T('howTo');
    if (ui.menuSetupBtn) ui.menuSetupBtn.textContent = T('setup');
    if (ui.menuDisplayBtn) ui.menuDisplayBtn.textContent = T('display');
    refreshFxUI();
  }
  function buildMenuExtras() {
    var help = global.document.getElementById('controlsHelp');
    if (!help) return;
    var card = help.parentNode;
    /* The plain prose blocks are replaced by keycaps, voxel loot chips
     * and the guide window. */
    card.querySelectorAll('.keys').forEach(function (n) {
      if (n !== help) n.classList.add('vr-hidden');
    });

    var actions = el('div', 'vr-actions');
    var guideBtn = el('button', 'vr-btn small');
    guideBtn.type = 'button';
    guideBtn.id = 'vrOpenGuide';
    var setupBtn = el('button', 'vr-btn small');
    setupBtn.type = 'button';
    setupBtn.id = 'vrOpenControls';
    var info = el('span', 'vr-copymsg');
    var displayBtn = el('button', 'vr-btn small');
    displayBtn.type = 'button';
    displayBtn.id = 'vrOpenDisplay';
    actions.appendChild(guideBtn);
    actions.appendChild(setupBtn);
    actions.appendChild(displayBtn);
    actions.appendChild(info);
    card.insertBefore(actions, help.nextSibling);
    guideBtn.addEventListener('click', openGuide);
    setupBtn.addEventListener('click', openControls);
    displayBtn.addEventListener('click', openVisuals);
    ui.menuDisplayBtn = displayBtn;
    ui.menuGuideBtn = guideBtn;
    ui.menuSetupBtn = setupBtn;
    ui.menuPadInfo = info;

    var heads = card.querySelectorAll('.h');
    var lootHead = heads[1];
    if (lootHead) {
      ui.menuFood = el('div', 'vr-itemgrid');
      ui.menuWeapons = el('div', 'vr-itemgrid vr-weapons');
      ui.menuWeaponNote = el('div', 'vr-fixed');
      var frag = global.document.createDocumentFragment();
      frag.appendChild(ui.menuFood);
      frag.appendChild(ui.menuWeapons);
      frag.appendChild(ui.menuWeaponNote);
      card.insertBefore(frag, lootHead.nextSibling);
    }
    renderMenuExtras();
    updatePadStatus();
    renderSoundUI();

    if (global.VoxelPad) {
      global.VoxelPad.onChange(function (st) {
        var was = ui.padState && ui.padState.connected;
        ui.padState = st;
        if (st.connected && !was) toast(T('padToast'));
        updatePadStatus();
        if (ui.modal && !ui.modal.hidden) {
          var pd = ui.modal.querySelector('.vr-padstate');
          if (pd) pd.textContent = st.connected ? T('padConnected') : T('padNone');
        }
      });
    }
  }
  function updatePadStatus() {
    if (!ui.menuPadInfo) return;
    var st = global.VoxelPad ? global.VoxelPad.state() : null;
    ui.padState = st;
    ui.menuPadInfo.textContent = st && st.connected
      ? '🎮 ' + (st.label || T('padLabel'))
      : T('padNone');
    if (ui.menuGuideBtn) ui.menuGuideBtn.textContent = T('howTo');
    if (ui.menuSetupBtn) ui.menuSetupBtn.textContent = T('setup');
  }

  /* ------------------------------- wiring -------------------------------- */
  function buildMenuLanguage() {
    var box = global.document.querySelector('#menu .box');
    if (!box || box.querySelector('.vr-menubar')) return;
    addCorners(box);
    var kicker = box.querySelector('.kicker');
    var bar = el('div', 'vr-menubar');
    var slot = el('span');
    bar.appendChild(slot);
    if (kicker) {
      box.insertBefore(bar, kicker);
      bar.insertBefore(kicker, slot);   // same line as the kicker, no extra height
    } else {
      box.insertBefore(bar, box.firstChild);
    }
    if (global.VoxelI18n) global.VoxelI18n.attach(slot);
  }

  var reservedHandler = null;
  function installKeyCapture() {
    reservedHandler = function (ev) {
      if (ev.__voxelPad) return;
      /* Z bestätigt, X bricht ab — auch in den Fenstern. */
      var isConfirm = ev.code === 'KeyZ';
      var isCancel = ev.code === 'KeyX' || ev.code === 'Escape';
      if (guideOpen()) {
        ev.preventDefault();
        ev.stopImmediatePropagation();
        if (isCancel || isConfirm) closeGuide();
        return;
      }
      if (!ui.modal || ui.modal.hidden) {
        var pauseEl = global.document.getElementById('pause');
        if (!ev.repeat && pauseEl && pauseEl.classList.contains('on') && (isConfirm || isCancel)) {
          var pb = bridge();
          ev.preventDefault();
          ev.stopImmediatePropagation();
          if (pb) pb.setPaused(false);
          return;
        }
        var menuEl = global.document.getElementById('menu');
        var b = bridge();
        if (!ev.repeat && isConfirm && menuEl && !menuEl.classList.contains('hide') && b && !b.started) {
          var tag = global.document.activeElement && global.document.activeElement.tagName;
          if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
          var start = global.document.getElementById('startBtn');
          if (start) {
            ev.preventDefault();
            ev.stopImmediatePropagation();
            start.click();
          }
        }
        return;
      }
      if (ev.code === 'Tab') return;   // keep focus traversal usable
      /* The controls window owns the keyboard while it is open: no
       * punch, no pause, no music toggle leaking into the game. */
      ev.preventDefault();
      ev.stopImmediatePropagation();
      if (ev.repeat) return;
      if (ui.listen) {
        if (ev.code === 'Escape') { ui.listen = null; renderList(); return; }
        assignKey(ev.code);
        return;
      }
      if (isCancel) closeControls();
    };
    global.addEventListener('keydown', reservedHandler, true);
  }

  global.document.addEventListener('voxel-lang', function () {
    if (onlineEls) onlineEls.btn.textContent = T('inviteCopy');
    if (ui.modal && !ui.modal.hidden) { renderControlsText(); rebuildScene(); }
    renderMenuExtras();
    renderGuide();
    renderVisuals();
    renderPauseText();
    updatePadStatus();
  });

  function boot() {
    if (!bridge()) return;
    if (booted) return;
    booted = true;
    /* Small handle for tests and for the browser console. */
    global.VoxelUI = { open: openControls, close: closeControls, state: ui };
    injectCSS();
    loadFx();
    buildFxLayer();
    buildVisualsModal();
    loadSound();
    menuAudio();
    buildMenuLanguage();
    buildSoundUI();
    buildMenuExtras();
    buildPauseMenu();
    buildControlsModal();
    buildGuide();
    enhanceHud();
    buildOnlineExtras();
    installKeyCapture();
    handleInviteLink();
    applySound();
    setInterval(function () { updateHud(); syncMenuMusic(); syncPauseStatus(); }, 120);
    setInterval(function () { pollOnline(); watchSession(); syncGameMute(); }, 600);
  }
  function waitForBridge() {
    if (bridge()) return boot();
    var tries = 0;
    var iv = setInterval(function () {
      if (bridge()) { clearInterval(iv); boot(); }
      else if (++tries > 300) clearInterval(iv);
    }, 50);
  }

  if (global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', waitForBridge);
  } else {
    waitForBridge();
  }
})(typeof window !== 'undefined' ? window : globalThis);
