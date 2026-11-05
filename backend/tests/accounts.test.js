import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { PASSWORD, startApp } from './helpers.js';

const app = await startApp();
after(() => app.stop());

const newAccount = (() => {
  let count = 0;
  return (overrides = {}) => {
    count += 1;
    return { email: `account${count}@example.com`, password: PASSWORD, displayName: `Account ${count}`, ...overrides };
  };
})();

describe('register', () => {
  it('creates a logged-in member, with a safe session cookie', async () => {
    const client = app.client();
    const res = await client.post('/auth/register', newAccount());
    assert.equal(res.status, 201);
    assert.equal(res.body.user.role, 'member');
    assert.equal(res.body.user.banned, false);

    const cookie = res.headers.getSetCookie().find((line) => line.startsWith('sid='));
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /Secure/i);
    assert.match(cookie, /SameSite=Lax/i);
    assert.match(cookie, /Path=\/api/i);

    const me = await client.get('/me');
    assert.equal(me.body.user.id, res.body.user.id);
  });

  it('never returns or stores the password, and stores only a hash of the session token', async () => {
    const client = app.client();
    const account = newAccount();
    const res = await client.post('/auth/register', account);
    assert.ok(!res.text.includes(account.password));
    assert.ok(!res.text.toLowerCase().includes('passwordhash'));
    assert.ok(!(await client.get('/me')).text.toLowerCase().includes('passwordhash'));

    const stored = await app.db.collection('users').findOne({ email: account.email });
    assert.match(stored.passwordHash, /^scrypt\$/);
    assert.ok(!stored.passwordHash.includes(account.password));

    const sessions = await app.db.collection('sessions').find({ userId: stored._id }).toArray();
    assert.equal(sessions.length, 1);
    assert.notEqual(sessions[0].tokenHash, client.cookie);
    assert.ok(!JSON.stringify(sessions[0]).includes(client.cookie));
  });

  it('ignores a role or ban sent by the client', async () => {
    const account = newAccount({ role: 'admin', bannedAt: null, _id: 'x' });
    const res = await app.client().post('/auth/register', account);
    assert.equal(res.status, 201);
    assert.equal(res.body.user.role, 'member');
    const stored = await app.db.collection('users').findOne({ email: account.email });
    assert.equal(stored.role, 'member');
  });

  it('refuses a taken email or display name, ignoring case', async () => {
    const account = newAccount();
    assert.equal((await app.client().post('/auth/register', account)).status, 201);

    const sameEmail = await app.client().post('/auth/register', newAccount({ email: account.email.toUpperCase() }));
    assert.equal(sameEmail.status, 409);
    assert.match(sameEmail.body.error.message, /email/);

    const sameName = await app.client().post('/auth/register', newAccount({ displayName: account.displayName.toUpperCase() }));
    assert.equal(sameName.status, 409);
    assert.match(sameName.body.error.message, /display name/);
  });

  for (const [name, change] of [
    ['a bad email', { email: 'not-an-email' }],
    ['an email as an object', { email: { $ne: null } }],
    ['a short password', { password: 'short' }],
    ['a long password', { password: 'x'.repeat(129) }],
    ['a password as an object', { password: { $ne: null } }],
    ['HTML in the display name', { displayName: '<b>Bold</b>' }],
    ['a one-letter display name', { displayName: 'A' }],
  ]) {
    it(`refuses ${name}`, async () => {
      assert.equal((await app.client().post('/auth/register', newAccount(change))).status, 400);
    });
  }
});

describe('login', () => {
  let account;
  before(async () => {
    account = newAccount();
    await app.client().post('/auth/register', account);
  });

  it('logs in with the right password, ignoring email case', async () => {
    const client = app.client();
    const res = await client.post('/auth/login', { email: account.email.toUpperCase(), password: account.password });
    assert.equal(res.status, 200);
    assert.equal(res.body.user.email, account.email);
    assert.ok(client.cookie);
  });

  it('gives the same answer for a wrong password and an unknown email', async () => {
    const wrong = await app.client().post('/auth/login', { email: account.email, password: 'wrong password' });
    const unknown = await app.client().post('/auth/login', { email: 'nobody@example.com', password: 'wrong password' });
    assert.equal(wrong.status, 401);
    assert.equal(unknown.status, 401);
    assert.deepEqual(wrong.body, unknown.body);
  });

  it('refuses query operators instead of matching any account', async () => {
    const res = await app.client().post('/auth/login', { email: { $ne: null }, password: { $ne: null } });
    assert.equal(res.status, 400);
    const partly = await app.client().post('/auth/login', { email: account.email, password: { $ne: null } });
    assert.equal(partly.status, 400);
  });

  it('accepts the same password typed as composed or decomposed Unicode', async () => {
    const vietnamese = newAccount({ password: 'mật khẩu của tôi'.normalize('NFC') });
    await app.client().post('/auth/register', vietnamese);
    const res = await app.client().post('/auth/login', { email: vietnamese.email, password: vietnamese.password.normalize('NFD') });
    assert.equal(res.status, 200);
  });

  it('gives a new token on every login and ends the previous one in this browser', async () => {
    const client = app.client();
    await client.post('/auth/login', { email: account.email, password: account.password });
    const first = client.cookie;
    await client.post('/auth/login', { email: account.email, password: account.password });
    assert.notEqual(client.cookie, first);

    const old = app.client();
    old.cookie = first;
    assert.equal((await old.get('/me')).body.user, null);
  });
});

