const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const PORT = Number(process.env.PORT || 4173);
const PUBLIC = path.join(__dirname, 'public');
const rooms = new Map();
const questions = [
  { category: 'SPACE', question: 'Which planet has the most moons currently confirmed?', options: ['Jupiter', 'Saturn', 'Neptune', 'Uranus'], answer: 1 },
  { category: 'FOOD', question: 'Which country is credited with inventing modern pizza?', options: ['Greece', 'France', 'Italy', 'Turkey'], answer: 2 },
  { category: 'NATURE', question: 'What is the only mammal capable of true flight?', options: ['Flying squirrel', 'Bat', 'Sugar glider', 'Colugo'], answer: 1 },
  { category: 'ARTS', question: 'Who painted The Starry Night?', options: ['Claude Monet', 'Vincent van Gogh', 'Paul Cézanne', 'Edvard Munch'], answer: 1 },
  { category: 'ANIMALS', question: 'What is a group of flamingos called?', options: ['A flamboyance', 'A parade', 'A blush', 'A flock'], answer: 0 },
  { category: 'GEOGRAPHY', question: 'Which is the smallest country in the world by area?', options: ['Monaco', 'San Marino', 'Liechtenstein', 'Vatican City'], answer: 3 },
  { category: 'SCIENCE', question: 'What is the chemical symbol for gold?', options: ['Go', 'Gd', 'Au', 'Ag'], answer: 2 },
  { category: 'MOVIES', question: 'What was the first feature-length animated film?', options: ['Pinocchio', 'Fantasia', 'Snow White and the Seven Dwarfs', 'Bambi'], answer: 2 },
  { category: 'SPORTS', question: 'How many rings are on the Olympic flag?', options: ['Four', 'Five', 'Six', 'Seven'], answer: 1 },
  { category: 'HISTORY', question: 'The ancient city of Petra is in which present-day country?', options: ['Egypt', 'Jordan', 'Lebanon', 'Morocco'], answer: 1 },
  { category: 'MUSIC', question: 'Which instrument has 88 keys?', options: ['Harp', 'Accordion', 'Piano', 'Organ'], answer: 2 },
  { category: 'NATURE', question: 'What is the largest species of penguin?', options: ['King penguin', 'Emperor penguin', 'Gentoo penguin', 'Macaroni penguin'], answer: 1 },
  { category: 'TECH', question: 'What does the “www” in a web address stand for?', options: ['World Wide Web', 'Web World Wire', 'Wide Web Window', 'World Web Workspace'], answer: 0 },
  { category: 'GEOGRAPHY', question: 'Which river runs through Budapest?', options: ['Rhine', 'Seine', 'Danube', 'Elbe'], answer: 2 },
  { category: 'SPACE', question: 'How long does sunlight take to reach Earth?', options: ['About 8 seconds', 'About 8 minutes', 'About 80 minutes', 'About 8 hours'], answer: 1 },
  { category: 'FOOD', question: 'Which nut is used to make marzipan?', options: ['Pistachio', 'Walnut', 'Almond', 'Hazelnut'], answer: 2 },
  { category: 'ANIMALS', question: 'What is the fastest land animal?', options: ['Pronghorn', 'Lion', 'Cheetah', 'Springbok'], answer: 2 },
  { category: 'LITERATURE', question: 'Who wrote Frankenstein?', options: ['Mary Shelley', 'Jane Austen', 'Bram Stoker', 'Emily Brontë'], answer: 0 },
  { category: 'SCIENCE', question: 'Which planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Mercury', 'Jupiter'], answer: 1 },
  { category: 'CULTURE', question: 'What is the Japanese art of paper folding called?', options: ['Ikebana', 'Origami', 'Shodo', 'Kintsugi'], answer: 1 },
  { category: 'HISTORY', question: 'In which year did the first moon landing take place?', options: ['1965', '1967', '1969', '1971'], answer: 2 },
  { category: 'MOVIES', question: 'Which film features the song “Let It Go”?', options: ['Moana', 'Tangled', 'Brave', 'Frozen'], answer: 3 },
  { category: 'GEOGRAPHY', question: 'What is the capital of New Zealand?', options: ['Auckland', 'Wellington', 'Christchurch', 'Hamilton'], answer: 1 },
  { category: 'NATURE', question: 'What is the hardest natural substance on Earth?', options: ['Quartz', 'Titanium', 'Diamond', 'Obsidian'], answer: 2 },
  { category: 'SPORTS', question: 'In tennis, what word means a score of zero?', options: ['Nil', 'Love', 'Blank', 'Duck'], answer: 1 },
  { category: 'MUSIC', question: 'How many strings does a standard violin have?', options: ['Four', 'Five', 'Six', 'Eight'], answer: 0 },
  { category: 'SCIENCE', question: 'What gas do plants absorb from the atmosphere?', options: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'], answer: 2 },
  { category: 'FOOD', question: 'Saffron comes from which part of a flower?', options: ['Petals', 'Stigma', 'Roots', 'Leaves'], answer: 1 },
  { category: 'LITERATURE', question: 'What is the name of Sherlock Holmes’s assistant?', options: ['Inspector Lestrade', 'Dr. John Watson', 'Mycroft Holmes', 'Irene Adler'], answer: 1 },
  { category: 'SPACE', question: 'Which planet is famous for its prominent rings?', options: ['Saturn', 'Mars', 'Earth', 'Venus'], answer: 0 }
];

