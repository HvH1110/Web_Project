import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import { startApp } from './helpers.js';

const app = await startApp();
after(() => app.stop());

let author;
let other;
let moderator;
let admin;

before(async () => {
  [author, other, moderator, admin] = [await app.member(), await app.member(), await app.member('moderator'), await app.member('admin')];
  await app.db.collection('brands').insertOne({ slug: 'rolex', name: 'Rolex', category: 'watches', order: 1 });
});

// A new author per test: one member may only start 10 topics an hour.
beforeEach(async () => {
  author = await app.member();
});

let titles = 0;
async function newTopic(client = author, fields = {}) {
  titles += 1;
  const res = await client.post('/forum/topics', { title: `Topic number ${titles}`, body: 'Some text', ...fields });
  assert.equal(res.status, 201, res.text);
  return res.body.topic;
}
async function newReply(topicId, client = other, body = 'A reply') {
  const res = await client.post(`/forum/topics/${topicId}/replies`, { body });
  assert.equal(res.status, 201, res.text);
  return res.body.reply;
}
const hideTopic = (id, hidden = true, reason = 'Off-topic') => moderator.patch(`/forum/topics/${id}/moderation`, { hidden, reason });
const hideReply = (id, hidden = true) => moderator.patch(`/forum/replies/${id}/moderation`, { hidden });
const replyCount = async (id) => (await moderator.get(`/forum/topics/${id}`)).body.topic.replyCount;

describe('login is required for everything', () => {
  for (const [method, url] of [
    ['get', '/forum/topics'],
    ['get', '/forum/topics/6720f3b10c1d2e3f40516273'],
    ['get', '/forum/topics/6720f3b10c1d2e3f40516273/replies'],
    ['post', '/forum/topics'],
    ['post', '/forum/uploads'],
    ['patch', '/forum/members/6720f3b10c1d2e3f40516273/moderation'],
  ]) {
    it(`${method.toUpperCase()} ${url}`, async () => {
      assert.equal((await app.client()[method](url)).status, 401);
    });
  }
});

describe('topics', () => {
  it('creates a topic with the right permissions for each viewer', async () => {
    const topic = await newTopic(author, { brand: 'rolex' });
    assert.deepEqual(topic.permissions, { edit: true, delete: true, reply: true, moderate: false });
    assert.equal(topic.brand.name, 'Rolex');

    const seen = (await other.get(`/forum/topics/${topic.id}`)).body.topic;
    assert.deepEqual(seen.permissions, { edit: false, delete: false, reply: true, moderate: false });
    const seenByMod = (await moderator.get(`/forum/topics/${topic.id}`)).body.topic;
    assert.deepEqual(seenByMod.permissions, { edit: false, delete: true, reply: true, moderate: true });
  });

  it('shows no email or password of the author', async () => {
    const topic = await newTopic();
    const { text } = await other.get(`/forum/topics/${topic.id}`);
    assert.deepEqual(Object.keys(topic.author).sort(), ['displayName', 'id', 'role']);
    assert.ok(!text.includes(author.email));
    assert.ok(!text.toLowerCase().includes('passwordhash'));
  });

  it('keeps text as plain text and removes control characters', async () => {
    const script = '<script>alert(1)</script>';
    const topic = await newTopic(author, { body: `${script}\r\nline\u0000 two ‮flipped` });
    assert.equal(topic.body, `${script}\nline two flipped`);
  });

  for (const [name, fields] of [
    ['a short title', { title: 'Hi' }],
    ['an empty body', { body: '   ' }],
    ['a body as an object', { body: { $gt: '' } }],
    ['a body over the limit', { body: 'x'.repeat(10_001) }],
    ['an unknown brand', { brand: 'nobody' }],
    ['a brand as an object', { brand: { $ne: null } }],
    ['too many images', { images: Array(5).fill('6720f3b10c1d2e3f40516273') }],
    ['an image that is not an id', { images: ['../../secret'] }],
  ]) {
    it(`refuses ${name}`, async () => {
      const res = await author.post('/forum/topics', { title: 'A fine title', body: 'Text', ...fields });
      assert.equal(res.status, 400);
    });
  }

  it('answers 404 for a malformed or unknown id', async () => {
    assert.equal((await author.get('/forum/topics/not-an-id')).status, 404);
    assert.equal((await author.get('/forum/topics/6720f3b10c1d2e3f40516273')).status, 404);
  });

  it('lets only the author edit, not other members or moderators', async () => {
    const topic = await newTopic();
    assert.equal((await other.patch(`/forum/topics/${topic.id}`, { body: 'Hacked' })).status, 403);
    assert.equal((await moderator.patch(`/forum/topics/${topic.id}`, { body: 'Hacked' })).status, 403);
    const res = await author.patch(`/forum/topics/${topic.id}`, { body: 'Edited' });
    assert.equal(res.status, 200);
    assert.equal(res.body.topic.body, 'Edited');
    assert.ok(res.body.topic.editedAt);
  });

  it('ignores moderation fields sent to the normal edit route', async () => {
    const topic = await newTopic();
    const res = await author.patch(`/forum/topics/${topic.id}`, { body: 'Edited', pinned: true, locked: true, replyCount: 99, authorId: other.user.id });
    assert.equal(res.status, 200);
    assert.equal(res.body.topic.pinned, false);
    assert.equal(res.body.topic.locked, false);
    assert.equal(res.body.topic.replyCount, 0);
    assert.equal(res.body.topic.author.id, author.user.id);
  });

  it('lets the author or a moderator delete, with the replies, but nobody else', async () => {
    const topic = await newTopic();
    const reply = await newReply(topic.id);
    assert.equal((await other.delete(`/forum/topics/${topic.id}`)).status, 403);
    assert.equal((await author.delete(`/forum/topics/${topic.id}`)).status, 204);
    assert.equal((await author.get(`/forum/topics/${topic.id}`)).status, 404);
    assert.equal((await author.get(`/forum/topics/${topic.id}/replies`)).status, 404);
    assert.equal((await other.patch(`/forum/replies/${reply.id}`, { body: 'x' })).status, 404);

    const second = await newTopic();
    assert.equal((await moderator.delete(`/forum/topics/${second.id}`)).status, 204);
  });
});

