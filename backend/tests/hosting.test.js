// The real src/server.js as a separate process, the way hosting runs it: waiting
// for the database on a wake-up, a real outage, and storage on an S3-style service.
// The process runs outside backend/, so it can't load backend/.env.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { MongoMemoryServer } from 'mongodb-memory-server-core';
import sharp from 'sharp';
import { ORIGIN, PASSWORD, assertLocalDb, freePort, tempDir } from './helpers.js';

const SERVER = fileURLToPath(new URL('../src/server.js', import.meta.url));
const cwd = tempDir();
const children = new Set();

after(async () => {
  for (const child of children) {
    child.kill();
  }
  await new Promise((resolve) => setTimeout(resolve, 300));
  fs.rmSync(cwd, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function startServer(env) {
  assertLocalDb(env.MONGODB_URI);
  const port = await freePort();
  const child = spawn(process.execPath, [SERVER], {
    cwd,
    env: {
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
      PORT: String(port),
      CLIENT_ORIGIN: ORIGIN,
      UPLOADS_DIR: path.join(cwd, 'uploads'),
      ...env,
    },
  });
  children.add(child);
  const output = [];
  child.stdout.on('data', (data) => output.push(String(data)));
  child.stderr.on('data', (data) => output.push(String(data)));

  const url = (route) => `http://127.0.0.1:${port}/api${route}`;
  const timed = async (route, init) => {
    const started = Date.now();
    const res = await fetch(url(route), init);
    const text = await res.text();
    return { status: res.status, text, ms: Date.now() - started };
  };
  for (let i = 0; i < 200; i += 1) {
    try {
      if ((await timed('/health')).status === 200) {
        break;
      }
    } catch {
      await sleep(50);
    }
  }
  return {
    timed,
    url,
    output,
    async waitForDb(expected = 'connected', ms = 30_000) {
      const until = Date.now() + ms;
      while (Date.now() < until) {
        if ((await timed('/health')).text.includes(`"db":"${expected}"`)) {
          return true;
        }
        await sleep(100);
      }
      return false;
    },
    async stop() {
      child.kill();
      await new Promise((resolve) => child.once('exit', resolve));
      children.delete(child);
    },
  };
}

// portGeneration off: the database must come back on the port the server knows.
async function startDb(port) {
  for (let i = 0; ; i += 1) {
    try {
      return await MongoMemoryServer.create({ instance: { port, portGeneration: false } });
    } catch (err) {
      if (i >= 40) {
        throw err;
      }
      await sleep(500);
    }
  }
}
const dbUri = (port, timeout = 2000) => `mongodb://127.0.0.1:${port}/hostingtest?serverSelectionTimeoutMS=${timeout}`;

describe('waking up', () => {
  it('makes requests wait for the database instead of answering 503', async () => {
    // The database runs from the start and only becomes reachable later. Starting
    // it at that point can take over the 20 second wait on a busy machine, and
    // then the 503 would be right.
    const db = await MongoMemoryServer.create();
    const dbPort = await freePort();
    const server = await startServer({ MONGODB_URI: dbUri(dbPort, 30_000) });

    // More than EventEmitter's limit of 10 listeners, to catch leaks.
    const pending = Array.from({ length: 15 }, () => server.timed('/brands'));
    const health = await server.timed('/health');
    assert.ok(health.ms < 1000, `health took ${health.ms} ms`);
    assert.match(health.text, /disconnected/);

    await sleep(2000);
    const tunnel = net.createServer((socket) => {
      const upstream = net.connect(Number(new URL(db.getUri()).port), '127.0.0.1');
      socket.on('error', () => upstream.destroy());
      upstream.on('error', () => socket.destroy());
      socket.pipe(upstream).pipe(socket);
    });
    await new Promise((resolve) => tunnel.listen(dbPort, '127.0.0.1', resolve));
    const results = await Promise.all(pending);
    assert.deepEqual([...new Set(results.map((res) => res.status))], [200]);
    assert.ok(!server.output.join('').includes('MaxListeners'));

    const later = await server.timed('/brands');
    assert.ok(later.ms < 1000, `no more waiting, took ${later.ms} ms`);

    await server.stop();
    tunnel.close();
    await db.stop();
  });
});

describe('a real outage', () => {
  it('answers 503 after the wait, keeps health quick, and recovers by itself', async () => {
    const dbPort = await freePort();
    const server = await startServer({ MONGODB_URI: dbUri(dbPort) });

    const first = await server.timed('/brands');
    assert.equal(first.status, 503);
    assert.match(first.text, /Database unavailable/);
    assert.ok(first.ms < 25_000, `waited ${first.ms} ms`);

    const health = await server.timed('/health');
    assert.equal(health.status, 200);
    assert.ok(health.ms < 1000, `health took ${health.ms} ms`);
    const second = await server.timed('/brands');
    assert.equal(second.status, 503);
    assert.ok(second.ms < 1000, `the wait is over, took ${second.ms} ms`);

    let db = await startDb(dbPort);
    assert.ok(await server.waitForDb('connected'), 'recovers when the database returns');
    assert.equal((await server.timed('/brands')).status, 200);
    assert.ok(!server.output.join('').includes('mongodb://'), 'the log does not show the connection string');

    await db.stop({ doCleanup: true });
    assert.ok(await server.waitForDb('disconnected'), 'notices the database is gone');
    const during = await server.timed('/brands');
    assert.equal(during.status, 503);
    assert.ok(during.ms < 1000, `no waiting while running, took ${during.ms} ms`);

    db = await startDb(dbPort);
    assert.ok(await server.waitForDb('connected'), 'recovers again');
    await server.stop();
    await db.stop();
  });

  it('does not wait for the driver’s own, longer timeout', async () => {
    const server = await startServer({ MONGODB_URI: `mongodb://127.0.0.1:${await freePort()}/hostingtest` });
    const first = await server.timed('/brands');
    assert.equal(first.status, 503);
    assert.ok(first.ms < 25_000, `waited ${first.ms} ms`);
    await server.stop();
  });
});

describe('startup', () => {
  it('purges old unused uploads', async () => {
    const dbPort = await freePort();
    const db = await startDb(dbPort);
    const dir = path.join(cwd, 'uploads', 'forum');
    fs.mkdirSync(dir, { recursive: true });
    const { default: mongoose } = await import('mongoose');
    const connection = await mongoose.createConnection(dbUri(dbPort)).asPromise();
    const owner = new mongoose.Types.ObjectId();
    const doc = (key, createdAt, attachedTo = null) => ({ key, ownerId: owner, width: 1, height: 1, size: 1, attachedTo, createdAt, updatedAt: createdAt });
    const old = new Date(Date.now() - 2 * 86400000);
    for (const name of ['old.webp', 'fresh.webp', 'used.webp']) {
      fs.writeFileSync(path.join(dir, name), 'x');
    }
    await connection.collection('uploads').insertMany([
      doc('forum/old.webp', old),
      doc('forum/fresh.webp', new Date()),
      doc('forum/used.webp', old, { kind: 'topic', id: new mongoose.Types.ObjectId() }),
    ]);
    await connection.close();

    const server = await startServer({ MONGODB_URI: dbUri(dbPort) });
    assert.ok(await server.waitForDb());
    for (let i = 0; i < 40 && fs.existsSync(path.join(dir, 'old.webp')); i += 1) {
      await sleep(100);
    }
    assert.ok(!fs.existsSync(path.join(dir, 'old.webp')));
    assert.ok(fs.existsSync(path.join(dir, 'fresh.webp')));
    assert.ok(fs.existsSync(path.join(dir, 'used.webp')));
    await server.stop();
    await db.stop();
  });
});

describe('PROXY_SECRET', () => {
  it('only lets the proxy reach the API, and always the health check', async () => {
    const dbPort = await freePort();
    const db = await startDb(dbPort);
    const server = await startServer({ MONGODB_URI: dbUri(dbPort), PROXY_SECRET: 'proxy-test-secret' });
    assert.ok(await server.waitForDb());

    const direct = await server.timed('/brands');
    assert.equal(direct.status, 403);
    assert.ok(!direct.text.includes('proxy-test-secret'));
    assert.equal((await server.timed('/brands', { headers: { 'x-proxy-secret': 'wrong' } })).status, 403);
    assert.equal((await server.timed('/brands', { headers: { 'x-proxy-secret': 'proxy-test-secret' } })).status, 200);
    assert.equal((await server.timed('/health')).status, 200);

    await server.stop();
    await db.stop();
  });
});

describe('S3-style storage', () => {
  it('stores and deletes files on the bucket, with no checksum headers', async () => {
    const captured = [];
    const fakeS3 = http.createServer((req, res) => {
      const chunks = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', () => {
        captured.push({ method: req.method, url: req.url, headers: req.headers, body: Buffer.concat(chunks) });
        res.writeHead(req.method === 'DELETE' ? 204 : 200, { ETag: '"abc"' });
        res.end();
      });
    });
    await new Promise((resolve) => fakeS3.listen(0, '127.0.0.1', resolve));
    const dbPort = await freePort();
    const db = await startDb(dbPort);
    const server = await startServer({
      MONGODB_URI: dbUri(dbPort),
      UPLOAD_STORAGE: 's3',
      S3_ENDPOINT: `http://127.0.0.1:${fakeS3.address().port}`,
      S3_REGION: 'auto',
      S3_BUCKET: 'test-bucket',
      S3_ACCESS_KEY_ID: 'test-key',
      S3_SECRET_ACCESS_KEY: 'test-secret',
      UPLOADS_PUBLIC_URL: 'https://pub-test.r2.dev/',
    });
    assert.ok(await server.waitForDb());

    const headers = { 'content-type': 'application/json', origin: ORIGIN };
    const registered = await fetch(server.url('/auth/register'), {
      method: 'POST',
      headers,
      body: JSON.stringify({ email: 's3@example.com', password: PASSWORD, displayName: 'S3 Test' }),
    });
    const cookie = registered.headers.getSetCookie()[0].split(';')[0];

    const form = new FormData();
    const png = await sharp({ create: { width: 20, height: 10, channels: 3, background: '#aa3344' } }).png().toBuffer();
    form.append('image', new Blob([png], { type: 'image/png' }), 'a.png');
    const uploaded = await fetch(server.url('/forum/uploads'), { method: 'POST', headers: { origin: ORIGIN, cookie }, body: form });
    assert.equal(uploaded.status, 201);
    const { upload } = await uploaded.json();
    assert.match(upload.url, /^https:\/\/pub-test\.r2\.dev\/forum\/[0-9a-f]{32}\.webp$/);

    const put = captured.find((request) => request.method === 'PUT');
    assert.match(put.url, /^\/test-bucket\/forum\/[0-9a-f]{32}\.webp/);
    assert.deepEqual(Object.keys(put.headers).filter((name) => name.includes('checksum')), []);
    assert.equal(put.headers['content-type'], 'image/webp');
    assert.match(put.headers['cache-control'], /immutable/);
    assert.equal(put.body.subarray(0, 4).toString(), 'RIFF');
    assert.ok(!JSON.stringify(put.headers).includes('test-secret'));

    const topic = await fetch(server.url('/forum/topics'), {
      method: 'POST',
      headers: { ...headers, cookie },
      body: JSON.stringify({ title: 'Topic with an image', body: 'x', images: [upload.id] }),
    });
    const { topic: created } = await topic.json();
    const deleted = await fetch(server.url(`/forum/topics/${created.id}`), { method: 'DELETE', headers: { origin: ORIGIN, cookie } });
    assert.equal(deleted.status, 204);
    const removal = captured.find((request) => request.method === 'DELETE');
    assert.ok(removal.url.startsWith(put.url.split('?')[0]));
    assert.ok(!Object.keys(removal.headers).some((name) => name.includes('checksum')));

    await server.stop();
    await db.stop();
    await new Promise((resolve) => fakeS3.close(resolve));
  });
});
