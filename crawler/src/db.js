import mongoose from 'mongoose';
import { config } from './config.js';

export async function connectDB() {
  if (!config.mongodbUri) {
    throw new Error('MONGODB_URI is not set. Copy .env.example to .env and fill it in.');
  }
  await mongoose.connect(config.mongodbUri);
}

export function disconnectDB() {
  return mongoose.disconnect();
}