describe('topic list and search', () => {
  it('finds words ignoring case and accents, and takes regex characters literally', async () => {
    const topic = await newTopic(author, { title: 'Đồng hồ Panthère giá tốt', body: 'Unique search word zyxwv' });
    const ids = async (q) => (await other.get(`/forum/topics?q=${encodeURIComponent(q)}&limit=50`)).body.items.map((t) => t.id);
    assert.ok((await ids('dong ho panthere')).includes(topic.id));
    assert.ok((await ids('ZYXWV')).includes(topic.id));
    assert.deepEqual(await ids('zyx.*'), []);
    assert.deepEqual(await ids('panthere nothingelse'), []);
  });

  it('never finds a hidden topic for other members', async () => {
    const topic = await newTopic(author, { body: 'Hiddenword qwertz' });
    await hideTopic(topic.id);
    assert.equal((await other.get('/forum/topics?q=qwertz')).body.total, 0);
    assert.equal((await author.get('/forum/topics?q=qwertz')).body.total, 1);
    assert.equal((await moderator.get('/forum/topics?q=qwertz')).body.total, 1);
    assert.equal((await other.get(`/forum/topics?author=${author.user.id}&limit=50`)).body.items.some((t) => t.id === topic.id), false);
  });

  it('lifts pinned topics in the default order only', async () => {
    const pinned = await newTopic();
    await moderator.patch(`/forum/topics/${pinned.id}/moderation`, { pinned: true });
    const newest = await newTopic();
    assert.equal((await other.get('/forum/topics?limit=1')).body.items[0].id, pinned.id);
    assert.equal((await other.get('/forum/topics?sort=newest&limit=1')).body.items[0].id, newest.id);
    await moderator.patch(`/forum/topics/${pinned.id}/moderation`, { pinned: false });
  });

  for (const query of ['sort=evil', 'author=not-an-id', 'page=0', 'limit=51', 'limit=abc']) {
    it(`answers 400 for ?${query}`, async () => {
      assert.equal((await other.get(`/forum/topics?${query}`)).status, 400);
    });
  }
});

