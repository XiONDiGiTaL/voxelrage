/* =========================================================================
   VOXEL RAGE — statischer Server + WebSocket-Relay für Online-Koop.
   Keine Abhängigkeiten: HTTP liefert die Dateien, das Relay spricht
   WebSocket direkt über das Node-net-Modul (RFC 6455, Textframes).
   Start:  node server.js  [port]
   ========================================================================= */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

const ROOT = __dirname;
const PORT = Number(process.argv[2] || process.env.PORT || 8123) || 8123;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/') rel = '/index.html';
  const file = path.join(ROOT, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(ROOT)) { res.writeHead(403).end('forbidden'); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('not found'); return; }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
});

/* ------------------------------ WebSocket ------------------------------- */
function frame(payload, opcode = 0x1) {
  const len = payload.length;
  let head;
  if (len < 126) {
    head = Buffer.from([0x80 | opcode, len]);
  } else if (len < 65536) {
    head = Buffer.alloc(4);
    head[0] = 0x80 | opcode;
    head[1] = 126;
    head.writeUInt16BE(len, 2);
  } else {
    head = Buffer.alloc(10);
    head[0] = 0x80 | opcode;
    head[1] = 127;
    head.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([head, payload]);
}

function attachSocket(socket, onText) {
  let buf = Buffer.alloc(0);
  socket.on('data', (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    for (;;) {
      if (buf.length < 2) return;
      const b0 = buf[0];
      const b1 = buf[1];
      const opcode = b0 & 0x0f;
      const masked = (b1 & 0x80) !== 0;
      let len = b1 & 0x7f;
      let off = 2;
      if (len === 126) {
        if (buf.length < 4) return;
        len = buf.readUInt16BE(2);
        off = 4;
      } else if (len === 127) {
        if (buf.length < 10) return;
        len = Number(buf.readBigUInt64BE(2));
        off = 10;
      }
      const maskLen = masked ? 4 : 0;
      if (buf.length < off + maskLen + len) return;
      const mask = masked ? buf.subarray(off, off + 4) : null;
      const data = Buffer.from(buf.subarray(off + maskLen, off + maskLen + len));
      if (mask) for (let i = 0; i < data.length; i++) data[i] ^= mask[i & 3];
      buf = buf.subarray(off + maskLen + len);
      if (opcode === 0x1) onText(data.toString('utf8'));
      else if (opcode === 0x8) { socket.end(); return; }
      else if (opcode === 0x9) socket.write(frame(data, 0xa));
    }
  });
  socket.on('error', () => {});
}

const rooms = new Map();
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function makeCode() {
  let code;
  do {
    code = Array.from({ length: 4 }, () => CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)]).join('');
  } while (rooms.has(code));
  return code;
}

server.on('upgrade', (req, socket) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname !== '/ws') { socket.destroy(); return; }
  const key = req.headers['sec-websocket-key'];
  if (!key) { socket.destroy(); return; }
  const accept = crypto.createHash('sha1')
    .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
    .digest('base64');
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    `Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
  );
  socket.setNoDelay(true);

  const role = url.searchParams.get('role') === 'host' ? 'host' : 'guest';
  let code = (url.searchParams.get('room') || '').toUpperCase();
  let room;
  if (role === 'host') {
    code = makeCode();
    room = { host: null, guest: null, code };
    rooms.set(code, room);
  } else {
    room = rooms.get(code);
    if (!room) {
      socket.write(frame(Buffer.from(JSON.stringify({ t: 'error', msg: 'room-not-found' }))));
      setTimeout(() => socket.destroy(), 120);
      return;
    }
  }
  room[role] = socket;

  const send = (sock, obj) => {
    if (sock && !sock.destroyed) sock.write(frame(Buffer.from(JSON.stringify(obj))));
  };
  send(socket, { t: 'welcome', role, room: code });
  const other = role === 'host' ? room.guest : room.host;
  if (other) {
    // Jede Seite bekommt ihre eigene Rolle, nicht die des Neuankömmlings.
    send(socket, { t: 'peer', role });
    send(other, { t: 'peer', role: role === 'host' ? 'guest' : 'host' });
  }

  attachSocket(socket, (text) => {
    const peer = role === 'host' ? room.guest : room.host;
    if (peer && !peer.destroyed) peer.write(frame(Buffer.from(text)));
  });

  socket.on('close', () => {
    const peer = role === 'host' ? room.guest : room.host;
    if (room[role] === socket) room[role] = null;
    if (peer) send(peer, { t: 'left' });
    if (!room.host && !room.guest) rooms.delete(code);
  });
});

// Standard ist nur der eigene Rechner. Für Freunde im selben WLAN:
//   HOST=0.0.0.0 node server.js   (oder: node server.js 8123 0.0.0.0)
const HOST = process.argv[3] || process.env.HOST || '127.0.0.1';
server.listen(PORT, HOST, () => {
  const all = HOST === '0.0.0.0' || HOST === '::';
  console.log(all
    ? `VOXEL RAGE auf Port ${PORT} (alle Netzwerke) — Online-Koop über /ws`
    : `VOXEL RAGE auf http://${HOST}:${PORT} — Online-Koop über /ws`);
  if (all) {
    for (const list of Object.values(os.networkInterfaces())) {
      for (const n of list || []) {
        if (n.family === 'IPv4' && !n.internal) console.log(`  im WLAN: http://${n.address}:${PORT}`);
      }
    }
  }
});
