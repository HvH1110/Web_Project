import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { apiLimits } from './middleware/api-limits.js';
import { checkOrigin } from './middleware/check-origin.js';
import { notFound, errorHandler } from './middleware/error.js';
import { requireProxy } from './middleware/require-proxy.js';
import { noSniff } from './middleware/response-headers.js';
import { localUploadsDir } from './services/storage/local.js';

const app = express();
app.disable('x-powered-by');

// Behind a host's proxy, read the client IP (rate limits) from X-Forwarded-For.
if (env.trustProxy > 0) {
  app.set('trust proxy', env.trustProxy);
}

// credentials: the frontend sends the session cookie cross-origin in development.
app.use(noSniff);
app.use(requireProxy);
app.use(cors({ origin: env.clientOrigin, credentials: true }));

// Uploaded images, when stored on this server's disk (development). Keys are
// random and never reused, so files can be cached forever.
if (env.uploadStorage === 'local') {
  app.use(
    '/api/uploads',
    express.static(localUploadsDir, {
      index: false,
      dotfiles: 'deny',
      immutable: true,
      maxAge: '365d',
    }),
  );
}

// After the uploads: images are already compressed. Outbound traffic is the
// tightest limit of the free hosting plan (devops/DEPLOY.md).
app.use(compression());

app.use('/api', apiLimits);
app.use(express.json());
app.use(cookieParser());
app.use(checkOrigin);

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
