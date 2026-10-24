/* net.js — VOXEL RAGE room transport: a direct adaptation of Leap
 * Buddies' net.js (the transport XiØN's own co-op game runs on,
 * verified live). Same Supabase project, same client options, same
 * presence/broadcast room pattern.
 *
 * Public interface: Net.makeCode(), Net.host(code, cbs),
 * Net.join(code, cbs), Net.libReady(), Net.roomFromUrl(),
 * Net.inviteUrl(code), Net.setRoomParam(code), Net.clearRoomParam().
 * Callbacks: onOpen(code), onGuest, onData(obj), onClose,
 * onError(key), onStatus(state) — state is 'connecting' | 'online' |
 * 'reconnecting' | 'closed'. Returned handle: send(obj), isOpen(),
 * close(). App messages ride as broadcast payloads tagged __from/__gid;
 * payloads are objects end to end.
 *
 * Room links: the host mirrors its code into the page URL
 * (?room=CODE) so the address bar is shareable; Net.inviteUrl(code)
 * returns that same link, and a guest that opens it can join without
 * retyping. This is Leap Buddies' invite flow, kept uniform.
 *
 * Debug: with ?debug=1 in the page URL, state transitions are logged
 * to an on-page box, mirrored into localStorage ('voxelrage-debug-
 * log'), and rendered by debug.html — so a failed session can be read
 * back verbatim without a browser console. No logging otherwise. */