describe('replies', () => {
  it('needs text or an image', async () => {
    const topic = await newTopic();
    assert.equal((await other.post(`/forum/topics/${topic.id}/replies`, { body: '  ' })).status, 400);
    const reply = await newReply(topic.id);
    assert.equal((await other.patch(`/forum/replies/${reply.id}`, { body: '' })).status, 400);
  });

  it('lets only the author edit; the author or a moderator delete', async () => {
    const topic = await newTopic();
    const reply = await newReply(topic.id);
    assert.deepEqual(reply.permissions, { edit: true, delete: true, moderate: false });
    assert.equal((await author.patch(`/forum/replies/${reply.id}`, { body: 'Hacked' })).status, 403);
    assert.equal((await moderator.patch(`/forum/replies/${reply.id}`, { body: 'Hacked' })).status, 403);
    assert.equal((await other.patch(`/forum/replies/${reply.id}`, { body: 'Edited' })).body.reply.body, 'Edited');
    assert.equal((await author.delete(`/forum/replies/${reply.id}`)).status, 403);
    assert.equal((await moderator.delete(`/forum/replies/${reply.id}`)).status, 204);
  });

  it('keeps replyCount equal to the visible replies', async () => {
    const topic = await newTopic();
    const [one, two] = [await newReply(topic.id), await newReply(topic.id)];
    assert.equal(await replyCount(topic.id), 2);

    await hideReply(one.id);
    await hideReply(one.id); // Hiding twice counts once.
    assert.equal(await replyCount(topic.id), 1);
    await hideReply(one.id, false);
    assert.equal(await replyCount(topic.id), 2);

    await hideReply(two.id);
    assert.equal((await moderator.delete(`/forum/replies/${two.id}`)).status, 204);
    assert.equal(await replyCount(topic.id), 2 - 1, 'deleting a hidden reply changes nothing');

    assert.equal((await other.delete(`/forum/replies/${one.id}`)).status, 204);
    assert.equal(await replyCount(topic.id), 0);
  });

  it('moves lastActivityAt when replying, and not when editing', async () => {
    const topic = await newTopic();
    const reply = await newReply(topic.id);
    const after = (await other.get(`/forum/topics/${topic.id}`)).body.topic.lastActivityAt;
    assert.ok(after >= topic.lastActivityAt);
    await other.patch(`/forum/replies/${reply.id}`, { body: 'Edited' });
    assert.equal((await other.get(`/forum/topics/${topic.id}`)).body.topic.lastActivityAt, after);
  });
});

describe('moderation', () => {
  it('is refused for members', async () => {
    const topic = await newTopic();
    const reply = await newReply(topic.id);
    assert.equal((await author.patch(`/forum/topics/${topic.id}/moderation`, { pinned: true })).status, 403);
    assert.equal((await author.patch(`/forum/replies/${reply.id}/moderation`, { hidden: true })).status, 403);
    assert.equal((await author.patch(`/forum/members/${other.user.id}/moderation`, { banned: true })).status, 403);
  });

  it('validates the fields', async () => {
    const topic = await newTopic();
    assert.equal((await moderator.patch(`/forum/topics/${topic.id}/moderation`, {})).status, 400);
    assert.equal((await moderator.patch(`/forum/topics/${topic.id}/moderation`, { hidden: 'yes' })).status, 400);
    assert.equal((await moderator.patch(`/forum/topics/${topic.id}/moderation`, { hidden: true, reason: 'x'.repeat(201) })).status, 400);
  });

  it('hides a topic from everyone but its author and moderators', async () => {
    const topic = await newTopic();
    const reply = await newReply(topic.id);
    const res = await hideTopic(topic.id);
    assert.equal(res.status, 200);
    assert.equal(res.body.topic.hidden.reason, 'Off-topic');

    assert.equal((await other.get(`/forum/topics/${topic.id}`)).status, 404);
    assert.equal((await admin.get(`/forum/topics/${topic.id}`)).status, 200);
    const seenByAuthor = (await author.get(`/forum/topics/${topic.id}`)).body.topic;
    assert.equal(seenByAuthor.hidden.reason, 'Off-topic');
    assert.equal(seenByAuthor.permissions.edit, false);

    assert.equal((await author.patch(`/forum/topics/${topic.id}`, { body: 'x' })).status, 403);
    assert.equal((await author.post(`/forum/topics/${topic.id}/replies`, { body: 'x' })).status, 403);
    assert.equal((await other.post(`/forum/topics/${topic.id}/replies`, { body: 'x' })).status, 404);
    assert.equal((await other.get(`/forum/topics/${topic.id}/replies`)).status, 404);
    assert.equal((await other.patch(`/forum/replies/${reply.id}`, { body: 'x' })).status, 404);

    await hideTopic(topic.id, false);
    assert.equal((await other.get(`/forum/topics/${topic.id}`)).status, 200);
  });

  it('hides a reply from everyone but its author and moderators', async () => {
    const topic = await newTopic();
    const reply = await newReply(topic.id);
    await hideReply(reply.id);
    const list = async (client) => (await client.get(`/forum/topics/${topic.id}/replies`)).body;
    assert.equal((await list(author)).total, 0);
    assert.equal((await list(other)).total, 1, 'its author still sees it');
    assert.equal((await list(moderator)).total, 1);
    assert.equal((await author.patch(`/forum/replies/${reply.id}`, { body: 'x' })).status, 404);
    assert.equal((await other.patch(`/forum/replies/${reply.id}`, { body: 'x' })).status, 403);
  });

  it('locks a topic for members but not for moderators', async () => {
    const topic = await newTopic();
    const reply = await newReply(topic.id);
    await moderator.patch(`/forum/topics/${topic.id}/moderation`, { locked: true });

    assert.equal((await other.post(`/forum/topics/${topic.id}/replies`, { body: 'x' })).status, 403);
    assert.equal((await author.patch(`/forum/topics/${topic.id}`, { body: 'x' })).status, 403);
    assert.equal((await other.patch(`/forum/replies/${reply.id}`, { body: 'x' })).status, 403);
    assert.equal((await other.get(`/forum/topics/${topic.id}`)).body.topic.permissions.reply, false);
    assert.equal((await moderator.post(`/forum/topics/${topic.id}/replies`, { body: 'x' })).status, 201);
  });
});

