import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { checkOrigin } from './middleware/check-origin.js';
import { notFound, errorHandler } from './middleware/error.js';

const app = express();

// Behind a host's proxy, read the client IP (rate limits) from X-Forwarded-For.
if (env.trustProxy > 0) {
  app.set('trust proxy', env.trustProxy);
}

// credentials: the frontend sends the session cookie cross-origin in development.
app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(checkOrigin);

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
