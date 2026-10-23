/* net.js — Voxel Rage online transport for the static web build.
 *
 * Rewritten to work exactly like Leap Buddies' js/net.js
 * (XiONDiGiTaL/leapbuddies), which is verified working in production:
 * both browsers make ONE outbound connection to a Supabase Realtime
 * broadcast+presence channel on the Sohbet project — no peer
 * negotiation, no ICE/NAT traversal. Connection settings mirror it:
 * the supabase-js UMD build loaded from the same CDN, a client with
 * auth-session persistence fully disabled (its cross-tab lock can
 * stall a second tab's join), eventsPerSecond 40, presence keys
 * "host-<rand>" / "guest-<rand>", messages on broadcast event "msg"
 * tagged with the sender side, and 12 s / 20 s watchdogs instead of
 * latching the first transient CHANNEL_ERROR (the client retries
 * with backoff on its own).
 *
 * The one adaptation: Voxel Rage's game code speaks to a WebSocket at
 * <this host>/ws (normally its Node server.js relay) and expects
 * server-style messages — {t:'welcome'}, {t:'peer'}, {t:'left'},
 * {t:'error'} — with all other JSON relayed verbatim between the two
 * players. So this file installs a WebSocket stand-in for exactly
 * that endpoint (every other socket stays native) and synthesizes
 * the server messages from presence, Leap-style:
 *   - the HOST generates the 4-letter room code itself, up front
 *     (makeCode, same alphabet as server.js), opens as soon as its
 *     channel is subscribed, and sees {t:'peer'} when a guest's
 *     presence key appears;
 *   - the GUEST opens when the host's presence (or a host broadcast)
 *     is seen, and gets {t:'peer'} with it;
 *   - the host locks onto the first guest that actually sends data
 *     (__gid), so a third browser can look but not play;
 *   - losing the peer's presence produces {t:'left'}.
 *
 * Rooms are channels named voxelrage-v1-<CODE> — an isolated
 * namespace on the shared project, so Leap Buddies / KankaKombat /
 * Sohbet rooms can never collide with these. Only the public anon
 * key is embedded (the same one Sohbet's site ships to every
 * visitor); nothing is stored in any database.
 */
