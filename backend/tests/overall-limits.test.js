// The limits that hold when IP addresses are faked. Each client here has its own
// IP. In their own file, because using them up affects everything after them.
import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { startApp } from './helpers.js';

const app = await startApp();
after(() => app.stop());

async function untilRefused(attempts, request) {
  for (let i = 0; i < attempts; i += 1) {
    const res = await request(i);
    if (res.status === 429) {
      return res;
    }
  }
  return null;
}

describe('with a new IP address on every request', () => {
  it('limits registrations overall', async () => {
    const refused = await untilRefused(101, () => app.client().post('/auth/register', {}));
    assert.ok(refused, 'no overall limit within 101 attempts');
    assert.ok(Number(refused.headers.get('retry-after')) > 0);
  });

  it('limits logins overall', async () => {
    // Not a string, so these end before the password check and the per-email limit.
    const refused = await untilRefused(301, () => app.client().post('/auth/login', { email: 1, password: 'x' }));
    assert.ok(refused, 'no overall limit within 301 attempts');
  });

  it('limits all requests overall, except the health check', async () => {
    const refused = await untilRefused(1201, () => app.client().get('/nope'));
    assert.ok(refused, 'no overall limit within 1201 requests');
    assert.equal((await app.client().get('/brands')).status, 429);
    assert.equal((await app.client().get('/health')).status, 200);
  });
});
