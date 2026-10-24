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
        punch: 'SCHLAG', kick: 'KICK', special: 'SPEZIAL', jump: 'SPRUNG', sprint: 'RENNEN',
        grapple: 'GREIFEN', mount: 'ESEL', pause: 'PAUSE', restart: 'NEUSTART',
        left: 'LINKS', right: 'RECHTS', up: 'HOCH', down: 'RUNTER',
      },
      keysPitch: 'Tasten gelten für den gewählten Spieler und werden wie im Spiel lokal gespeichert.',
      padPitch: 'Der Controller steuert den lokalen Spieler und folgt automatisch deiner Tastenbelegung.',
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
        punch: 'PUNCH', kick: 'KICK', special: 'SPECIAL', jump: 'JUMP', sprint: 'RUN',
        grapple: 'GRAB', mount: 'DONKEY', pause: 'PAUSE', restart: 'RESTART',
        left: 'LEFT', right: 'RIGHT', up: 'UP', down: 'DOWN',
      },
      keysPitch: 'Keys apply to the chosen player and are stored locally, exactly like in-game.',
      padPitch: 'The controller drives the local player and follows your key bindings automatically.',
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
    '.vr-hprow{display:flex;align-items:center;gap:6px;margin:1px 0 2px}',
    '.vr-heart{width:15px;height:15px;flex:0 0 auto;color:var(--ecg,#9dff6b);' +
      'filter:drop-shadow(0 0 6px var(--ecg,#9dff6b));animation:vrBeat var(--beat,1s) ease-in-out infinite}',
    '.vr-heart svg{display:block;width:100%;height:100%}',
    '.vr-hp{position:relative;width:186px;max-width:46vw;height:14px;padding:2px;border-radius:3px;overflow:hidden;' +
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
    '.vr-meter{height:7px!important;border-radius:3px;overflow:hidden;margin-top:7px}',
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
    '.vr-weapon{font-size:9px!important;letter-spacing:.14em;padding:3px 6px;border-radius:3px;' +
      'background:rgba(107,224,255,.07);border:1px solid rgba(107,224,255,.18);display:inline-block}',
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

      var cam = new T.PerspectiveCamera(30, 1, radius * 0.1, radius * 30);
      cam.position.set(0, radius * 0.04, radius * 3.7);
      cam.lookAt(0, 0, 0);
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
      if (meter) meter.classList.toggle('ready', p.meter >= 100);
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
      '<div class="vr-gtext">' + (caps || '') + '<b>' + title + '</b>' + desc + '</div>' +
      '</div>';
  }
  function gsec(title, rows) {
    return '<div class="vr-gsec"><h3>' + title + '</h3>' + rows.join('') + '</div>';
  }
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
        '<div class="vr-guide-body"></div>' +
        '<div class="vr-sheet-foot"><span class="vr-note"></span>' +
        '<button class="vr-btn primary" type="button" data-act="close"></button></div>' +
      '</div>';
    global.document.body.appendChild(modal);
    ui.guide = modal;
    if (global.VoxelI18n) global.VoxelI18n.attach(modal.querySelector('.vr-langslot'));
    modal.querySelector('.vr-x').addEventListener('click', closeGuide);
    modal.querySelector('[data-act="close"]').addEventListener('click', closeGuide);
    modal.addEventListener('click', function (ev) { if (ev.target === modal) closeGuide(); });
    renderGuide();
  }
  function renderGuide() {
    var modal = ui.guide;
    if (!modal) return;
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
    modal.querySelector('h2').textContent = T('guideTitle');
    modal.querySelector('.vr-guide-body').innerHTML =
      '<p class="vr-guide-lede">' + T('guideLede') + '</p>' +
      '<div class="vr-guide-grid">' + sections.join('') + '</div>';
    modal.querySelector('.vr-sheet-foot .vr-note').textContent = '';
    modal.querySelector('[data-act="close"]').textContent = T('guideClose');
  }
  function openGuide() {
    if (!ui.guide) return;
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

  /* -------------------------- 3D voxel models ----------------------------- */
  function ensureThree() {
    if (THREE) return Promise.resolve(THREE);
    var spec = './vendor/three.module.js';
    if (SELF) { try { spec = new URL('./vendor/three.module.js', SELF).href; } catch (e) {} }
    return import(spec).then(function (mod) { THREE = mod; return mod; });
  }

  var texCache = {};
  function labelTexture(text, opts) {
    opts = opts || {};
    var w = opts.w || 256, h = opts.h || 256;
    var key = text + '|' + w + '|' + h + '|' + (opts.color || '') + '|' + (opts.bg || '');
    if (texCache[key]) return texCache[key];
    var c = global.document.createElement('canvas');
    c.width = w; c.height = h;
    var x = c.getContext('2d');
    x.fillStyle = opts.bg || '#1a1428';
    x.fillRect(0, 0, w, h);
    if (opts.border) {
      x.strokeStyle = opts.border;
      x.lineWidth = 10;
      x.strokeRect(5, 5, w - 10, h - 10);
    }
    x.fillStyle = opts.color || '#ffe9b0';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    var size = opts.size || Math.round(h * 0.26);
    x.font = '700 ' + size + 'px ui-monospace, Menlo, Consolas, monospace';
    /* Shrink long labels to fit. */
    while (x.measureText(text).width > w * 0.86 && size > 10) {
      size -= 2;
      x.font = '700 ' + size + 'px ui-monospace, Menlo, Consolas, monospace';
    }
    x.fillText(text, w / 2, h / 2 + 1);
    var tex = new THREE.CanvasTexture(c);
    if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    texCache[key] = tex;
    return tex;
  }

  var matCache = {};
  function plainMat(hex) {
    if (!matCache[hex]) matCache[hex] = new THREE.MeshLambertMaterial({ color: hex });
    return matCache[hex];
  }
  function box(parent, size, pos, hex, rot) {
    var geo = new THREE.BoxGeometry(size[0], size[1], size[2]);
    var m = new THREE.Mesh(geo, plainMat(hex));
    m.position.set(pos[0], pos[1], pos[2]);
    if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
    parent.add(m);
    return m;
  }
  function labelBox(parent, size, pos, text, opts) {
    opts = opts || {};
    var geo = new THREE.BoxGeometry(size[0], size[1], size[2]);
    var side = plainMat(opts.side || 0x2a2140);
    var top = new THREE.MeshBasicMaterial({ map: labelTexture(text, opts) });
    var mats = [side, side, top, side, side, side];
    var m = new THREE.Mesh(geo, mats);
    m.position.set(pos[0], pos[1], pos[2]);
    m.userData.face = top;
    parent.add(m);
    return m;
  }
  function setupStage(canvas) {
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
    if (renderer.outputColorSpace !== undefined && THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(38, 1.6, 0.1, 100);
    scene.add(new THREE.AmbientLight(0xffffff, 1.05));
    var key = new THREE.DirectionalLight(0xffe2b0, 1.25);
    key.position.set(3.2, 6, 4.2);
    scene.add(key);
    var rim = new THREE.DirectionalLight(0x6be0ff, 0.65);
    rim.position.set(-3.4, 2.4, -2.6);
    scene.add(rim);
    return { renderer: renderer, scene: scene, camera: camera, canvas: canvas };
  }
  function sizeStage(stage) {
    var w = stage.canvas.clientWidth || 520;
    var h = stage.canvas.clientHeight || 320;
    stage.renderer.setSize(w, h, false);
    stage.camera.aspect = w / h;
    stage.camera.updateProjectionMatrix();
  }

  var PAD_FACE = { punch: 'down', jump: 'right', kick: 'left', special: 'up' };
  var PAD_ACCENT = { punch: 0x9dff6b, jump: 0xff8fb3, kick: 0x6be0ff, special: 0xffd76e };
  var PAD_LETTER = { punch: 'A', jump: 'B', kick: 'X', special: 'Y' };

  function cyl(parent, r, h, seg, pos, hex, rot) {
    var geo = new THREE.CylinderGeometry(r, r, h, seg);
    var m = new THREE.Mesh(geo, plainMat(hex));
    m.position.set(pos[0], pos[1], pos[2]);
    if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
    parent.add(m);
    return m;
  }
  function labelCyl(parent, r, h, seg, pos, text, opts) {
    opts = opts || {};
    var geo = new THREE.CylinderGeometry(r, r, h, seg);
    var side = plainMat(opts.side || 0x2a2140);
    var top = new THREE.MeshBasicMaterial({
      map: labelTexture(text, { w: 128, h: 128, bg: opts.bg, color: opts.color, size: 92 }),
    });
    var m = new THREE.Mesh(geo, [side, top, side]);
    m.position.set(pos[0], pos[1], pos[2]);
    m.userData.face = top;
    parent.add(m);
    return m;
  }

  var glowTex = null;
  function glowTexture() {
    if (glowTex) return glowTex;
    var c = global.document.createElement('canvas');
    c.width = c.height = 128;
    var x = c.getContext('2d');
    var g = x.createRadialGradient(64, 64, 4, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,.6)');
    g.addColorStop(0.42, 'rgba(255,255,255,.18)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 128, 128);
    glowTex = new THREE.CanvasTexture(c);
    return glowTex;
  }
  function addGlow(parent, w, d, y, color, opacity) {
    var m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      new THREE.MeshBasicMaterial({
        map: glowTexture(), color: color, transparent: true, opacity: opacity == null ? 0.5 : opacity,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
    );
    m.rotation.x = -Math.PI / 2;
    m.position.y = y;
    parent.add(m);
    return m;
  }

  /* Centre a built model so its bounding box sits on the camera axis; the
   * grips used to pull the pad off-centre and out of the stage. */
  function centerModel(root) {
    var box = new THREE.Box3().setFromObject(root);
    var centre = box.getCenter(new THREE.Vector3());
    root.position.x -= centre.x;
    root.position.z -= centre.z;
    return box.getSize(new THREE.Vector3());
  }

  /* A brand-free voxel gamepad built like a real one: two grips, a raised face
   * plate, octagonal face buttons with letters, two sticks and a D-pad. */
  /* Rounded slab built from a cross of boxes and four corner posts. */
  function roundedSlab(parent, w, d, r, h, y, hex) {
    var g = new THREE.Group();
    g.position.y = y;
    parent.add(g);
    var mat = plainMat(hex);
    function add(geo, x, z) {
      var m = new THREE.Mesh(geo, mat);
      m.position.set(x, 0, z);
      g.add(m);
      return m;
    }
    add(new THREE.BoxGeometry(w - 2 * r, h, d), 0, 0);
    add(new THREE.BoxGeometry(w, h, d - 2 * r), 0, 0);
    var rx = w / 2 - r, rz = d / 2 - r;
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (q) {
      add(new THREE.CylinderGeometry(r, r, h, 12), q[0] * rx, q[1] * rz);
    });
    return g;
  }

  function buildController(stage, opts) {
    var scene = stage.scene;
    var root = new THREE.Group();
    root.rotation.set(0, -0.06, 0);
    scene.add(root);

    var SHELL = 0x3a2d5a, SHELL_DARK = 0x1e1733, PLATE = 0x4a3a70,
      DARK = 0x0f0b18, GOLD = 0xb08d3f, ACCENT = 0x4fc8e6;

    addGlow(root, 5.0, 3.2, -0.42, 0x6be0ff, 0.22);

    /* rounded two-tone body: no protruding fins, just a clean pad */
    roundedSlab(root, 3.0, 1.46, 0.46, 0.3, -0.12, SHELL_DARK);
    roundedSlab(root, 2.94, 1.4, 0.44, 0.32, 0.02, SHELL);
    roundedSlab(root, 2.5, 1.16, 0.36, 0.08, 0.21, PLATE);
    roundedSlab(root, 2.34, 1.04, 0.32, 0.02, 0.252, 0x453568);

    /* shoulders and triggers */
    var bumperL = box(root, [0.7, 0.15, 0.24], [-0.72, 0.18, -0.68], 0x4e3f78);
    var bumperR = box(root, [0.7, 0.15, 0.24], [0.72, 0.18, -0.68], 0x4e3f78);
    box(root, [0.52, 0.02, 0.14], [-0.72, 0.262, -0.68], 0x675394);
    box(root, [0.52, 0.02, 0.14], [0.72, 0.262, -0.68], 0x675394);
    var triggerL = box(root, [0.5, 0.2, 0.18], [-0.72, 0.05, -0.79], DARK, [0.34, 0, 0]);
    var triggerR = box(root, [0.5, 0.2, 0.18], [0.72, 0.05, -0.79], DARK, [0.34, 0, 0]);

    /* sticks */
    function stick(x, z) {
      var g = new THREE.Group();
      g.position.set(x, 0.26, z);
      root.add(g);
      cyl(g, 0.21, 0.05, 14, [0, -0.02, 0], DARK);
      cyl(g, 0.18, 0.12, 14, [0, 0.05, 0], 0x453568);
      cyl(g, 0.152, 0.06, 14, [0, 0.14, 0], 0x332749);
      var r = new THREE.Mesh(
        new THREE.TorusGeometry(0.118, 0.016, 6, 20),
        plainMat(ACCENT)
      );
      r.rotation.x = Math.PI / 2;
      r.position.y = 0.172;
      g.add(r);
      cyl(g, 0.098, 0.03, 14, [0, 0.177, 0], 0x141021);
      return g;
    }
    stick(-0.78, -0.26);
    stick(0.3, 0.4);

    /* D-pad */
    var dpad = new THREE.Group();
    dpad.position.set(-0.78, 0.26, 0.26);
    root.add(dpad);
    box(dpad, [0.4, 0.09, 0.145], [0, 0.01, 0], 0x54427f);
    box(dpad, [0.145, 0.09, 0.4], [0, 0.01, 0], 0x54427f);
    box(dpad, [0.12, 0.11, 0.12], [0, 0.03, 0], 0x332749);
    box(dpad, [0.045, 0.03, 0.045], [0, 0.1, -0.14], 0xa48fd0);
    box(dpad, [0.045, 0.03, 0.045], [0, 0.1, 0.14], 0xa48fd0);
    box(dpad, [0.045, 0.03, 0.045], [-0.14, 0.1, 0], 0xa48fd0);
    box(dpad, [0.045, 0.03, 0.045], [0.14, 0.1, 0], 0xa48fd0);

    /* face cluster */
    var cluster = { up: [0.72, -0.4], down: [0.72, 0.12], left: [0.46, -0.14], right: [0.98, -0.14] };
    var faceMeshes = {};
    Object.keys(PAD_FACE).forEach(function (action) {
      var p = cluster[PAD_FACE[action]];
      var color = PAD_ACCENT[action];
      cyl(root, 0.14, 0.05, 10, [p[0], 0.26, p[1]], DARK);
      var m = labelCyl(root, 0.117, 0.1, 10, [p[0], 0.32, p[1]], PAD_LETTER[action], {
        side: color, bg: '#' + color.toString(16).padStart(6, '0'), color: '#150f22',
      });
      m.userData.action = action;
      m.userData.baseColor = color;
      faceMeshes[action] = m;
    });

    /* The pause/restart pills are tiny at this scale and only added noise;
     * those two stay rebindable from the list (pick the action, press the
     * button on the pad). The face itself stays clean. */
    var plaque = box(root, [0.26, 0.03, 0.12], [-0.03, 0.275, -0.52], 0x120e1c);
    plaque.material = new THREE.MeshLambertMaterial({
      map: labelTexture('VR', { w: 256, h: 128, bg: '#120e1c', color: '#ffd76e', size: 88 }),
    });

    /* bind the shoulders/triggers to their pad indices */
    bumperL.userData.padButton = opts.map.grapple;
    bumperR.userData.padButton = opts.map.mount;
    triggerR.userData.padButton = opts.map.sprint;
    triggerL.userData.padButton = 6;

    centerModel(root);
    stage.camera.position.set(0, 3.45, 1.95);
    stage.camera.lookAt(0, 0, 0);

    return {
      root: root,
      padMeshes: { 4: bumperL, 5: bumperR, 7: triggerR, 6: triggerL },
      faceMeshes: faceMeshes,
      hit: [bumperL, bumperR, triggerL, triggerR].concat(
        Object.keys(faceMeshes).map(function (k) { return faceMeshes[k]; })),
    };
  }

  var KEY_ROWS = [
    ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0'],
    ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP'],
    ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote'],
    ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash'],
  ];
  var KEY_CAPTIONS = {
    Quote: "'", Comma: ',', Period: '.', Slash: '/', Semicolon: ';', Space: 'SPACE',
    Enter: 'ENTER', ShiftLeft: 'SHIFT', ShiftRight: 'SHIFT', ControlLeft: 'CTRL',
    ControlRight: 'CTRL', AltLeft: 'ALT', AltRight: 'ALT', Escape: 'ESC',
    ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Backspace: '⌫',
    BracketLeft: '[', BracketRight: ']', Backslash: '\\', Minus: '-', Equal: '=',
  };
  function capFor(code) {
    if (KEY_CAPTIONS[code]) return KEY_CAPTIONS[code];
    if (/^Key[A-Z]$/.test(code)) return code.slice(3);
    if (/^Digit[0-9]$/.test(code)) return code.slice(5);
    if (/^Numpad[0-9]$/.test(code)) return 'NUM' + code.slice(6);
    return code.replace(/Left$|Right$/, '').toUpperCase().slice(0, 5);
  }

  /* A compact 75 % board: chunky keycaps on a two-tone case, a navigation
   * cluster for player two and the bottom modifier row. */
  function buildKeyboard(stage, opts) {
    var scene = stage.scene;
    var root = new THREE.Group();
    root.rotation.set(0, 0.05, 0);
    scene.add(root);

    var CASE = 0x191323, DECK = 0x322849, CAP = 0x2a2144;
    var BOARD_W = 5.3, BOARD_D = 2.2;

    addGlow(root, 6.8, 3.3, -0.44, 0x6be0ff, 0.26);

    box(root, [BOARD_W, 0.3, BOARD_D], [0, -0.16, 0], CASE);
    box(root, [BOARD_W - 0.16, 0.08, BOARD_D - 0.16], [0, -0.005, 0], DECK);
    box(root, [BOARD_W - 0.5, 0.016, 0.02], [0, 0.038, -BOARD_D / 2 + 0.2], 0x4a3d66);
    box(root, [0.5, 0.07, 0.18], [-2.2, -0.33, -0.75], 0x0f0b18);
    box(root, [0.5, 0.07, 0.18], [2.2, -0.33, -0.75], 0x0f0b18);

    var tops = [];
    var hits = [];
    var KW = 0.33, KD = 0.31, PITCH = 0.36, CAP_H = 0.13;

    function placeKey(code, x, z, w) {
      w = w || KW;
      var color = opts.colorFor(code);
      var bg = color ? '#' + color.toString(16).padStart(6, '0') : '#2a2142';
      var fg = color ? '#150f22' : '#d9d2f0';
      var base = box(root, [w, CAP_H, KD], [x, 0.02, z], CAP);
      var top = labelBox(root, [w - 0.05, 0.055, KD - 0.05], [x, 0.02 + CAP_H / 2 + 0.026, z], capFor(code),
        { side: bg, bg: bg, color: fg, size: 116, w: 192, h: 192 });
      base.userData.code = code;
      top.userData.code = code;
      tops.push(top);
      hits.push(base, top);
      return top;
    }

    function row(codes, z) {
      var total = codes.length * PITCH - (PITCH - KW);
      codes.forEach(function (code, i) {
        placeKey(code, -0.55 - total / 2 + i * PITCH + KW / 2, z);
      });
    }

    row(KEY_ROWS[0], -0.72);
    row(KEY_ROWS[1], -0.37);
    row(KEY_ROWS[2], -0.02);
    row(KEY_ROWS[3], 0.33);

    /* bottom modifiers */
    var bottom = [['ShiftLeft', 0.7], ['Space', 1.14], ['ShiftRight', 0.7], ['Enter', 0.7], ['Escape', 0.52]];
    var bottomW = bottom.reduce(function (s, p) { return s + p[1] + 0.05; }, -0.05);
    var bx = -0.55 - bottomW / 2;
    bottom.forEach(function (pair) {
      placeKey(pair[0], bx + pair[1] / 2, 0.72, pair[1]);
      bx += pair[1] + 0.05;
    });

    /* navigation cluster for player two */
    placeKey('ArrowUp', 2.0, -0.02);
    placeKey('ArrowLeft', 1.64, 0.33);
    placeKey('ArrowDown', 2.0, 0.33);
    placeKey('ArrowRight', 2.36, 0.33);

    /* status LEDs */
    box(root, [0.05, 0.02, 0.05], [2.16, 0.05, -0.86], 0x6be0ff);
    box(root, [0.05, 0.02, 0.05], [2.27, 0.05, -0.86], 0xffd76e);
    box(root, [0.05, 0.02, 0.05], [2.38, 0.05, -0.86], 0x3a2e56);

    centerModel(root);
    stage.camera.position.set(0, 4.15, 5.35);
    stage.camera.lookAt(0, 0, 0);

    return { root: root, keys: tops, hit: hits };
  }

  /* ---------------------------- controls window --------------------------- */
  var ui = {
    modal: null, stage: null, model: null, tab: 'pad',
    player: 0, listen: null, raf: 0, drag: null, padState: null,
  };

  var KEY_ACTIONS = [
    ['left', 'left'], ['right', 'right'], ['up', 'up'], ['down', 'down'],
    ['punch', 'punch'], ['kick', 'kick'], ['special', 'special'], ['jump', 'jump'],
    ['sprint', 'sprint'], ['grapple', 'grapple'], ['mount', 'mount'],
  ];
  var PAD_ACTIONS = [
    ['punch', 'punch'], ['kick', 'kick'], ['special', 'special'], ['jump', 'jump'],
    ['sprint', 'sprint'], ['grapple', 'grapple'], ['mount', 'mount'],
    ['pause', 'pause'], ['restart', 'restart'],
  ];

  function openControls() {
    if (!ui.modal) return;
    ui.modal.hidden = false;
    if (global.VoxelPad && global.VoxelPad.setActive) global.VoxelPad.setActive(false);
    ensureThree().then(function () {
      if (!ui.stage) {
        var canvas = ui.modal.querySelector('.vr-stage canvas');
        ui.stage = setupStage(canvas);
        bindStagePointer(canvas);
        global.addEventListener('resize', function () {
          if (ui.modal && !ui.modal.hidden) sizeStage(ui.stage);
        });
      }
      sizeStage(ui.stage);
      rebuildScene();
      startLoop();
    }).catch(function () {
      toast('3D-Ansicht nicht verfügbar / 3D view unavailable');
    });
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
    stopLoop();
  }
  function loopControls() {
    if (!ui.stage) return;
    ui.stage.renderer.render(ui.stage.scene, ui.stage.camera);
    ui.raf = global.requestAnimationFrame(loopControls);
  }
  function startLoop() { if (!ui.raf) ui.raf = global.requestAnimationFrame(loopControls); }
  function stopLoop() { if (ui.raf) global.cancelAnimationFrame(ui.raf); ui.raf = 0; }

  function rebuildScene() {
    if (!ui.stage || !THREE) return;
    var scene = ui.stage.scene;
    for (var i = scene.children.length - 1; i >= 0; i--) {
      var c = scene.children[i];
      if (c.isLight) continue;
      scene.remove(c);
      disposeTree(c);
    }
    var opts = {
      map: global.VoxelPad ? global.VoxelPad.getMap() : {},
      colorFor: function (code) { return boundColor(code, ui.player); },
    };
    ui.model = ui.tab === 'pad' ? buildController(ui.stage, opts) : buildKeyboard(ui.stage, opts);
    sizeStage(ui.stage);
    renderList();
  }
  function isSharedMaterial(m) {
    for (var k in matCache) if (matCache[k] === m) return true;
    return false;
  }
  function disposeTree(obj) {
    obj.traverse(function (n) {
      if (n.geometry) n.geometry.dispose();
      if (!n.material) return;
      var mats = Array.isArray(n.material) ? n.material : [n.material];
      mats.forEach(function (m) {
        if (isSharedMaterial(m)) return;   // cached palette materials are reused
        m.dispose();
      });
    });
  }

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
    q('.vr-stagehint').textContent = T('drag');
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
    renderList();
  }

  function renderList() {
    if (!ui.modal) return;
    var list = ui.modal.querySelector('.vr-list');
    var b = bridge();
    var rows = ui.tab === 'pad' ? PAD_ACTIONS : KEY_ACTIONS;
    var map = global.VoxelPad ? global.VoxelPad.getMap() : {};
    list.innerHTML = '';
    rows.forEach(function (pair) {
      var action = pair[0];
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
    if (!ui.model) return;
    /* The tab can change before the matching model is rebuilt. */
    if (ui.tab === 'keys' && !ui.model.keys) return;
    if (ui.tab === 'pad' && !ui.model.faceMeshes) return;
    if (ui.tab === 'pad') {
      Object.keys(ui.model.faceMeshes).forEach(function (action) {
        var m = ui.model.faceMeshes[action];
        var on = ui.listen && ui.listen.action === action;
        m.scale.setScalar(on ? 1.16 : 1);
      });
      Object.keys(ui.model.padMeshes).forEach(function (idx) {
        var m = ui.model.padMeshes[idx];
        m.scale.setScalar(1);
      });
    } else {
      ui.model.keys.forEach(function (m) {
        var act = actionForCode(m.userData.code, ui.player);
        var listening = ui.listen && act === ui.listen.action;
        m.scale.setScalar(listening ? 1.12 : 1);
      });
    }
    if (ui.listen && ui.tab === 'pad' && ui.model.padMeshes) {
      var map = global.VoxelPad ? global.VoxelPad.getMap() : {};
      var pm = ui.model.padMeshes[map[ui.listen.action]];
      if (pm) pm.scale.setScalar(1.2);
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
    var old = b.controls[pick.player != null ? pick.player : ui.player][pick.action];
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
    const list = ui.modal.querySelector('.vr-list');
    if (list) highlightModel();
  }

  function bindStagePointer(canvas) {
    var rect = null;
    canvas.addEventListener('pointerdown', function (ev) {
      rect = canvas.getBoundingClientRect();
      ui.drag = { x: ev.clientX, y: ev.clientY, ry: ui.model ? ui.model.root.rotation.y : 0, moved: 0 };
      canvas.setPointerCapture && canvas.setPointerCapture(ev.pointerId);
    });
    canvas.addEventListener('pointermove', function (ev) {
      if (!ui.drag || !ui.model) return;
      var dx = ev.clientX - ui.drag.x;
      var dy = ev.clientY - ui.drag.y;
      ui.drag.moved = Math.max(ui.drag.moved, Math.abs(dx) + Math.abs(dy));
      ui.model.root.rotation.y = ui.drag.ry + dx * 0.008;
      ui.model.root.rotation.x = Math.max(-0.5, Math.min(0.65, (ui.tab === 'pad' ? 0.02 : 0) + dy * 0.004));
    });
    canvas.addEventListener('pointerup', function (ev) {
      var drag = ui.drag;
      ui.drag = null;
      if (!drag || drag.moved > 8 || !ui.model || !THREE) return;
      var r = canvas.getBoundingClientRect();
      var nx = ((ev.clientX - r.left) / r.width) * 2 - 1;
      var ny = -((ev.clientY - r.top) / r.height) * 2 + 1;
      var ray = new THREE.Raycaster();
      ray.setFromCamera({ x: nx, y: ny }, ui.stage.camera);
      var hits = ray.intersectObjects(ui.model.hit, false);
      if (!hits.length) return;
      var obj = hits[0].object;
      if (ui.tab === 'pad') {
        var btn = obj.userData.padButton;
        if (btn == null && obj.userData.action) btn = global.VoxelPad ? global.VoxelPad.getMap()[obj.userData.action] : null;
        if (btn != null) {
          if (!ui.listen) {
            toast(lang() === 'de' ? 'Erst links eine Aktion wählen.' : 'Pick an action on the right first.');
            return;
          }
          assignPad(ui.listen.action, btn);
        }
      } else if (obj.userData.code) {
        if (!ui.listen) {
          toast(lang() === 'de' ? 'Erst rechts eine Aktion wählen.' : 'Pick an action on the right first.');
          return;
        }
        assignKey(obj.userData.code);
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
          '<div class="vr-stage"><canvas></canvas><div class="vr-stagehint"></div></div>' +
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
        rebuildScene();
        renderControlsText();
      });
    });
    modal.querySelectorAll('.vr-seg button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        ui.player = +btn.dataset.p;
        ui.listen = null;
        rebuildScene();
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
      rebuildScene();
    });
    modal.querySelector('.vr-list').addEventListener('keydown', function (ev) { ev.stopPropagation(); });
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
          '<button class="vr-btn danger" type="button" data-act="leave"><span class="ic">⏻</span><span data-t="leave"></span></button>' +
          '<div class="vr-soundrow"><button class="vr-sound-toggle" type="button" data-act="sound"></button>' +
            '<span class="vr-langlabel" data-t="volume"></span>' +
            '<input class="vr-range" type="range" min="0" max="100" step="1">' +
            '<span class="vr-volnum"></span></div>' +
          '<div class="vr-pause-lang"><span class="vr-langlabel" data-t="language"></span><span class="vr-langslot"></span></div>' +
        '</div>' +
        '<div class="vr-pause-note" data-role="note"></div>' +
      '</div>';
    pause.appendChild(pauseWrap);

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

  function pauseStatusLine() {
    var b = bridge();
    if (!b || !b.net || !b.net.role) return '';
    var st = netBadge();
    return st.label;
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
    actions.appendChild(guideBtn);
    actions.appendChild(setupBtn);
    actions.appendChild(info);
    card.insertBefore(actions, help.nextSibling);
    guideBtn.addEventListener('click', openGuide);
    setupBtn.addEventListener('click', openControls);
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
      if (guideOpen()) {
        ev.preventDefault();
        ev.stopImmediatePropagation();
        if (ev.code === 'Escape') closeGuide();
        return;
      }
      if (!ui.modal || ui.modal.hidden) return;
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
      if (ev.code === 'Escape') closeControls();
    };
    global.addEventListener('keydown', reservedHandler, true);
  }

  global.document.addEventListener('voxel-lang', function () {
    if (onlineEls) onlineEls.btn.textContent = T('inviteCopy');
    if (ui.modal && !ui.modal.hidden) { renderControlsText(); rebuildScene(); }
    renderMenuExtras();
    renderGuide();
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
    setInterval(function () { updateHud(); syncMenuMusic(); }, 120);
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
