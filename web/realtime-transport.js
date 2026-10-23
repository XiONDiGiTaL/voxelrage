import { createClient } from '@supabase/supabase-js';

// This is a public browser key, not a service-role credential.
const SB_URL = 'https://ezwxppiuxbyzmmheckce.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6d3hwcGl1eGJ5em1taGVja2NlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3MjE4MjEsImV4cCI6MjEwMzI5NzgyMX0.fh6AUpeKPDlm4Tr2xXwhf0VdKsRv1A1bZ2s4WFPDMaE';
const NativeWebSocket = globalThis.WebSocket;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function roomCode() {
  return Array.from(crypto.getRandomValues(new Uint8Array(4)), n => ALPHABET[n % ALPHABET.length]).join('');
}

class RoomSocket extends EventTarget {
  static CONNECTING = 0; static OPEN = 1; static CLOSING = 2; static CLOSED = 3;
  CONNECTING = 0; OPEN = 1; CLOSING = 2; CLOSED = 3;
  readyState = 0; bufferedAmount = 0; extensions = ''; protocol = ''; binaryType = 'blob';
  onopen = null; onmessage = null; onerror = null; onclose = null;
  constructor(address) {
    super();
    this.url = String(address);
    const url = new URL(address, location.href);
    this.role = url.searchParams.get('role') === 'host' ? 'host' : 'guest';
    this.room = this.role === 'host' ? roomCode() : (url.searchParams.get('room') || '').toUpperCase();
    this.id = crypto.randomUUID();
    this.peer = null;
    this.hostId = null;
    this.subscribed = false;
    queueMicrotask(() => this.connect());
  }
  emit(type, event) {
    this.dispatchEvent(event);
    const callback = this['on' + type];
    if (typeof callback === 'function') callback.call(this, event);
  }
  message(data) {
    this.emit('message', new MessageEvent('message', { data: JSON.stringify(data) }));
  }
  open() {
    if (this.readyState !== 0) return;
    this.readyState = 1;
    clearTimeout(this.timer);
    this.emit('open', new Event('open'));
    this.message({ t: 'welcome', role: this.role, room: this.room });
  }
  transmit(payload) {
    if (!this.subscribed || this.readyState >= 2) return;
    this.channel.send({ type: 'broadcast', event: 'relay', payload: { ...payload, from: this.id } })
      .catch(() => this.fail('relay-send-failed'));
  }
  async connect() {
    if (this.readyState !== 0) return;
    if (!/^[A-Z2-9]{4}$/.test(this.room)) { this.fail('room-not-found'); return; }
    this.client = createClient(SB_URL, SB_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      realtime: { transport: NativeWebSocket, params: { eventsPerSecond: 40 } }
    });
    this.channel = this.client.channel('voxelrage-v1-' + this.room, {
      config: { private: false, broadcast: { self: false }, presence: { key: this.id } }
    });
    this.channel.on('broadcast', { event: 'relay' }, ({ payload: p }) => {
      if (!p || p.from === this.id || (p.to && p.to !== this.id)) return;
      if (p.kind === 'hello' && this.role === 'host' && this.readyState === 1) {
        if (this.peer && this.peer !== p.from) { this.transmit({ kind: 'reject', to: p.from }); return; }
        const first = !this.peer;
        this.peer = p.from;
        this.transmit({ kind: 'accept', to: p.from });
        if (first) this.message({ t: 'peer', role: 'host' });
      } else if (p.kind === 'accept' && this.role === 'guest' && this.readyState === 0) {
        if (p.from !== this.hostId) return;
        this.peer = p.from;
        clearInterval(this.hello);
        this.open();
        this.message({ t: 'peer', role: 'guest' });
      } else if (p.kind === 'reject' && this.role === 'guest' && p.from === this.hostId) {
        this.fail('room-full');
      } else if (p.kind === 'data' && p.from === this.peer && this.readyState === 1 && typeof p.data === 'string') {
        this.emit('message', new MessageEvent('message', { data: p.data }));
      } else if (p.kind === 'leave' && p.from === this.peer) {
        this.peerLeft();
      }
    });
    this.channel.on('presence', { event: 'sync' }, () => {
      if (this.readyState >= 2) return;
      const entries = Object.values(this.channel.presenceState()).flat();
      const hosts = entries.filter(p => p.role === 'host');
      if (this.role === 'host' && hosts.some(p => p.id !== this.id)) { this.fail('room-code-collision'); return; }
      if (this.peer && !entries.some(p => p.id === this.peer)) this.peerLeft();
      if (this.role === 'guest' && this.readyState === 0) {
        this.hostId = hosts[0]?.id || null;
        if (this.hostId) this.transmit({ kind: 'hello', to: this.hostId });
      }
    });
    this.timer = setTimeout(() => this.fail(this.role === 'guest' ? 'room-not-found' : 'relay-timeout'), 20000);
    this.channel.subscribe(async status => {
      if (this.readyState >= 2) return;
      if (status === 'SUBSCRIBED') {
        this.subscribed = true;
        const tracked = await this.channel.track({ id: this.id, role: this.role });
        if (this.readyState >= 2) return;
        if (tracked !== 'ok') { this.fail('presence-failed'); return; }
        if (this.role === 'host') this.open();
        else if (!this.hello) this.hello = setInterval(() => {
          if (this.hostId) this.transmit({ kind: 'hello', to: this.hostId });
        }, 750);
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        this.fail('relay-disconnected');
      }
    });
  }
  peerLeft() {
    if (!this.peer) return;
    this.peer = null;
    this.message({ t: 'left' });
    if (this.role === 'guest') this.close(1000, 'Host left');
  }
  send(data) {
    if (this.readyState === 0) throw new DOMException('Socket is connecting', 'InvalidStateError');
    if (this.readyState !== 1 || !this.peer) return;
    if (typeof data !== 'string') throw new TypeError('Game relay accepts text messages only');
    this.transmit({ kind: 'data', to: this.peer, data });
  }
  fail(reason) {
    if (this.readyState >= 2) return;
    this.message({ t: 'error', msg: reason });
    this.emit('error', new Event('error'));
    this.close(4000, reason);
  }
  close(code = 1000, reason = '') {
    if (this.readyState >= 2) return;
    this.transmit({ kind: 'leave', to: this.peer });
    this.readyState = 2;
    clearTimeout(this.timer);
    clearInterval(this.hello);
    const cleanup = this.client && this.channel ? this.client.removeChannel(this.channel) : Promise.resolve();
    Promise.resolve(cleanup).catch(() => {}).finally(() => {
      this.client?.realtime.disconnect();
      this.readyState = 3;
      this.emit('close', new CloseEvent('close', { code, reason, wasClean: code === 1000 }));
    });
  }
}

// Only intercept this game's same-host /ws endpoint; keep all other sockets native.
function GameWebSocket(address, protocols) {
  if (!new.target) throw new TypeError('WebSocket requires new');
  const url = new URL(address, location.href);
  if (url.host === location.host && url.pathname === '/ws') return new RoomSocket(address);
  return protocols === undefined ? new NativeWebSocket(address) : new NativeWebSocket(address, protocols);
}
Object.assign(GameWebSocket, { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 });
GameWebSocket.prototype = RoomSocket.prototype;
globalThis.WebSocket = GameWebSocket;
