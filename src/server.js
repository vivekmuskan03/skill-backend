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

const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
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
      // eslint-disable-next-line no-console
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
    // eslint-disable-next-line no-console
    console.error('Failed to connect DB', err);
    process.exit(1);
  });


