require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const helmet = require('helmet');

const app = express();
app.use(helmet({
  contentSecurityPolicy: false, // Disable for WebRTC and socket.io ease, or configure strictly
  crossOriginEmbedderPolicy: false,
}));
app.use(cors());
app.use(express.json());

// Serve static files from the Vite build
app.use(express.static(path.join(__dirname, '../dist')));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/visionbridge';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('🍃 Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  socketId: String,
  country: { type: String, default: 'Earth' },
  avatar: String,
  lastSeen: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Waiting queues per mode
const queues = {
  video: [],
  text: [],
};

// Active pairs: socketId -> partnerSocketId
const pairs = new Map();

// User stats
let totalConnected = 0;
let totalMatched = 0;

function getOnlineCount() {
  return io.engine.clientsCount;
}

async function matchUsers(mode) {
  const queue = queues[mode];
  while (queue.length >= 2) {
    const userA = queue.shift();
    const userB = queue.shift();

    // Make sure both are still connected
    const socketA = io.sockets.sockets.get(userA);
    const socketB = io.sockets.sockets.get(userB);

    if (!socketA || !socketB) {
      // Re-add the one that's still connected
      if (socketA) queue.unshift(userA);
      if (socketB) queue.unshift(userB);
      continue;
    }

    // Fetch usernames from DB
    const [dataA, dataB] = await Promise.all([
      User.findOne({ socketId: userA }),
      User.findOne({ socketId: userB })
    ]);

    const nameA = dataA ? dataA.username : 'Stranger';
    const nameB = dataB ? dataB.username : 'Stranger';
    const countryA = dataA ? dataA.country : 'Earth';
    const countryB = dataB ? dataB.country : 'Earth';
    const avatarA = dataA ? dataA.avatar : null;
    const avatarB = dataB ? dataB.avatar : null;

    const roomId = `room_${userA}_${userB}`;
    socketA.join(roomId);
    socketB.join(roomId);

    pairs.set(userA, { partner: userB, room: roomId, mode, partnerName: nameB, partnerCountry: countryB, partnerAvatar: avatarB });
    pairs.set(userB, { partner: userA, room: roomId, mode, partnerName: nameA, partnerCountry: countryA, partnerAvatar: avatarA });

    totalMatched++;

    // Notify both — include partner's details
    socketA.emit('matched', { 
      roomId, 
      isInitiator: true, 
      mode, 
      partnerName: nameB, 
      partnerCountry: countryB, 
      partnerAvatar: avatarB 
    });
    socketB.emit('matched', { 
      roomId, 
      isInitiator: false, 
      mode, 
      partnerName: nameA, 
      partnerCountry: countryA, 
      partnerAvatar: avatarA 
    });

    broadcastStats();
  }
}

function removeFromQueue(socketId) {
  for (const mode of ['video', 'text']) {
    const idx = queues[mode].indexOf(socketId);
    if (idx !== -1) queues[mode].splice(idx, 1);
  }
}

function broadcastStats() {
  io.emit('stats', {
    online: getOnlineCount(),
    matched: totalMatched,
    waiting: queues.video.length + queues.text.length,
  });
}

