import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { ORIGIN, startApp } from './helpers.js';

const app = await startApp();
after(() => app.stop());

let member;
before(async () => {
  member = await app.member();
  await app.db.collection('brands').insertOne({ slug: 'dior', name: 'Dior', category: 'fashion', order: 1 });
  await app.db.collection('products').insertOne({ brand: 'dior', ref: 'A1', name: 'Lady Dior', category: 'bags', createdAt: new Date() });
});

describe('Origin check (CSRF)', () => {
  const login = { email: 'nobody@example.com', password: 'whatever pass' };

  for (const origin of ['https://evil.example', 'null', `${ORIGIN}.evil.example`, 'http://localhost:5174', ORIGIN.replace('http:', 'https:')]) {
    it(`refuses state changes from ${origin}`, async () => {
      assert.equal((await app.client().post('/auth/login', login, { origin })).status, 403);
      assert.equal((await member.post('/auth/logout', undefined, { origin })).status, 403);
      assert.equal((await member.patch('/me', { displayName: 'Hacked Name' }, { origin })).status, 403);
    });
  }

  it('still allows the frontend, and requests without an Origin', async () => {
    assert.equal((await app.client().post('/auth/login', login)).status, 401);
    assert.equal((await app.client().post('/auth/login', login, { origin: null })).status, 401);
  });

  it('gives CORS access to the frontend only', async () => {
    const good = await app.client().get('/health');
    assert.equal(good.headers.get('access-control-allow-origin'), ORIGIN);
    assert.equal(good.headers.get('access-control-allow-credentials'), 'true');
    const preflight = await fetch(`${app.base}/api/me`, {
      method: 'OPTIONS',
      headers: { origin: 'https://evil.example', 'access-control-request-method': 'PATCH' },
    });
    assert.notEqual(preflight.headers.get('access-control-allow-origin'), 'https://evil.example');
  });

  it('does not change anything on a GET', async () => {
    const client = await app.member();
    assert.equal((await client.get('/auth/logout')).status, 404);
    assert.ok((await client.get('/me')).body.user);
  });

  it('only reads JSON bodies sent as JSON, so simple cross-site forms carry nothing', async () => {
    const res = await member.request('PATCH', '/me', {
      form: JSON.stringify({ displayName: 'Hacked Name' }),
      headers: { 'content-type': 'text/plain' },
    });
    assert.equal(res.status, 400);
  });
});

describe('errors', () => {
  it('answers malformed JSON with 400 and no details', async () => {
    const res = await member.request('POST', '/auth/login', { form: '{"email": ', headers: { 'content-type': 'application/json' } });
    assert.equal(res.status, 400);
    assert.deepEqual(Object.keys(res.body), ['error']);
    assert.ok(!res.text.includes('node_modules'));
    assert.ok(!/ at .*\.js/.test(res.text));
  });

  it('answers a body over the limit with 413', async () => {
    const res = await app.client().post('/auth/login', { email: 'a@example.com', password: 'x'.repeat(200_000) });
    assert.equal(res.status, 413);
  });

  it('answers unknown routes and bad URLs with JSON', async () => {
    const missing = await app.client().get('/nope');
    assert.equal(missing.status, 404);
    assert.ok(missing.body.error.message);
    assert.equal((await app.client().get('/products/%E0%A4%A/x')).status, 400);
  });

  it('hides the message of unexpected errors from the client', async () => {
    const { errorHandler } = await import('../src/middleware/error.js');
    const sent = {};
    const res = {
      headersSent: false,
      set() {},
      status(code) {
        sent.status = code;
        return this;
      },
      json(body) {
        sent.body = body;
      },
    };
    const logged = [];
    const realError = console.error;
    console.error = (...args) => logged.push(args);
    try {
      const err = new Error('failed for mongodb://user:secret@host');
      err.connectionDetails = 'user:secret';
      errorHandler(err, {}, res, () => {});
    } finally {
      console.error = realError;
    }
    assert.equal(sent.status, 500);
    assert.deepEqual(sent.body, { error: { message: 'Internal server error' } });
    assert.ok(!logged.some((args) => args.some((arg) => arg?.connectionDetails)), 'the log gets the stack, not the error object');
  });
});

describe('query injection and odd input', () => {
  it('does not treat bracket parameters as query operators', async () => {
    for (const query of ['brand[$ne]=x', 'q[$regex]=.*', 'collection[$gt]=', 'market[$ne]=VN']) {
      const res = await app.client().get(`/products?${query}`);
      assert.equal(res.status, 200, query);
      assert.equal(res.body.total, 1, query);
    }
    assert.equal((await member.get('/forum/topics?author[$ne]=x')).status, 200);
  });

  it('answers odd search text without a server error', async () => {
    for (const q of ['a%00b', '%00', '%F0%9F%98%80', '(((', '%5B', 'a%5Cb', '%2A%2B%3F', '%E2%80%AE']) {
      assert.ok((await app.client().get(`/products?q=${q}`)).status < 500, `products q=${q}`);
      assert.ok((await member.get(`/forum/topics?q=${q}`)).status < 500, `forum q=${q}`);
    }
  });

  it('answers odd values in other parameters without a server error', async () => {
    for (const url of ['/products?brand=a%00', '/products?page=9007199254740991', '/products/a%00/b%00', '/brands/a%00', '/deals?page=9007199254740991', '/products?minPriceVnd=1e308']) {
      assert.ok((await app.client().get(url)).status < 500, url);
    }
    assert.ok((await member.get('/forum/topics?page=9007199254740991')).status < 500);
    assert.ok((await member.get('/forum/topics?brand=a%00')).status < 500);
  });

  it('refuses a very long forum search', async () => {
    assert.equal((await member.get(`/forum/topics?q=${'a'.repeat(101)}`)).status, 400);
    assert.equal((await member.get(`/forum/topics?q=${'a '.repeat(50)}`)).status, 200);
  });

  it('survives bodies that are not objects', async () => {
    for (const body of [[], 'text', 5, null]) {
      const res = await member.request('POST', '/auth/login', { form: JSON.stringify(body), headers: { 'content-type': 'application/json' } });
      assert.ok(res.status < 500, JSON.stringify(body));
    }
  });
});

describe('response headers', () => {
  it('does not name the framework, and forbids sniffing', async () => {
    const res = await app.client().get('/brands');
    assert.equal(res.headers.get('x-powered-by'), null);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  });

  it('keeps private responses out of caches', async () => {
    for (const url of ['/me', '/forum/topics']) {
      assert.match((await member.get(url)).headers.get('cache-control') ?? '', /no-store/, url);
    }
    const login = await app.client().post('/auth/login', { email: member.email, password: 'wrong password' });
    assert.match(login.headers.get('cache-control') ?? '', /no-store/);
  });
});
