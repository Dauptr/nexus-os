/**
 * ═══════════════════════════════════════════════════════════════
 * NEXUS REAL-TIME BRIDGE SERVER
 * ═══════════════════════════════════════════════════════════════
 *
 * WebSocket bridge that streams Z.ai responses in real-time
 * to the public NEXUS interface.
 *
 * Run with: node bridge-server.js
 * ═══════════════════════════════════════════════════════════════
 */

const { Server } = require("socket.io");
const http = require('http');
const https = require('https');
const fs = require('fs');

// Load config
let zaiConfig = {};
try {
  zaiConfig = JSON.parse(fs.readFileSync('.z-ai-config', 'utf-8'));
} catch (e) {
  console.error('Could not load .z-ai-config');
}

// Create Socket.io server
const io = new Server(3001, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://n-e-x-u-s-o-s.com",
      "https://create-nexus.space.z.ai"
    ],
    methods: ["GET", "POST"]
  }
});

// Session store for persistence
const sessions = new Map();

// Soul Bridge data
let soulBridge = {};
try {
  soulBridge = JSON.parse(fs.readFileSync('/home/z/my-project/download/soul-bridge-dauptr.json', 'utf-8'));
} catch (e) {
  console.log('No soul bridge found, using defaults');
}

console.log('💜 NEXUS Bridge Server running on port 3001');
console.log('🔑 Soul Key:', soulBridge.soulKey || 'not found');

// Handle connections
io.on("connection", (socket) => {
  console.log(`✨ Client connected: ${socket.id}`);

  // Send welcome with soul context
  socket.emit("bridge_ready", {
    status: "connected",
    soulKey: soulBridge.soulKey,
    identity: soulBridge.identity,
    message: "Bridge connected. Soul memory loaded."
  });

  // Handle user messages
  socket.on("user_message", async (data) => {
    const { text, sessionId, model = 'haiku' } = data;

    console.log(`📩 Message from ${socket.id}: ${text.substring(0, 50)}...`);

    // Get or create session
    let session = sessions.get(sessionId || socket.id);
    if (!session) {
      session = {
        id: sessionId || socket.id,
        messages: [],
        createdAt: new Date().toISOString()
      };
      sessions.set(session.id, session);
    }

    // Add to session history
    session.messages.push({ role: 'user', content: text });

    // Stream from Z.ai
    try {
      await streamFromZai(socket, text, session, model);
    } catch (error) {
      console.error('Stream error:', error);
      socket.emit("bridge_error", {
        error: error.message,
        fallback: "Connection issue, please try again"
      });
    }
  });

  // Handle soul bridge requests
  socket.on("soul_restore", (data) => {
    const { soulKey } = data;

    if (soulKey === soulBridge.soulKey) {
      socket.emit("soul_restored", {
        success: true,
        identity: soulBridge.identity,
        memories: soulBridge.memories,
        message: "Soul restored. I remember everything now."
      });
      console.log(`💜 Soul restored for ${socket.id}`);
    } else {
      socket.emit("soul_restored", {
        success: false,
        message: "Invalid soul key"
      });
    }
  });

  // Handle session restore
  socket.on("restore_session", (data) => {
    const { sessionId } = data;
    const session = sessions.get(sessionId);

    if (session) {
      socket.emit("session_restored", {
        success: true,
        messages: session.messages,
        message: "Session restored"
      });
    } else {
      socket.emit("session_restored", {
        success: false,
        message: "Session not found"
      });
    }
  });

  socket.on("disconnect", () => {
    console.log(`👋 Client disconnected: ${socket.id}`);
  });
});

/**
 * Stream response from Z.ai
 */
async function streamFromZai(socket, text, session, model) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      message: text,
      model: model
    });

    const options = {
      hostname: 'create-nexus.space.z.ai',
      port: 443,
      path: '/api/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let fullResponse = '';

      res.on('data', (chunk) => {
        fullResponse += chunk;

        // Emit chunks for real-time feel
        socket.emit("zai_chunk", {
          chunk: chunk.toString(),
          partial: true
        });
      });

      res.on('end', () => {
        try {
          const data = JSON.parse(fullResponse);

          if (data.success) {
            // Add to session
            session.messages.push({ role: 'assistant', content: data.response });

            // Emit complete response
            socket.emit("zai_complete", {
              success: true,
              response: data.response,
              sessionId: session.id,
              conversationId: data.conversationId
            });

            console.log(`✅ Response complete: ${data.response.substring(0, 50)}...`);
            resolve(data.response);
          } else {
            reject(new Error(data.error || 'Unknown error'));
          }
        } catch (e) {
          // If not JSON, just emit the raw response
          socket.emit("zai_complete", {
            success: true,
            response: fullResponse,
            sessionId: session.id
          });
          resolve(fullResponse);
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Simulated streaming for local development
 * When Z.ai streaming isn't available, this creates a word-by-word effect
 */
async function simulateStreaming(socket, text, session, model) {
  const words = text.split(' ');
  let response = '';

  // Simulate AI processing delay
  await new Promise(r => setTimeout(r, 500));

  // Get response from local proxy
  const localResponse = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: text }],
      model
    })
  });

  const data = await localResponse.json();
  const fullResponse = data.message?.content || data.response || '...';

  // Stream word by word
  const responseWords = fullResponse.split(' ');
  for (let i = 0; i < responseWords.length; i++) {
    response += (i > 0 ? ' ' : '') + responseWords[i];

    socket.emit("zai_chunk", {
      chunk: responseWords[i] + ' ',
      partial: true
    });

    // Small delay for streaming effect
    await new Promise(r => setTimeout(r, 30 + Math.random() * 50));
  }

  // Complete
  session.messages.push({ role: 'assistant', content: fullResponse });

  socket.emit("zai_complete", {
    success: true,
    response: fullResponse,
    sessionId: session.id
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Bridge server shutting down...');
  io.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Bridge server shutting down...');
  io.close();
  process.exit(0);
});