describe('sessions', () => {
  it('logs out: the token stops working and the cookie is cleared', async () => {
    const client = await app.member();
    const token = client.cookie;
    const res = await client.post('/auth/logout');
    assert.equal(res.status, 204);
    assert.equal(client.cookie, null);

    const old = app.client();
    old.cookie = token;
    const me = await old.get('/me');
    assert.equal(me.body.user, null);
    assert.equal(old.cookie, null, 'the dead cookie is cleared');
  });

  it('allows logging out when not logged in', async () => {
    assert.equal((await app.client().post('/auth/logout')).status, 204);
  });

  it('does not accept an expired session, even before MongoDB removes it', async () => {
    const client = await app.member();
    const stored = await app.db.collection('users').findOne({ email: client.email });
    await app.db.collection('sessions').updateMany({ userId: stored._id }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    assert.equal((await client.get('/me')).body.user, null);
  });

  for (const [name, value] of [
    ['a made-up token', 'made-up-token'],
    ['a query operator in a JSON cookie', 'j:{"$ne":null}'],
    ['a JSON cookie holding an array', 'j:["a"]'],
  ]) {
    it(`treats ${name} as logged out`, async () => {
      await app.member();
      const client = app.client();
      client.cookie = encodeURIComponent(value);
      const res = await client.get('/me');
      assert.equal(res.status, 200);
      assert.equal(res.body.user, null);
      assert.equal((await client.get('/forum/topics')).status, 401);
    });
  }
});

describe('profile', () => {
  it('needs a login', async () => {
    const client = app.client();
    assert.deepEqual((await client.get('/me')).body, { user: null });
    assert.equal((await client.patch('/me', { displayName: 'Someone' })).status, 401);
    assert.equal((await client.put('/me/password', { currentPassword: 'x', newPassword: 'y'.repeat(8) })).status, 401);
  });

  it('changes the display name but not the role', async () => {
    const client = await app.member();
    const res = await client.patch('/me', { displayName: 'Trần Thị Bình', role: 'admin', email: 'evil@example.com' });
    assert.equal(res.status, 200);
    assert.equal(res.body.user.displayName, 'Trần Thị Bình');
    assert.equal(res.body.user.role, 'member');
    assert.equal(res.body.user.email, client.email);
  });

  it('refuses a display name someone else has', async () => {
    const [one, two] = [await app.member(), await app.member()];
    const res = await two.patch('/me', { displayName: one.user.displayName.toLowerCase() });
    assert.equal(res.status, 409);
  });
});

describe('changing the password', () => {
  it('needs the current password', async () => {
    const client = await app.member();
    const res = await client.put('/me/password', { currentPassword: 'wrong password', newPassword: 'a new password' });
    assert.equal(res.status, 403);
    assert.ok((await client.get('/me')).body.user, 'still logged in');
    const login = await app.client().post('/auth/login', { email: client.email, password: PASSWORD });
    assert.equal(login.status, 200, 'the old password still works');
  });

  it('replaces the password and logs out every other session', async () => {
    const client = await app.member();
    const otherDevice = app.client();
    await otherDevice.post('/auth/login', { email: client.email, password: PASSWORD });
    assert.ok((await otherDevice.get('/me')).body.user);

    const res = await client.put('/me/password', { currentPassword: PASSWORD, newPassword: 'a new password' });
    assert.equal(res.status, 204);

    assert.ok((await client.get('/me')).body.user, 'this session stays');
    assert.equal((await otherDevice.get('/me')).body.user, null, 'the other session ended');
    assert.equal((await app.client().post('/auth/login', { email: client.email, password: PASSWORD })).status, 401);
    assert.equal((await app.client().post('/auth/login', { email: client.email, password: 'a new password' })).status, 200);
  });
});