function shuffled(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function code() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 5 }, () => alphabet[crypto.randomInt(alphabet.length)]).join('');
}

function cleanName(value) {
  return String(value || '').trim().replace(/[<>]/g, '').slice(0, 18) || 'Player';
}

function safeSend(socket, data) {
  if (socket.wsReady && !socket.destroyed) socket.send(JSON.stringify(data));
}

function publicRoom(room) {
  const current = room.questions[room.round];
  return {
    code: room.code,
    phase: room.phase,
    hostId: room.hostId,
    round: room.round,
    totalRounds: 8,
    deadline: room.deadline,
    revealUntil: room.revealUntil,
    players: [...room.players.values()].map(player => ({ id: player.id, name: player.name, score: player.score, connected: player.connected, answered: Boolean(player.answer), wager: player.answer?.wager ?? null })),
    question: current ? { category: current.category, question: current.question, options: current.options, answer: room.phase === 'reveal' || room.phase === 'finished' ? current.answer : null } : null,
    answerCounts: room.phase === 'reveal' || room.phase === 'finished' ? current.options.map((_, index) => [...room.players.values()].filter(p => p.answer?.choice === index).length) : null,
    roundPoints: room.phase === 'reveal' || room.phase === 'finished' ? Object.fromEntries([...room.players.values()].map(p => [p.id, p.lastPoints || 0])) : null
  };
}

function broadcast(room) {
  const state = publicRoom(room);
  for (const player of room.players.values()) if (player.socket) safeSend(player.socket, { type: 'state', state });
}

function scheduleReveal(room) {
  clearTimeout(room.timer);
  room.timer = setTimeout(() => reveal(room), Math.max(0, room.deadline - Date.now()));
}

function reveal(room) {
  if (room.phase !== 'question') return;
  const q = room.questions[room.round];
  for (const player of room.players.values()) {
    const answer = player.answer;
    let points = 0;
    if (answer) {
      if (answer.choice === q.answer) points = answer.wager;
      else points = -Math.min(player.score, answer.wager);
    }
    player.score = Math.max(0, player.score + points);
    player.lastPoints = points;
  }
  room.phase = 'reveal';
  room.revealUntil = Date.now() + 4500;
  broadcast(room);
  room.timer = setTimeout(() => {
    if (room.round === 7) {
      room.phase = 'finished';
      broadcast(room);
      room.timer = setTimeout(() => {
        if (rooms.get(room.code) === room) rooms.delete(room.code);
      }, 10 * 60 * 1000);
    } else {
      room.round += 1;
      room.phase = 'question';
      room.deadline = Date.now() + 15000;
      for (const player of room.players.values()) { player.answer = null; player.lastPoints = 0; }
      broadcast(room);
      scheduleReveal(room);
    }
  }, 4500);
}

function createRoom(player) {
  let roomCode;
  do roomCode = code(); while (rooms.has(roomCode));
  const room = { code: roomCode, hostId: player.id, players: new Map([[player.id, player]]), phase: 'lobby', round: -1, questions: [], deadline: null, revealUntil: null, timer: null };
  player.room = room;
  rooms.set(roomCode, room);
  return room;
}

function leaveRoom(player) {
  const room = player.room;
  if (!room) return;
  room.players.delete(player.id);
  player.room = null;
  if (!room.players.size) {
    clearTimeout(room.timer);
    rooms.delete(room.code);
    return;
  }
  if (room.hostId === player.id) room.hostId = room.players.keys().next().value;
  broadcast(room);
}