describe('bans', () => {
  it('stops a member posting, but not reading or deleting their own posts', async () => {
    const member = await app.member();
    const topic = await newTopic(member);
    const reply = await newReply(topic.id, member);

    const res = await moderator.patch(`/forum/members/${member.user.id}/moderation`, { banned: true, reason: 'Spam' });
    assert.equal(res.status, 200);
    assert.equal(res.body.member.banned, true);
    assert.ok(!res.text.includes(member.email));

    assert.equal((await member.post('/forum/topics', { title: 'Banned title', body: 'x' })).status, 403);
    assert.equal((await member.post(`/forum/topics/${topic.id}/replies`, { body: 'x' })).status, 403);
    assert.equal((await member.patch(`/forum/topics/${topic.id}`, { body: 'x' })).status, 403);
    assert.equal((await member.patch(`/forum/replies/${reply.id}`, { body: 'x' })).status, 403);
    assert.equal((await member.post('/forum/uploads')).status, 403);
    assert.equal((await member.get(`/forum/topics/${topic.id}`)).status, 200);
    assert.equal((await member.get('/me')).body.user.banned, true);
    assert.equal((await member.delete(`/forum/replies/${reply.id}`)).status, 204);

    await moderator.patch(`/forum/members/${member.user.id}/moderation`, { banned: false });
    assert.equal((await member.post(`/forum/topics/${topic.id}/replies`, { body: 'Back' })).status, 201);
  });

  it('follows who may ban whom', async () => {
    const [mod2, mod3] = [await app.member('moderator'), await app.member('moderator')];
    const ban = (client, target, banned = true) => client.patch(`/forum/members/${target.user.id}/moderation`, { banned });
    assert.equal((await ban(moderator, mod2)).status, 403, 'a moderator cannot ban a moderator');
    assert.equal((await ban(moderator, admin)).status, 403, 'nobody can ban an admin');
    assert.equal((await ban(admin, moderator === admin ? mod2 : admin)).status, 403, 'an admin cannot ban themself');
    assert.equal((await ban(moderator, moderator)).status, 403, 'a moderator cannot ban themself');
    assert.equal((await ban(admin, mod3)).status, 200, 'an admin can ban a moderator');
    assert.equal((await moderator.patch('/forum/members/not-an-id/moderation', { banned: true })).status, 404);
    assert.equal((await moderator.patch(`/forum/members/${mod2.user.id}/moderation`, {})).status, 400);
  });

  it('takes away moderator powers from a banned moderator', async () => {
    const badMod = await app.member('moderator');
    const member = await app.member();
    const topic = await newTopic(member);
    const hiddenTopic = await newTopic(member);
    await hideTopic(hiddenTopic.id);
    assert.equal((await admin.patch(`/forum/members/${badMod.user.id}/moderation`, { banned: true })).status, 200);

    assert.equal((await badMod.patch(`/forum/topics/${topic.id}/moderation`, { locked: true })).status, 403);
    assert.equal((await badMod.patch(`/forum/members/${member.user.id}/moderation`, { banned: true })).status, 403);
    assert.equal((await badMod.delete(`/forum/topics/${topic.id}`)).status, 403);
    assert.equal((await badMod.get(`/forum/topics/${hiddenTopic.id}`)).status, 404);
    const seen = (await badMod.get(`/forum/topics/${topic.id}`)).body.topic;
    assert.equal(seen.permissions.moderate, false);
    assert.equal(seen.permissions.delete, false);
  });
});
