import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { rateLimit } from '../src/middleware/rate-limit.js';
import { PASSWORD, startApp } from './helpers.js';

const app = await startApp();
after(() => app.stop());

const assert429 = (res) => {
  assert.equal(res.status, 429, res.text);
  assert.match(res.body.error.message, /Too many/);
  assert.ok(Number(res.headers.get('retry-after')) > 0);
};

describe('login', () => {
  it('limits attempts for one email, whatever the network', async () => {
    const email = 'target@example.com';
    for (let i = 0; i < 10; i += 1) {
      assert.equal((await app.client().post('/auth/login', { email, password: 'wrong password' })).status, 401);
    }
    assert429(await app.client().post('/auth/login', { email: ` ${email.toUpperCase()} `, password: 'wrong password' }));
  });

  it('limits attempts from one network, whatever the email', async () => {
    const client = app.client();
    for (let i = 0; i < 30; i += 1) {
      await client.post('/auth/login', { email: 'not-json' + i, password: 'x', extra: 1 }, { origin: null });
    }
    assert429(await client.post('/auth/login', { email: 'another@example.com', password: 'wrong password' }));
  });

  it('copes with a very long email used as a key', async () => {
    const res = await app.client().post('/auth/login', { email: `${'a'.repeat(90_000)}@example.com`, password: 'wrong password' });
    assert.equal(res.status, 401);
  });
});

describe('register', () => {
  it('limits registrations from one network', async () => {
    const client = app.client();
    for (let i = 0; i < 10; i += 1) {
      assert.equal((await client.post('/auth/register', {})).status, 400);
    }
    assert429(await client.post('/auth/register', {}));
  });
});

describe('public API', () => {
  it('limits requests from one network per minute, but never the health check', async () => {
    const client = app.client();
    let limited = null;
    for (let i = 0; i < 400 && !limited; i += 1) {
      const res = await client.get('/deals?limit=1');
      if (res.status === 429) {
        limited = res;
      }
    }
    assert.ok(limited, 'no limit within 400 requests');
    assert429(limited);
    assert.equal((await client.get('/health')).status, 200);
    assert.equal((await app.client().get('/deals?limit=1')).status, 200, 'other networks are not affected');
  });
});

describe('rateLimit middleware', () => {
  const run = (limiter, id) => {
    let result;
    const res = { set() {} };
    limiter({ id }, res, (err) => {
      result = err;
    });
    return result;
  };

  it('lets the window expire', async () => {
    const limiter = rateLimit({ windowMs: 50, max: 1, key: (req) => req.id });
    assert.equal(run(limiter, 'a'), undefined);
    assert.equal(run(limiter, 'a').status, 429);
    await new Promise((resolve) => setTimeout(resolve, 60));
    assert.equal(run(limiter, 'a'), undefined);
  });

  it('skips the limit when there is no key', () => {
    const limiter = rateLimit({ windowMs: 1000, max: 0, key: () => null });
    assert.equal(run(limiter, 'a'), undefined);
  });

  it('does not grow without limit under many different keys', () => {
    const windows = new Map();
    const limiter = rateLimit({ windowMs: 60_000, max: 5, key: (req) => req.id, store: windows });
    for (let i = 0; i < 25_000; i += 1) {
      run(limiter, `key-${i}`);
    }
    assert.ok(windows.size <= 10_001, `kept ${windows.size} keys`);
  });

  it('stores long keys at a bounded size', () => {
    const windows = new Map();
    const limiter = rateLimit({ windowMs: 60_000, max: 1, key: (req) => req.id, store: windows });
    const long = 'x'.repeat(100_000);
    run(limiter, long);
    assert.equal(run(limiter, long).status, 429, 'the same long key is still counted');
    assert.ok([...windows.keys()][0].length <= 300);
  });
});

describe('password attempts', () => {
  it('limits wrong current passwords per member', async () => {
    const client = await app.member();
    for (let i = 0; i < 10; i += 1) {
      const res = await client.put('/me/password', { currentPassword: 'wrong password', newPassword: PASSWORD });
      assert.equal(res.status, 403);
    }
    assert429(await client.put('/me/password', { currentPassword: 'wrong password', newPassword: PASSWORD }));
  });
});

describe('forum', () => {
  it('limits new topics per member', async () => {
    const client = await app.member();
    for (let i = 0; i < 10; i += 1) {
      assert.equal((await client.post('/forum/topics', { title: `Topic number ${i}`, body: 'x' })).status, 201);
    }
    assert429(await client.post('/forum/topics', { title: 'One topic too many', body: 'x' }));
  });
});
