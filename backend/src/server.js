import app from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';

import dns from 'node:dns';

dns.setServers(['8.8.8.8', '8.8.4.4']);

let server;
let stopping = false;

async function start() {
  await connectDatabase();
  server = app.listen(env.port, () => {
    logger.info(`CIT scheduling API listening on http://localhost:${env.port}`);
  });
}

async function stop(signal) {
  if (stopping) return;
  stopping = true;
  logger.info(`${signal} received; shutting down.`);

  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
    await disconnectDatabase();
  } catch (error) {
    logger.error('Shutdown did not complete cleanly.', { message: error.message });
    process.exitCode = 1;
  }
}

process.on('SIGINT', () => void stop('SIGINT'));
process.on('SIGTERM', () => void stop('SIGTERM'));

start().catch((error) => {
  logger.error('Backend startup failed.', { message: error.message, code: error.code });
  process.exitCode = 1;
});
