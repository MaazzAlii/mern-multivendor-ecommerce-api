const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Parse allowed client origins from env or default to local Vite dev server
const allowedOrigins = process.env.CLIENT_URLS
  ? process.env.CLIENT_URLS.split(',').map((url) => url.trim())
  : ['http://localhost:5173'];

const corsOptions = {
  origin: allowedOrigins,
  methods: ['GET', 'POST'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Socket.IO server running' });
});

const io = new Server(server, {
  cors: corsOptions,
});

// In-memory online user tracking: [{ userId, socketId }]
// Note: For multi-instance horizontal scaling, use a Redis adapter.
let onlineUsers = [];

const addOnlineUser = (userId, socketId) => {
  if (!userId) return;
  const existingIndex = onlineUsers.findIndex((user) => user.userId === userId);
  if (existingIndex !== -1) {
    onlineUsers[existingIndex].socketId = socketId;
  } else {
    onlineUsers.push({ userId, socketId });
  }
};

const removeOnlineUser = (socketId) => {
  onlineUsers = onlineUsers.filter((user) => user.socketId !== socketId);
};

const getOnlineUser = (userId) => {
  return onlineUsers.find((user) => user.userId === userId);
};

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Register online user
  socket.on('addUser', (userId) => {
    addOnlineUser(userId, socket.id);
    io.emit('getUsers', onlineUsers);
  });

  // Relay chat message in real-time if recipient is online
  socket.on('sendMessage', ({ senderId, receiverId, conversationId, message }) => {
    const receiver = getOnlineUser(receiverId);
    if (receiver) {
      io.to(receiver.socketId).emit('getMessage', {
        senderId,
        conversationId,
        message,
      });
    }
  });

  // Relay message seen indicator
  socket.on('messageSeen', ({ conversationId, receiverId }) => {
    const receiver = getOnlineUser(receiverId);
    if (receiver) {
      io.to(receiver.socketId).emit('messageSeen', {
        conversationId,
      });
    }
  });

  // Relay typing indicator
  socket.on('typing', ({ conversationId, receiverId, isTyping }) => {
    const receiver = getOnlineUser(receiverId);
    if (receiver) {
      io.to(receiver.socketId).emit('typing', {
        conversationId,
        isTyping,
      });
    }
  });

  // Handle client disconnection
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
    removeOnlineUser(socket.id);
    io.emit('getUsers', onlineUsers);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Socket server listening on port ${PORT}`);
});
