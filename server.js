const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Serve static files from 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Main Route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Chat & Media Logic ---
io.on('connection', (socket) => {
  console.log('User connected: ' + socket.id);

  // Broadcast to everyone that a user joined
  socket.broadcast.emit('chat message', {
    user: 'SYSTEM',
    text: 'A new user has connected to the Nexus.',
    type: 'system'
  });

  // Listen for text messages
  socket.on('chat message', (msg) => {
    io.emit('chat message', msg);
  });

  // Listen for media (images/files)
  socket.on('chat media', (data) => {
    io.emit('chat media', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
    socket.broadcast.emit('chat message', {
      user: 'SYSTEM',
      text: 'A user has disconnected.',
      type: 'system'
    });
  });
});

server.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║     NEXUS OS UNLIMITED EDITION        ║
  ╠═══════════════════════════════════════╣
  ║  Server: http://localhost:${PORT}        ║
  ║  Status: ONLINE | Chat: ENABLED       ║
  ╚═══════════════════════════════════════╝
  `);
});
