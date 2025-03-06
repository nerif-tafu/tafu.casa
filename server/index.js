import { Server } from 'socket.io';
import { createServer } from 'http';
import { createServer as createHttpsServer } from 'https';
import { config } from './config.js';
import fs from 'fs';

const createServer = () => {
  if (config.server.ssl) {
    return createHttpsServer({
      key: fs.readFileSync(config.server.ssl.key),
      cert: fs.readFileSync(config.server.ssl.cert)
    });
  }
  return createServer();
};

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// ... rest of your server code ...

httpServer.listen(config.server.port, '0.0.0.0', () => {
  console.log(`WebSocket server running on port ${config.server.port}`);
}); 