io.on('connection', (socket) => {
  totalConnected++;
  console.log(`[+] Connected: ${socket.id} | Total: ${getOnlineCount()}`);
  broadcastStats();

  // Link socket to username
  socket.on('join', async ({ username }) => {
    if (username) {
      await User.findOneAndUpdate({ username }, { socketId: socket.id, lastSeen: Date.now() });
      console.log(`[👤] User ${username} linked to socket ${socket.id}`);
    }
  });

  // Client wants to find a stranger
  socket.on('find_stranger', ({ mode }) => {
    removeFromQueue(socket.id);

    // Disconnect from existing pair
    const existing = pairs.get(socket.id);
    if (existing) {
      const partnerSocket = io.sockets.sockets.get(existing.partner);
      if (partnerSocket) {
        partnerSocket.emit('stranger_disconnected');
        pairs.delete(existing.partner);
        removeFromQueue(existing.partner);
      }
      socket.leave(existing.room);
      pairs.delete(socket.id);
    }

    queues[mode] = queues[mode] || [];
    queues[mode].push(socket.id);
    socket.emit('waiting');
    broadcastStats();
    matchUsers(mode);
  });

  // WebRTC signaling: offer/answer/ice-candidate
  socket.on('signal', ({ signal, to }) => {
    const target = io.sockets.sockets.get(to);
    if (target) {
      target.emit('signal', { signal, from: socket.id });
    }
  });

  // Text message relay
  socket.on('message', ({ text }) => {
    const pair = pairs.get(socket.id);
    if (!pair) return;
    const partnerSocket = io.sockets.sockets.get(pair.partner);
    if (partnerSocket) {
      partnerSocket.emit('message', { text, from: pair.partnerName || 'Stranger', timestamp: Date.now() });
    }
    socket.emit('message', { text, from: 'you', timestamp: Date.now() });
  });

  // Typing indicator
  socket.on('typing', ({ isTyping }) => {
    const pair = pairs.get(socket.id);
    if (!pair) return;
    const partnerSocket = io.sockets.sockets.get(pair.partner);
    if (partnerSocket) {
      partnerSocket.emit('typing', { isTyping });
    }
  });

  // Skip to next stranger
  socket.on('skip', () => {
    const pair = pairs.get(socket.id);
    const mode = pair ? pair.mode : 'text';

    if (pair) {
      const partnerSocket = io.sockets.sockets.get(pair.partner);
      if (partnerSocket) {
        partnerSocket.emit('stranger_disconnected');
        pairs.delete(pair.partner);
        // Put partner back in queue
        queues[mode].push(pair.partner);
        partnerSocket.emit('waiting');
      }
      socket.leave(pair.room);
      pairs.delete(socket.id);
    }

    queues[mode].push(socket.id);
    socket.emit('waiting');
    broadcastStats();
    matchUsers(mode);
  });

  // Stop / leave
  socket.on('stop', async () => {
    const pair = pairs.get(socket.id);
    if (pair) {
      const partnerSocket = io.sockets.sockets.get(pair.partner);
      if (partnerSocket) {
        partnerSocket.emit('stranger_disconnected');
        pairs.delete(pair.partner);
      }
      socket.leave(pair.room);
      pairs.delete(socket.id);
    }
    await User.findOneAndUpdate({ socketId: socket.id }, { socketId: null, lastSeen: Date.now() });
    removeFromQueue(socket.id);
    broadcastStats();
  });

  socket.on('disconnect', async () => {
    console.log(`[-] Disconnected: ${socket.id}`);
    const pair = pairs.get(socket.id);
    if (pair) {
      const partnerSocket = io.sockets.sockets.get(pair.partner);
      if (partnerSocket) {
        partnerSocket.emit('stranger_disconnected');
        pairs.delete(pair.partner);
      }
      pairs.delete(socket.id);
    }
    await User.findOneAndUpdate({ socketId: socket.id }, { socketId: null, lastSeen: Date.now() });
    removeFromQueue(socket.id);
    broadcastStats();
  });
});

app.post('/api/users', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Username is required' });

  // Get IP (handling proxies like Railway/Heroku)
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  
  try {
    let country = 'Earth';
    try {
      const geoRes = await fetch(`https://ipapi.co/${ip}/json/`);
      const geoData = await geoRes.json();
      if (geoData.country_name) country = geoData.country_name;
    } catch (e) {
      console.warn('GeoIP lookup failed:', e.message);
    }

    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;

    const user = await User.findOneAndUpdate(
      { username },
      { lastSeen: Date.now(), country, avatar },
      { upsert: true, new: true }
    );
    res.json({ message: 'User stored successfully', user });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', online: getOnlineCount(), matched: totalMatched });
});

// The "catchall" handler: for any request that doesn't match one above, send back React's index.html file.
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 VisionBridge signaling server running on http://localhost:${PORT}`);
});
