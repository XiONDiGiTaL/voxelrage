/* gamepad.js — plug-and-play controller support for VOXEL RAGE.
 *
 * The game itself listens for keyboard events only, so this module is a
 * translator: every frame it reads the first connected standard-mapping
 * pad and re-emits the matching key events with the *currently bound*
 * keys of the local player. Rebinding either device therefore stays in
 * sync — remap a key in the game UI and the pad follows, remap a pad
 * button here and nothing in the game has to change.
 *
 * Defaults follow the classic beat-'em-up layout:
 *   left stick / D-pad  move          A  punch / pick up / fire
 *   X  kick            Y  special     B  jump / donkey hop
 *   LT throw           LB grab / chain  RB mount   RT sprint (hold)
 *   Start pause        Back restart
 *
 * Public interface: VoxelPad.getMap(), VoxelPad.setBinding(action, btn),
 * VoxelPad.reset(), VoxelPad.state(), VoxelPad.beginCapture(cb),
 * VoxelPad.cancelCapture(), VoxelPad.onChange(cb).
 * The map persists in localStorage under 'voxelrage-pad-v1'. */
(function (global) {
  'use strict';

  var KEY = 'voxelrage-pad-v1';
  var DEADZONE = 0.38;
  var BTN_THRESHOLD = 0.45;

  /* Beat-'em-up defaults, by W3C standard-mapping button index. */
  var DEFAULT_MAP = {
    punch: 0,    // A / cross (bottom)
    jump: 1,     // B / circle (right)
    kick: 2,     // X / square (left)
    special: 3,  // Y / triangle (top)
    grapple: 4,  // LB
    mount: 5,    // RB
    throw: 6,    // LT
    sprint: 7,   // RT
    pause: 9,    // Start
    restart: 8,  // Back / View
  };
  /* Actions the pad feeds into the game's own binding table. */
  var GAME_ACTIONS = ['punch', 'jump', 'kick', 'special', 'grapple', 'mount', 'throw', 'sprint'];

  var PAD_NAMES = [
    'A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'Back', 'Start',
    'L3', 'R3', 'D-Pad ↑', 'D-Pad ↓', 'D-Pad ←', 'D-Pad →',
  ];

  var map = loadMap();
  var capture = null;          // cb(buttonIndex) while the config UI listens
  var suspended = false;       // UI owns the pad (controls window open)
  var listeners = [];
  var pressed = Object.create(null);   // buttonIndex -> bool (last frame)
  var emitted = Object.create(null);   // key code -> bool (event already down)
  var connectedIndex = -1;
  var connectedId = '';
  var lastActiveAt = 0;

  function loadMap() {
    var out = {};
    for (var k in DEFAULT_MAP) if (Object.prototype.hasOwnProperty.call(DEFAULT_MAP, k)) out[k] = DEFAULT_MAP[k];
    try {
      var raw = JSON.parse(global.localStorage.getItem(KEY) || 'null');
      if (raw && typeof raw === 'object') {
        for (var a in out) {
          var v = raw[a];
          if (typeof v === 'number' && v >= 0 && v <= 15) out[a] = v;
        }
      }
    } catch (e) {}
    return out;
  }
  function saveMap() {
    try { global.localStorage.setItem(KEY, JSON.stringify(map)); } catch (e) {}
  }
  function cloneMap() {
    var out = {};
    for (var k in map) if (Object.prototype.hasOwnProperty.call(map, k)) out[k] = map[k];
    return out;
  }
  function padName(i) { return PAD_NAMES[i] || ('B' + i); }

  /* ---------------------------- game bridge ------------------------------ */
  function bridge() { return global.VoxelGame || null; }
  function localPlayerIndex() {
    var g = bridge();
    var role = g && g.net ? g.net.role : null;
    /* The guest pilots Player 2 and their own bindings. */
    return role === 'guest' ? 1 : 0;
  }
  function codeFor(action) {
    var g = bridge();
    if (!g || !g.controls) return null;
    var set = g.controls[localPlayerIndex()];
    return set ? set[action] : null;
  }
  function keyEvent(code, down) {
    var ev;
    try {
      ev = new global.KeyboardEvent(down ? 'keydown' : 'keyup', {
        code: code, key: code, bubbles: true, cancelable: true,
      });
    } catch (e) {
      ev = global.document.createEvent('KeyboardEvent');
      ev.initKeyboardEvent(down ? 'keydown' : 'keyup', true, true, global, code, 0, '', false, '');
    }
    /* Marked so the rebinding UI never mistakes pad echoes for real
     * key presses. */
    try { ev.__voxelPad = true; } catch (e) {}
    global.dispatchEvent(ev);
  }
  function hold(code, down) {
    if (!code) return;
    if (down) {
      if (emitted[code]) return;
      emitted[code] = true;
      keyEvent(code, true);
    } else {
      if (!emitted[code]) return;
      emitted[code] = false;
      keyEvent(code, false);
    }
  }
  function releaseAll() {
    for (var code in emitted) if (emitted[code]) keyEvent(code, false);
    emitted = Object.create(null);
  }

  function activePad() {
    if (!global.navigator || !global.navigator.getGamepads) return null;
    var pads;
    try { pads = global.navigator.getGamepads(); } catch (e) { return null; }
    if (!pads) return null;
    var first = null;
    for (var i = 0; i < pads.length; i++) {
      var p = pads[i];
      if (!p || !p.connected) continue;
      if (!first) first = p;
      if (connectedIndex >= 0 && p.index === connectedIndex) return p;
    }
    return first;
  }
  function isDown(pad, index) {
    var b = pad.buttons && pad.buttons[index];
    if (!b) return false;
    if (typeof b === 'number') return b > BTN_THRESHOLD;
    return !!b.pressed || (typeof b.value === 'number' && b.value > BTN_THRESHOLD);
  }
  function axes(pad) {
    var a = pad.axes || [];
    return [a[0] || 0, a[1] || 0, a[2] || 0, a[3] || 0];
  }

  /* ------------------------------ state ---------------------------------- */
  function state() {
    var pad = activePad();
    return {
      connected: !!pad,
      id: pad ? pad.id : '',
      index: pad ? pad.index : -1,
      label: pad ? friendlyName(pad.id) : '',
      listening: !!capture,
    };
  }
  function friendlyName(id) {
    var s = String(id || 'Controller');
    /* Chrome reports "Vendor Product (STANDARD GAMEPAD Vendor: 045e ...)" */
    s = s.replace(/\s*\(.*$/, '');
    return s.length > 34 ? s.slice(0, 32) + '…' : s;
  }
  function notify() {
    var st = state();
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](st); } catch (e) {}
    }
  }

  /* ------------------------------ polling -------------------------------- */
  function anyInput(pad) {
    for (var b = 0; b < 16; b++) if (isDown(pad, b)) return true;
    var a = axes(pad);
    return Math.abs(a[0]) > DEADZONE || Math.abs(a[1]) > DEADZONE;
  }
  /* Wie lange ist die letzte echte Eingabe am Pad her? Wird beim Start eines
   * lokalen Koop-Laufs gefragt, damit Spieler 2 die Tastatur übernehmen kann. */
  function activityAge() {
    return lastActiveAt ? (global.performance.now() - lastActiveAt) : Infinity;
  }

  function tick() {
    var pad = activePad();
    if (pad) {
      if (anyInput(pad)) lastActiveAt = global.performance.now();
      if (pad.index !== connectedIndex || pad.id !== connectedId) {
        connectedIndex = pad.index;
        connectedId = pad.id;
        notify();
      }
      if (capture) {
        /* Configuration mode: report the first newly pressed button and
         * swallow gameplay input so the menu cannot punch through. */
        for (var b = 0; b < 16; b++) {
          var down = isDown(pad, b);
          var was = !!pressed[b];
          pressed[b] = down;
          if (down && !was) { var cb = capture; capture = null; notify(); cb(b); break; }
        }
        releaseAll();
      } else if (suspended) {
        releaseAll();
      } else {
        gameplay(pad);
      }
    } else if (connectedIndex !== -1) {
      connectedIndex = -1;
      connectedId = '';
      releaseAll();
      notify();
    }
    global.requestAnimationFrame(tick);
  }

  function gameplay(pad) {
    var g = bridge();
    if (!g) return;

    /* Menu / not in a run: only let Start act, as pause does nothing
     * before the first start. */
    var inGame = !!g.started;

    var left = isDown(pad, 14), right = isDown(pad, 15);
    var up = isDown(pad, 12), down = isDown(pad, 13);
    var ax = axes(pad);
    if (ax[0] < -DEADZONE) left = true;
    if (ax[0] > DEADZONE) right = true;
    if (ax[1] < -DEADZONE) up = true;
    if (ax[1] > DEADZONE) down = true;

    if (!inGame) {
      /* In the menu nothing is driven, and nothing may stay held so the
       * battle does not start with a stuck direction. */
      hold(codeFor('left'), false);
      hold(codeFor('right'), false);
      hold(codeFor('up'), false);
      hold(codeFor('down'), false);
      for (var a in GAME_ACTIONS) hold(codeFor(GAME_ACTIONS[a]), false);
      hold('Escape', false);
      hold('KeyR', false);
      return;
    }

    hold(codeFor('left'), left);
    hold(codeFor('right'), right);
    hold(codeFor('up'), up);
    hold(codeFor('down'), down);

    for (var i = 0; i < GAME_ACTIONS.length; i++) {
      var action = GAME_ACTIONS[i];
      hold(codeFor(action), isDown(pad, map[action]));
    }

    edge(pad, map.pause, 'Escape');
    edge(pad, map.restart, 'KeyR');
  }
  function edge(pad, index, code) {
    var now = isDown(pad, index);
    if (now && !pressed['k' + code]) keyEvent(code, true);
    if (!now && pressed['k' + code]) keyEvent(code, false);
    pressed['k' + code] = now;
  }

  /* ------------------------------- public -------------------------------- */
  function setBinding(action, button) {
    if (!Object.prototype.hasOwnProperty.call(map, action)) return;
    if (typeof button !== 'number' || button < 0 || button > 15) return;
    /* One button drives one action: clear any other action using it. */
    for (var a in map) if (a !== action && map[a] === button) map[a] = map[action];
    map[action] = button;
    saveMap();
    releaseAll();
    notify();
  }
  function reset() {
    map = {};
    for (var k in DEFAULT_MAP) map[k] = DEFAULT_MAP[k];
    saveMap();
    releaseAll();
    notify();
  }
  function beginCapture(cb) {
    capture = cb;
    notify();
  }
  function cancelCapture() { capture = null; notify(); }
  function onChange(cb) { if (typeof cb === 'function') listeners.push(cb); }
  function setActive(on) {
    suspended = !on;
    if (suspended) { capture = null; releaseAll(); }
    notify();
  }

  global.addEventListener('gamepadconnected', function () {
    connectedIndex = -1;
    notify();
  });
  global.addEventListener('gamepaddisconnected', function () {
    connectedIndex = -1;
    connectedId = '';
    releaseAll();
    notify();
  });
  global.addEventListener('blur', releaseAll);

  global.VoxelPad = {
    getMap: cloneMap,
    setBinding: setBinding,
    reset: reset,
    state: state,
    beginCapture: beginCapture,
    cancelCapture: cancelCapture,
    onChange: onChange,
    setActive: setActive,
    activityAge: activityAge,
    padName: padName,
    GAME_ACTIONS: GAME_ACTIONS.slice(),
    DEFAULT_MAP: (function () { var o = {}; for (var k in DEFAULT_MAP) o[k] = DEFAULT_MAP[k]; return o; })(),
  };

  function boot() {
    if (activePad()) { connectedIndex = activePad().index; connectedId = activePad().id; }
    global.requestAnimationFrame(tick);
    notify();
  }
  if (global.document.readyState === 'loading') global.document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(typeof window !== 'undefined' ? window : globalThis);
