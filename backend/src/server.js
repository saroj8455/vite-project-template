import http from 'node:http';
import app from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { attachMeetingSignaling } from './services/meetingSignaling.js';

let server;
let signalingServer;
let isShuttingDown = false;

async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`${signal} received. Starting graceful shutdown...`);

  try {
    signalingServer?.clients.forEach((socket) => socket.terminate());
    signalingServer?.close();
    if (server?.listening) {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) return reject(error);
          console.log('HTTP server closed');
          return resolve();
        });
      });
    }
    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    console.error('Graceful shutdown failed:', error);
    process.exit(1);
  }
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  void shutdown('uncaughtException');
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  void shutdown('unhandledRejection');
});

async function startServer() {
  try {
    await connectDatabase();
    server = http.createServer(app);
    signalingServer = attachMeetingSignaling(server);
    server.listen(env.port, () => {
      console.log(`Meeting API listening on port ${env.port}`);
    });
  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
}

void startServer();