(function (global) {
  'use strict';

  var SB_URL = 'https://ezwxppiuxbyzmmheckce.supabase.co';
  var SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6d3hwcGl1eGJ5em1taGVja2NlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3MjE4MjEsImV4cCI6MjEwMzI5NzgyMX0.fh6AUpeKPDlm4Tr2xXwhf0VdKsRv1A1bZ2s4WFPDMaE';
  var PREFIX = 'voxelrage-v1-';
  var ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var CODE_LEN = 4;

  /* ---- debug logging (inert unless ?debug=1) ---- */
  var DEBUG = /[?&]debug=1(&|$)/.test(global.location ? global.location.search : '');
  var debugEl = null;
  var debugStaticEl = null;
  function dbg(line) {
    if (!DEBUG) return;
    try {
      if (!debugEl) {
        debugEl = document.createElement('pre');
        debugEl.id = 'netDebug';
        debugEl.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:99;max-width:92vw;max-height:44vh;overflow:auto;background:rgba(0,0,0,.88);color:#8fe8ff;font:11px/1.5 monospace;padding:8px 10px;border:1px solid #6be0ff;white-space:pre-wrap;pointer-events:none';
        document.body.appendChild(debugEl);
      }
      if (!debugStaticEl) {
        debugStaticEl = document.createElement('div');
        debugStaticEl.id = 'netDebugLog';
        debugStaticEl.style.cssText = 'background:#000;color:#8fe8ff;font:12px/1.6 monospace;padding:10px;white-space:pre-wrap;border-top:2px solid #6be0ff';
        document.body.appendChild(debugStaticEl);
        try {
          var prior = global.localStorage.getItem('voxelrage-debug-log');
          if (prior) debugStaticEl.textContent = prior;
        } catch (e0) {}
      }
      var t = new Date();
      var stamp = ('0' + t.getMinutes()).slice(-2) + ':' + ('0' + t.getSeconds()).slice(-2) + '.' + ('00' + t.getMilliseconds()).slice(-3);
      debugEl.textContent += stamp + ' ' + line + '\n';
      debugEl.scrollTop = debugEl.scrollHeight;
      debugStaticEl.textContent += stamp + ' ' + line + '\n';
      try { global.localStorage.setItem('voxelrage-debug-log', debugStaticEl.textContent); } catch (e1) {}
    } catch (e) { /* debug must never break the game */ }
  }
  if (DEBUG && global.addEventListener) {
    global.addEventListener('error', function (e) { dbg('window error: ' + (e.message || e.type)); });
    global.addEventListener('unhandledrejection', function (e) {
      var r = e && e.reason;
      var s = '';
      try { s = JSON.stringify(r); } catch (_) { s = String(r); }
      dbg('unhandled rejection: ' + (r && r.message ? r.message + ' | ' : '') + s);
    });
  }

  function makeCode() {
    var s = '';
    for (var i = 0; i < CODE_LEN; i++) s += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
    return s;
  }
  function libReady() {
    return !!(global.supabase && typeof global.supabase.createClient === 'function' && SB_ANON.indexOf('__') !== 0);
  }
  function newClient() {
    return global.supabase.createClient(SB_URL, SB_ANON, {
      /* No auth session is needed for room relaying. Disabling session
       * persistence also disables supabase-js's cross-tab lock, which
       * can otherwise stall a second tab's realtime join indefinitely.
       * (Comment and settings carried over from Leap Buddies' net.js.) */
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      realtime: { params: { eventsPerSecond: 40 } }
    });
  }
  function wrap(client, channel, isOpenFn) {
    return {
      send: function (obj) {
        try {
          channel.send({ type: 'broadcast', event: 'msg', payload: obj });
        } catch (e) { /* channel closing */ }
      },
      isOpen: isOpenFn,
      close: function () {
        try { channel.untrack(); } catch (e) {}
        try { client.removeChannel(channel); } catch (e) {}
        try { client.realtime.disconnect(); } catch (e) {}
      }
    };
  }

  /* ------------------------------ room links ------------------------------ */
  function normalizeCode(raw) {
    return String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LEN);
  }
  function roomFromUrl() {
    try {
      var p = new global.URLSearchParams(global.location.search);
      var code = normalizeCode(p.get('room'));
      return code.length === CODE_LEN ? code : '';
    } catch (e) { return ''; }
  }
  function pageBase() {
    var loc = global.location;
    var path = loc.pathname.replace(/index\.html$/i, '');
    return loc.origin + path;
  }
  function inviteUrl(code) {
    return pageBase() + '?room=' + normalizeCode(code);
  }
  function setRoomParam(code) {
    try {
      global.history.replaceState(null, '', inviteUrl(code));
    } catch (e) { /* file:// or blocked history */ }
  }
  function clearRoomParam() {
    try {
      if (roomFromUrl()) global.history.replaceState(null, '', pageBase());
    } catch (e) {}
  }

  function status(cbs, state, detail) {
    dbg('status: ' + state + (detail ? ' (' + detail + ')' : ''));
    if (cbs && cbs.onStatus) { try { cbs.onStatus(state, detail); } catch (e) {} }
    /* The web UI shows relay health without knowing the callbacks. */
    try {
      global.dispatchEvent(new global.CustomEvent('voxel-net-status', {
        detail: { state: state, detail: detail || '' },
      }));
    } catch (e) {}
  }

  function host(code, cbs) {
    if (!libReady()) { dbg('host: lib not ready'); cbs.onError && cbs.onError('relay-unavailable'); return null; }
    var client = newClient();
    var guestKey = null;          // presence key of the locked-in guest
    var guestGid = null;          // guest session id (message filter)
    var opened = false;
    var channel = client.channel(PREFIX + code, {
      config: { broadcast: { self: false }, presence: { key: 'host-' + Math.random().toString(36).slice(2, 9) } }
    });
    dbg('host: channel ' + PREFIX + code);
    status(cbs, 'connecting');

    channel.on('presence', { event: 'sync' }, function () {
      var st = channel.presenceState();
      var guestPresent = false;
      var extraGuest = false;
      Object.keys(st).forEach(function (k) {
        if (k.indexOf('guest-') === 0) {
          guestPresent = true;
          if (guestGid && k.slice(6) !== guestGid) extraGuest = true;
        }
      });
      /* An unseated guest is in the room: re-announce the lock.
       * Presence is state, not a one-shot message, so this reaches
       * late joiners even if the original lock broadcast was missed
       * (broadcasts are ephemeral — e.g. while this tab was in the
       * background). sendLock is hoisted; it is defined below. */
      if (extraGuest) sendLock();
      if (guestPresent && !guestKey) { guestKey = 'seen'; dbg('host: guest present (presence)'); cbs.onGuest && cbs.onGuest(); }
      if (!guestPresent && guestKey) { guestKey = null; guestGid = null; dbg('host: guest left'); cbs.onClose && cbs.onClose(); }
    });
    var lockSentAt = 0;
    function sendLock() {
      /* Tell the channel which guest holds the seat. The seated
       * guest confirms itself; any other guest that sees a lock
       * naming someone else knows the room is full (the one
       * behavior the old Node relay had that raw broadcast lacks:
       * it rejected extra joiners outright). Re-sent, throttled,
       * whenever a non-seated guest speaks, so late joiners learn
       * it too. */
      var now = Date.now();
      if (!guestGid || now - lockSentAt < 1000) return;
      lockSentAt = now;
      try { channel.send({ type: 'broadcast', event: 'msg', payload: { __from: 'host', t: 'lock', gid: guestGid } }); } catch (e) {}
    }
    channel.on('broadcast', { event: 'msg' }, function (m) {
      var d = m && m.payload;
      if (!d || d.__from !== 'guest') return;
      if (guestGid && d.__gid !== guestGid) { sendLock(); return; }   // room locked to first guest
      if (!guestGid) { guestGid = d.__gid || null; sendLock(); }      // lock on first guest message (see header)
      if (!guestKey) { guestKey = 'seen'; dbg('host: guest present (data)'); cbs.onGuest && cbs.onGuest(); }
      cbs.onData && cbs.onData(d);
    });

    var relayWatchdog = setTimeout(function () {
      if (!opened) { dbg('host: relay watchdog fired'); cbs.onError && cbs.onError('relay-timeout'); status(cbs, 'reconnecting', 'timeout'); }
    }, 20000);
    channel.subscribe(function (subscribeStatus, err) {
      dbg('host: subscribe status=' + subscribeStatus + (err ? ' err=' + (err.message || String(err)) : ''));
      if (subscribeStatus === 'SUBSCRIBED') {
        clearTimeout(relayWatchdog);
        channel.track({ role: 'host' });
        if (!opened) {
          opened = true;
          dbg('host: open, code=' + code);
          setRoomParam(code);
          status(cbs, 'online');
          cbs.onOpen && cbs.onOpen(code);
        } else {
          status(cbs, 'online');
        }
      } else if (subscribeStatus === 'CHANNEL_ERROR' || subscribeStatus === 'TIMED_OUT') {
        if (opened) status(cbs, 'reconnecting', subscribeStatus);
      } else if (subscribeStatus === 'CLOSED') {
        status(cbs, 'closed');
      }
      /* CHANNEL_ERROR / TIMED_OUT: the client retries with backoff;
       * the watchdog above reports only a persistent failure. */
    });

    var handle = wrap(client, channel, function () { return !!guestKey; });
    var rawSend = handle.send;
    handle.send = function (obj) { obj.__from = 'host'; rawSend(obj); };
    var rawClose = handle.close;
    handle.close = function () { opened = false; status(cbs, 'closed'); clearTimeout(relayWatchdog); rawClose(); };
    return handle;
  }

  function join(code, cbs) {
    if (!libReady()) { dbg('join: lib not ready'); cbs.onError && cbs.onError('relay-unavailable'); return null; }
    var client = newClient();
    var gid = 'g' + Math.random().toString(36).slice(2, 10);
    var myKey = 'guest-' + gid;
    var opened = false;
    var hostSeen = false;
    var channel = client.channel(PREFIX + code, {
      config: { broadcast: { self: false }, presence: { key: myKey } }
    });
    dbg('join: channel ' + PREFIX + code + ' as ' + myKey);
    status(cbs, 'connecting');

    var notFoundTimer = setTimeout(function () {
      if (!opened) { dbg('join: room-not-found timer fired'); cbs.onError && cbs.onError('room-not-found'); status(cbs, 'closed', 'not-found'); }
    }, 12000);

    function hostPresence() {
      var st = channel.presenceState();
      return Object.keys(st).some(function (k) { return k.indexOf('host-') === 0; });
    }
    channel.on('presence', { event: 'sync' }, function () {
      var has = hostPresence();
      if (has && !hostSeen) {
        hostSeen = true;
        clearTimeout(notFoundTimer);
        if (!opened) {
          opened = true;
          dbg('join: open (host presence), code=' + code);
          status(cbs, 'online');
          cbs.onOpen && cbs.onOpen(code);
        }
      }
      if (!has && hostSeen) { hostSeen = false; dbg('join: host left'); status(cbs, 'closed', 'host-left'); cbs.onClose && cbs.onClose(); }
    });
    channel.on('broadcast', { event: 'msg' }, function (m) {
      var d = m && m.payload;
      if (!d || d.__from !== 'host') return;
      if (d.t === 'lock') {
        if (d.gid === gid) { dbg('join: seat confirmed'); }
        else {
          dbg('join: room full (seat held by another guest)');
          cbs.onError && cbs.onError('room-full');
          status(cbs, 'closed', 'room-full');
          try { handle.close(); } catch (e) {}
        }
        return;   // lock notes are transport-level, not game data
      }
      if (!hostSeen) {
        hostSeen = true;
        clearTimeout(notFoundTimer);
        if (!opened) {
          opened = true;
          dbg('join: open (host data), code=' + code);
          status(cbs, 'online');
          cbs.onOpen && cbs.onOpen(code);
        }
      }
      cbs.onData && cbs.onData(d);
    });

    var subscribed = false;
    var relayWatchdog = setTimeout(function () {
      if (!subscribed) { dbg('join: relay watchdog fired'); cbs.onError && cbs.onError('relay-timeout'); status(cbs, 'reconnecting', 'timeout'); }
    }, 20000);
    channel.subscribe(function (subscribeStatus, err) {
      dbg('join: subscribe status=' + subscribeStatus + (err ? ' err=' + (err.message || String(err)) : ''));
      if (subscribeStatus === 'SUBSCRIBED') {
        subscribed = true;
        clearTimeout(relayWatchdog);
        channel.track({ role: 'guest' });
        if (opened) status(cbs, 'online', 'resubscribed');
      } else if (subscribeStatus === 'CHANNEL_ERROR' || subscribeStatus === 'TIMED_OUT') {
        if (opened) status(cbs, 'reconnecting', subscribeStatus);
      } else if (subscribeStatus === 'CLOSED') {
        status(cbs, 'closed');
      }
      /* CHANNEL_ERROR / TIMED_OUT: the client retries with backoff;
       * the watchdog above reports only a persistent failure. */
    });

    var handle = wrap(client, channel, function () { return opened; });
    var rawSend = handle.send;
    handle.send = function (obj) { obj.__from = 'guest'; obj.__gid = gid; rawSend(obj); };
    var rawClose = handle.close;
    handle.close = function () { status(cbs, 'closed'); clearTimeout(notFoundTimer); clearTimeout(relayWatchdog); rawClose(); };
    return handle;
  }

  global.Net = {
    makeCode: makeCode, host: host, join: join, libReady: libReady,
    roomFromUrl: roomFromUrl, inviteUrl: inviteUrl,
    setRoomParam: setRoomParam, clearRoomParam: clearRoomParam,
  };
  dbg('net.js v6 loaded (Leap adaptation + invite links); libReady=' + libReady());
})(typeof window !== 'undefined' ? window : globalThis);
