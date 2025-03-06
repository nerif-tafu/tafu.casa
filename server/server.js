import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",  // Allow all origins in development
    methods: ["GET", "POST"]
  },
  path: '/socket.io/',
  allowEIO3: true,
  transports: ['websocket', 'polling']
});

let broadcaster;
let watchers = new Set();

io.on('connection', socket => {
  console.log('New connection attempt:', {
    id: socket.id,
    headers: socket.handshake.headers,
    address: socket.handshake.address
  });

  // When a broadcaster connects
  socket.on('broadcaster', () => {
    console.log('Broadcaster connected:', socket.id);
    broadcaster = socket.id;
    // Notify all watchers about the new broadcaster
    socket.broadcast.emit('broadcaster');
  });

  // When a watcher connects
  socket.on('watcher', () => {
    console.log('Watcher connected:', socket.id);
    watchers.add(socket.id);
    
    if (broadcaster) {
      console.log('Notifying broadcaster about watcher:', socket.id);
      // Tell the broadcaster to create a peer connection for this watcher
      socket.to(broadcaster).emit('watcher', socket.id);
    } else {
      console.log('No broadcaster available for watcher:', socket.id);
      socket.emit('no-broadcaster');
    }
  });

  socket.on('get-watchers', () => {
    if (socket.id === broadcaster) {
      socket.emit('watchers', Array.from(watchers));
    }
  });

  socket.on('reconnect-peer', (id) => {
    if (socket.id === broadcaster) {
      socket.to(id).emit('broadcaster');
    }
  });

  socket.on('offer', (id, description, sourceInfo) => {
    console.log('Relaying offer from', socket.id, 'to', id);
    socket.to(id).emit('offer', socket.id, description, sourceInfo);
  });

  socket.on('answer', (id, message) => {
    console.log('Relaying answer from', socket.id, 'to', id);
    socket.to(id).emit('answer', socket.id, message);
  });

  socket.on('candidate', (id, message) => {
    socket.to(id).emit('candidate', socket.id, message);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    watchers.delete(socket.id);
    if (socket.id === broadcaster) {
      console.log('Broadcaster disconnected');
      broadcaster = null;
      // Notify all watchers that the stream has ended
      socket.broadcast.emit('disconnectPeer');
    } else {
      socket.to(broadcaster).emit('disconnectPeer', socket.id);
    }
  });

  socket.on('quality-change', (quality) => {
    if (broadcaster) {
      socket.to(broadcaster).emit('quality-change', socket.id, quality);
    }
  });

  socket.on('quality-updated', (id, quality) => {
    socket.to(id).emit('quality-updated', quality);
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).send('OK');
});

const port = process.env.PORT || 9000;
server.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
}); 