function handleMessage(player, msg) {
  if (!msg || typeof msg.type !== 'string') return;
  if (msg.type === 'create') {
    if (player.room) leaveRoom(player);
    player.name = cleanName(msg.name);
    const room = createRoom(player);
    safeSend(player.socket, { type: 'joined', playerId: player.id, state: publicRoom(room) });
    broadcast(room);
  } else if (msg.type === 'join') {
    const room = rooms.get(String(msg.code || '').toUpperCase().replace(/[^A-Z0-9]/g, ''));
    if (!room) return safeSend(player.socket, { type: 'error', message: 'That room code wasn’t found. Check it and try again.' });
    if (room.phase !== 'lobby') return safeSend(player.socket, { type: 'error', message: 'That game has already started.' });
    if (room.players.size >= 8) return safeSend(player.socket, { type: 'error', message: 'This room is full. Games support up to 8 players.' });
    if (player.room) leaveRoom(player);
    player.name = cleanName(msg.name);
    player.room = room;
    room.players.set(player.id, player);
    safeSend(player.socket, { type: 'joined', playerId: player.id, state: publicRoom(room) });
    broadcast(room);
  } else if (msg.type === 'start') {
    const room = player.room;
    if (!room || room.hostId !== player.id || !['lobby', 'finished'].includes(room.phase)) return;
    if (room.players.size < 2) return safeSend(player.socket, { type: 'error', message: 'You need at least 2 players to start.' });
    clearTimeout(room.timer);
    room.questions = shuffled(questions).slice(0, 8);
    room.round = 0;
    room.phase = 'question';
    room.deadline = Date.now() + 15000;
    room.players.forEach(p => { p.score = 0; p.answer = null; p.lastPoints = 0; });
    broadcast(room);
    scheduleReveal(room);
  } else if (msg.type === 'answer') {
    const room = player.room;
    if (!room || room.phase !== 'question' || player.answer || Date.now() >= room.deadline) return;
    const choice = Number(msg.choice);
    const wager = Number(msg.wager);
    if (!Number.isInteger(choice) || choice < 0 || choice > 3 || ![1, 2, 3].includes(wager)) return;
    player.answer = { choice, wager };
    broadcast(room);
  } else if (msg.type === 'leave') {
    leaveRoom(player);
    safeSend(player.socket, { type: 'left' });
  }
}

function frame(text) {
  const payload = Buffer.from(text);
  let header;
  if (payload.length < 126) {
    header = Buffer.from([0x81, payload.length]);
  } else if (payload.length < 65536) {
    header = Buffer.alloc(4); header[0] = 0x81; header[1] = 126; header.writeUInt16BE(payload.length, 2);
  } else {
    header = Buffer.alloc(10); header[0] = 0x81; header[1] = 127; header.writeBigUInt64BE(BigInt(payload.length), 2);
  }
  return Buffer.concat([header, payload]);
}

function decodeFrames(socket, chunk) {
  socket.buffer = Buffer.concat([socket.buffer || Buffer.alloc(0), chunk]);
  while (socket.buffer.length >= 2) {
    const b1 = socket.buffer[0], b2 = socket.buffer[1];
    const opcode = b1 & 0x0f, masked = (b2 & 0x80) !== 0;
    let length = b2 & 0x7f, offset = 2;
    if (length === 126) { if (socket.buffer.length < 4) return; length = socket.buffer.readUInt16BE(2); offset = 4; }
    else if (length === 127) { if (socket.buffer.length < 10) return; length = Number(socket.buffer.readBigUInt64BE(2)); offset = 10; }
    if (length > 65536) { socket.destroy(); return; }
    let mask;
    if (masked) { if (socket.buffer.length < offset + 4) return; mask = socket.buffer.subarray(offset, offset + 4); offset += 4; }
    if (socket.buffer.length < offset + length) return;
    const payload = Buffer.from(socket.buffer.subarray(offset, offset + length));
    socket.buffer = socket.buffer.subarray(offset + length);
    if (masked) for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4];
    if (opcode === 8) { socket.end(frame('')); return; }
    if (opcode === 9) { socket.write(Buffer.from([0x8a, payload.length])); continue; }
    if (opcode === 1) {
      try { handleMessage(socket.player, JSON.parse(payload.toString())); } catch { safeSend(socket, { type: 'error', message: 'Could not read that action. Please try again.' }); }
    }
  }
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const requested = urlPath === '/' ? 'index.html' : urlPath.slice(1);
  const filePath = path.resolve(PUBLIC, requested);
  if (!filePath.startsWith(PUBLIC + path.sep)) { res.writeHead(403).end('Forbidden'); return; }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404).end('Not found'); return; }
    const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };
    res.writeHead(200, { 'Content-Type': types[path.extname(filePath)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  });
});

server.on('upgrade', (req, socket) => {
  const key = req.headers['sec-websocket-key'];
  if (!key) return socket.destroy();
  const accept = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  socket.wsReady = true;
  socket.send = (value) => { if (!socket.destroyed) socket.write(frame(value)); };
  socket.buffer = Buffer.alloc(0);
  socket.player = { id: crypto.randomUUID(), name: 'Player', socket, room: null, score: 0, answer: null, connected: true, lastPoints: 0 };
  const player = socket.player;
  socket.on('data', data => decodeFrames(socket, data));
  socket.on('close', () => { socket.wsReady = false; player.connected = false; if (player.room) { player.room.players.delete(player.id); const room = player.room; player.room = null; if (!room.players.size) { clearTimeout(room.timer); rooms.delete(room.code); } else { if (room.hostId === player.id) room.hostId = room.players.keys().next().value; broadcast(room); } } });
  socket.on('error', () => {});
});

server.listen(PORT, '0.0.0.0', () => {
  const addresses = Object.values(os.networkInterfaces()).flat().filter(item => item && item.family === 'IPv4' && !item.internal).map(item => item.address);
  console.log(`Quickfire is running on http://localhost:${PORT}`);
  if (addresses.length) console.log(`On the same Wi-Fi, open: ${addresses.map(address => `http://${address}:${PORT}`).join('  ')}`);
});
