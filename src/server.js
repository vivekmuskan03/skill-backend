import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './app.js';
import { connectDb } from './utils/db.js';
import { attachChatHandlers } from './sockets/chat.js';
import { isModelAvailable } from './services/ai.service.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// SOCKET CORS FIX ✅
const io = new SocketIOServer(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://skill-frontend-iota.vercel.app"
    ],
    credentials: true
  }
});

app.set('io', io);

io.on('connection', (socket) => {
  attachChatHandlers(io, socket);
});

connectDb()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Backend server listening on port ${PORT}`);
      try {
        const ok = isModelAvailable();
        console.log(`AI model available: ${ok}`);
      } catch (e) {
        console.log('AI model availability check failed');
      }
    });
  })
  .catch((err) => {
    console.error('Failed to connect DB', err);
    process.exit(1);
  });