(function (global) {
  'use strict';

  var SB_URL = 'https://ezwxppiuxbyzmmheckce.supabase.co';
  var SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6d3hwcGl1eGJ5em1taGVja2NlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3MjE4MjEsImV4cCI6MjEwMzI5NzgyMX0.fh6AUpeKPDlm4Tr2xXwhf0VdKsRv1A1bZ2s4WFPDMaE';
  var PREFIX = 'voxelrage-v1-';
  var ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // == server.js CODE_ALPHABET

  var NativeWebSocket = global.WebSocket;

  function makeCode() {
    var s = '';
    for (var i = 0; i < 4; i++) s += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
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
       * (Comment and settings carried over from Leap Buddies' net.js.)
       * transport pins the native constructor because this file
       * replaces global WebSocket below; Supabase's own relay socket
       * must never route through the game shim. */
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      realtime: { transport: NativeWebSocket, params: { eventsPerSecond: 40 } }
    });
  }

  /* ------------------------- RoomSocket ------------------------- */

  function RoomSocket(address) {
    var url = new URL(address, global.location.href);
    this.url = String(address);
    this.role = url.searchParams.get('role') === 'host' ? 'host' : 'guest';
    this.room = this.role === 'host' ? makeCode() : (url.searchParams.get('room') || '').toUpperCase();
    this.readyState = 0; // CONNECTING
    this.onopen = null;
    this.onmessage = null;
    this.onerror = null;
    this.onclose = null;
    this._gid = Math.random().toString(36).slice(2, 10);
    this._client = null;
    this._channel = null;
    this._subscribed = false;
    this._opened = false;
    this._closed = false;
    this._peerSeen = false;    // host: a guest presence key is present
    this._lockedGuest = null;  // host: __gid of the guest that may play
    this._relayTimer = null;
    this._notFoundTimer = null;
    var self = this;
    setTimeout(function () { self._connect(); }, 0);
  }
  RoomSocket.CONNECTING = 0;
  RoomSocket.OPEN = 1;
  RoomSocket.CLOSING = 2;
  RoomSocket.CLOSED = 3;

  RoomSocket.prototype._emit = function (type, ev) {
    var cb = this['on' + type];
    if (typeof cb === 'function') {
      try { cb.call(this, ev); } catch (e) { /* game handler errors are its own */ }
    }
  };

  RoomSocket.prototype._deliver = function (obj) {
    if (this._closed) return;
    this._emit('message', { data: JSON.stringify(obj) });
  };

  RoomSocket.prototype._deliverRaw = function (str) {
    if (this._closed) return;
    this._emit('message', { data: str });
  };

  RoomSocket.prototype._open = function () {
    if (this._opened || this._closed) return;
    this._opened = true;
    this.readyState = 1; // OPEN
    if (this._notFoundTimer) { clearTimeout(this._notFoundTimer); this._notFoundTimer = null; }
    this._emit('open', {});
    this._deliver({ t: 'welcome', role: this.role, room: this.room });
  };

  /* Guest side of Leap's join(): the room exists once the host's
   * presence (or any host broadcast) is seen. */
  RoomSocket.prototype._guestSawHost = function () {
    if (this.role !== 'guest' || this._closed) return;
    var wasOpened = this._opened;
    this._open();
    if (!wasOpened && this._opened) this._deliver({ t: 'peer', role: 'guest' });
  };

  RoomSocket.prototype._fail = function (reason) {
    if (this._closed || this._failing) return;
    this._failing = true;
    /* Error event first, specific message second — and hold the
     * socket open a few seconds before closing. The game's handlers
     * overwrite its status line on error and again on close, so this
     * order + pause is what lets the player actually read WHY the
     * room failed (bad code, relay down) instead of just seeing the
     * generic disconnect text flash past. */
    this._emit('error', {});
    this._deliver({ t: 'error', msg: reason });
    var self = this;
    setTimeout(function () { self.close(); }, 4000);
  };

  RoomSocket.prototype._connect = function () {
    if (this._closed) return;
    if (!libReady()) { this._fail('relay-unavailable'); return; }
    if (!/^[A-Z2-9]{4}$/.test(this.room)) { this._fail('room-not-found'); return; }

    var self = this;
    var client = newClient();
    var channel = client.channel(PREFIX + this.room, {
      config: {
        broadcast: { self: false },
        presence: { key: (this.role === 'host' ? 'host-' : 'guest-') + this._gid }
      }
    });
    this._client = client;
    this._channel = channel;

    /* Persistent-failure watchdog (Leap): fires only if the relay
     * never became reachable at all; transient errors retry inside
     * the client and must not latch an error state. */
    this._relayTimer = setTimeout(function () {
      if (!self._subscribed) self._fail('relay-timeout');
    }, 20000);
    if (this.role === 'guest') {
      this._notFoundTimer = setTimeout(function () {
        if (!self._opened) self._fail('room-not-found');
      }, 12000);
    }

    channel.on('presence', { event: 'sync' }, function () {
      if (self._closed) return;
      var keys = Object.keys(channel.presenceState());
      if (self.role === 'host') {
        var guestPresent = keys.some(function (k) { return k.indexOf('guest-') === 0; });
        if (guestPresent && !self._peerSeen) {
          self._peerSeen = true;
          self._deliver({ t: 'peer', role: 'host' });
        } else if (!guestPresent && self._peerSeen) {
          self._peerSeen = false;
          self._lockedGuest = null;
          self._deliver({ t: 'left' });
        }
      } else {
        var hostPresent = keys.some(function (k) { return k.indexOf('host-') === 0; });
        if (hostPresent) {
          self._guestSawHost();
        } else if (self._opened) {
          /* Host left: same outcome as the Node relay destroying
           * the guest socket — a 'left' note, then close. */
          self._deliver({ t: 'left' });
          self.close();
        }
      }
    });

    channel.on('broadcast', { event: 'msg' }, function (m) {
      if (self._closed) return;
      var d = m && m.payload;
      if (!d || typeof d.d !== 'string') return;
      if (self.role === 'host') {
        if (d.__from !== 'guest') return;
        if (self._lockedGuest && d.__gid !== self._lockedGuest) return; // room locked to first guest
        if (!self._lockedGuest) self._lockedGuest = d.__gid || null;
        self._deliverRaw(d.d);
      } else {
        if (d.__from !== 'host') return;
        self._guestSawHost();
        self._deliverRaw(d.d);
      }
    });

    channel.subscribe(function (status) {
      if (self._closed) return;
      if (status === 'SUBSCRIBED') {
        self._subscribed = true;
        if (self._relayTimer) { clearTimeout(self._relayTimer); self._relayTimer = null; }
        channel.track({ role: self.role });
        if (self.role === 'host') self._open();
      } else if (status === 'CLOSED') {
        self._fail('relay-disconnected');
      }
      /* CHANNEL_ERROR / TIMED_OUT: the client retries with backoff;
       * the watchdog above reports only a persistent failure. */
    });
  };

  RoomSocket.prototype.send = function (data) {
    if (this._closed || !this._channel || !this._subscribed) return;
    try {
      this._channel.send({
        type: 'broadcast', event: 'msg',
        payload: { __from: this.role, __gid: this._gid, d: String(data) }
      });
    } catch (e) { /* channel closing */ }
  };

  RoomSocket.prototype.close = function () {
    if (this._closed) return;
    this._closed = true;
    this.readyState = 3; // CLOSED
    if (this._relayTimer) clearTimeout(this._relayTimer);
    if (this._notFoundTimer) clearTimeout(this._notFoundTimer);
    try { if (this._channel) this._channel.untrack(); } catch (e) {}
    try { if (this._client && this._channel) this._client.removeChannel(this._channel); } catch (e) {}
    try { if (this._client) this._client.realtime.disconnect(); } catch (e) {}
    this._emit('close', {});
  };

  /* ------------- WebSocket stand-in for the /ws endpoint ------------- */

  function GameWebSocket(address, protocols) {
    if (!new.target) throw new TypeError("Failed to construct 'WebSocket': Please use the 'new' operator");
    var url = new URL(address, global.location.href);
    if (url.host === global.location.host && url.pathname === '/ws') return new RoomSocket(address);
    return protocols === undefined ? new NativeWebSocket(address) : new NativeWebSocket(address, protocols);
  }
  GameWebSocket.CONNECTING = 0;
  GameWebSocket.OPEN = 1;
  GameWebSocket.CLOSING = 2;
  GameWebSocket.CLOSED = 3;
  GameWebSocket.prototype = RoomSocket.prototype;

  global.WebSocket = GameWebSocket;
})(typeof window !== 'undefined' ? window : globalThis);
