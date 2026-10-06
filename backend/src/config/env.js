import dotenv from 'dotenv';

// Load backend/.env (if present) before anything reads process.env.
dotenv.config({ quiet: true });

export const env = {
  port: Number(process.env.PORT) || 5000,
  mongodbUri: process.env.MONGODB_URI || '',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
};
