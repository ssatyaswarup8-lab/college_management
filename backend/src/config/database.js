import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from './logger.js';

export async function connectDatabase() {
  if (!env.mongodbUri) {
    const error = new Error('MONGODB_URI is required to connect to the database.');
    error.code = 'MONGODB_URI_MISSING';
    throw error;
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongodbUri, {
    serverSelectionTimeoutMS: 10_000,
  });

  logger.info('Connected to MongoDB.');
  return mongoose.connection;
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB.');
  }
}
