import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      /^http:\/\/192\.168\.\d+\.\d+:3000$/,  // Local network IPs
      /^http:\/\/10\.\d+\.\d+\.\d+:3000$/    // Local network IPs
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

let broadcaster;

io.on('connection', socket => {
  socket.on('broadcaster', () => {
    broadcaster = socket.id;
    socket.broadcast.emit('broadcaster');
  });

  socket.on('watcher', () => {
    socket.to(broadcaster).emit('watcher', socket.id);
  });

  socket.on('offer', (id, message) => {
    socket.to(id).emit('offer', socket.id, message);
  });

  socket.on('answer', (id, message) => {
    socket.to(id).emit('answer', socket.id, message);
  });

  socket.on('candidate', (id, message) => {
    socket.to(id).emit('candidate', socket.id, message);
  });

  socket.on('disconnect', () => {
    if (socket.id === broadcaster) {
      socket.broadcast.emit('disconnectPeer');
    } else {
      socket.to(broadcaster).emit('disconnectPeer', socket.id);
    }
  });
});

const startServer = async () => {
  try {
    const port = process.env.PORT || 3001;
    httpServer.listen(port, '0.0.0.0', () => {
      console.log(`Server listening on http://0.0.0.0:${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer(); 