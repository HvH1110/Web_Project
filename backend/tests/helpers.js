// Shared test setup: the real Express app on a throwaway in-memory MongoDB.
//
// `npm test` runs in backend/, where env.js would load backend/.env. Every
// variable the app reads is set here first, and dotenv never overrides a variable
// that is already set, so Atlas and the real S3 bucket can't be reached.
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { MongoMemoryServer } from 'mongodb-memory-server-core';

export const ORIGIN = 'http://localhost:5173';
export const PASSWORD = 'correct horse battery';

export function assertLocalDb(uri) {
  if (!uri.startsWith('mongodb://127.0.0.1')) {
    throw new Error('Tests must only use the in-memory database');
  }
}

export function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'backend-test-'));
}

export function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

// Each client gets its own IP (through X-Forwarded-For, with TRUST_PROXY=1), so
// the per-IP rate limits of one test don't affect another.
let clientCount = 0;
export function uniqueIp() {
  clientCount += 1;
  return `10.${(clientCount >> 16) & 255}.${(clientCount >> 8) & 255}.${clientCount & 255}`;
}

export class Client {
  constructor(base, { ip = uniqueIp() } = {}) {
    this.base = base;
    this.ip = ip;
    this.cookie = null;
    this.user = null;
  }

  async request(method, url, { json, form, headers = {}, origin = ORIGIN } = {}) {
    const res = await fetch(`${this.base}/api${url}`, {
      method,
      headers: {
        'x-forwarded-for': this.ip,
        ...(origin ? { origin } : {}),
        ...(json !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(this.cookie ? { cookie: `sid=${this.cookie}` } : {}),
        ...headers,
      },
      body: form ?? (json !== undefined ? JSON.stringify(json) : undefined),
    });
    for (const line of res.headers.getSetCookie()) {
      const [pair] = line.split(';');
      const value = pair.slice(pair.indexOf('=') + 1);
      if (pair.startsWith('sid=')) {
        this.cookie = value || null;
      }
    }
    const text = await res.text();
    let body = null;
    try {
      body = JSON.parse(text);
    } catch {
      // Not JSON: tests look at the text.
    }
    return { status: res.status, body, text, headers: res.headers };
  }

  get(url, options) {
    return this.request('GET', url, options);
  }
  post(url, json, options) {
    return this.request('POST', url, { json, ...options });
  }
  patch(url, json, options) {
    return this.request('PATCH', url, { json, ...options });
  }
  put(url, json, options) {
    return this.request('PUT', url, { json, ...options });
  }
  delete(url, options) {
    return this.request('DELETE', url, options);
  }
}

// Starts the app. `env` adds or replaces environment variables.
export async function startApp(env = {}) {
  const mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri('backendtest');
  assertLocalDb(uri);
  const uploadsDir = tempDir();
  Object.assign(process.env, {
    MONGODB_URI: uri,
    PORT: '0',
    CLIENT_ORIGIN: ORIGIN,
    COOKIE_SECURE: 'true',
    COOKIE_SAME_SITE: 'lax',
    TRUST_PROXY: '1',
    UPLOAD_STORAGE: 'local',
    UPLOADS_DIR: uploadsDir,
    UPLOADS_PUBLIC_URL: '',
    S3_ENDPOINT: '',
    S3_REGION: 'auto',
    S3_BUCKET: '',
    S3_ACCESS_KEY_ID: '',
    S3_SECRET_ACCESS_KEY: '',
    ...env,
  });

  // Imported only now, because the app reads the environment on import.
  const { default: mongoose } = await import('mongoose');
  const { default: app } = await import('../src/app.js');
  const { connectDB } = await import('../src/config/db.js');
  await connectDB(uri);
  // Unique indexes must exist before the tests rely on them.
  await Promise.all(mongoose.modelNames().map((name) => mongoose.model(name).init()));

  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const db = mongoose.connection.db;

  let userCount = 0;
  // A logged-in client, with its user in client.user. `role` is set in the
  // database, as `npm run set-role` does.
  async function member(role = 'member') {
    userCount += 1;
    const client = new Client(base);
    const res = await client.post('/auth/register', {
      email: `user${userCount}@example.com`,
      password: PASSWORD,
      displayName: `User ${userCount}`,
    });
    if (res.status !== 201) {
      throw new Error(`register failed: ${res.status} ${res.text}`);
    }
    client.user = res.body.user;
    client.email = `user${userCount}@example.com`;
    if (role !== 'member') {
      await db.collection('users').updateOne({ email: client.email }, { $set: { role } });
    }
    return client;
  }

  return {
    base,
    db,
    uploadsDir,
    member,
    client: (options) => new Client(base, options),
    async stop() {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
      await mongoose.disconnect();
      await mongo.stop();
      fs.rmSync(uploadsDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    },
  };
}
