import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { after, beforeEach, describe, it } from 'node:test';
import sharp from 'sharp';
import { ORIGIN, startApp } from './helpers.js';

const app = await startApp();
after(() => app.stop());

let member;
let other;
// New members per test: one member may only upload 40 images an hour.
beforeEach(async () => {
  [member, other] = [await app.member(), await app.member()];
});

const blank = (width = 100, height = 80) => sharp({ create: { width, height, channels: 3, background: '#336699' } });
const png = (width, height) => blank(width, height).png().toBuffer();

function formWith(buffer, { field = 'image', filename = 'a.png', type = 'image/png' } = {}) {
  const form = new FormData();
  form.append(field, new Blob([buffer], { type }), filename);
  return form;
}
const upload = (client, buffer, options) => client.request('POST', '/forum/uploads', { form: formWith(buffer, options) });
const fileOf = (image) => path.join(app.uploadsDir, ...new URL(image.url).pathname.replace('/api/uploads/', '').split('/'));

// What each client has uploaded counts towards a limit, so each case can use a new member.
async function uploadOk(client, buffer, options) {
  const res = await upload(client, buffer, options);
  assert.equal(res.status, 201, res.text);
  return res.body.upload;
}

describe('accepted images', () => {
  for (const format of ['jpeg', 'png', 'webp', 'gif', 'avif']) {
    it(`re-encodes ${format} as WebP`, async () => {
      const image = await uploadOk(member, await blank()[format]().toBuffer());
      assert.match(image.url, /\/forum\/[0-9a-f]{32}\.webp$/);
      assert.equal((await sharp(fs.readFileSync(fileOf(image))).metadata()).format, 'webp');
      assert.deepEqual([image.width, image.height], [100, 80]);
    });
  }

  it('removes photo metadata such as GPS', async () => {
    const withExif = await blank()
      .withExif({ IFD0: { Copyright: 'SECRET-OWNER' }, IFD3: { GPSLatitude: '10/1 45/1 0/1' } })
      .jpeg()
      .toBuffer();
    assert.ok(withExif.includes('SECRET-OWNER'), 'the test image has metadata');
    const image = await uploadOk(member, withExif);
    const stored = fs.readFileSync(fileOf(image));
    assert.ok(!stored.includes('SECRET-OWNER'));
    assert.equal((await sharp(stored).metadata()).exif, undefined);
  });

  it('shrinks large images and keeps their orientation', async () => {
    const large = await uploadOk(member, await png(3000, 1000));
    assert.deepEqual([large.width, large.height], [2048, 683]);
    const rotated = await uploadOk(member, await blank(100, 50).withMetadata({ orientation: 6 }).jpeg().toBuffer());
    assert.deepEqual([rotated.width, rotated.height], [50, 100]);
  });

  it('ignores the file name and type the client claims', async () => {
    const image = await uploadOk(member, await png(), { filename: '../../../evil.php', type: 'application/x-php' });
    assert.match(image.url, /\/forum\/[0-9a-f]{32}\.webp$/);
    assert.ok(!fs.existsSync(path.join(app.uploadsDir, '..', 'evil.php')));
  });

  it('serves files that browsers cannot sniff as something else', async () => {
    const image = await uploadOk(member, await png());
    const res = await fetch(`${app.base}/api/uploads${new URL(image.url).pathname.replace('/api/uploads', '')}`, {
      headers: { 'accept-encoding': 'gzip' },
    });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'image/webp');
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('content-encoding'), null);
  });

  it('does not serve anything outside the uploads folder', async () => {
    for (const url of ['/api/uploads/../../package.json', '/api/uploads/%2e%2e/%2e%2e/package.json', '/api/uploads/..%2f..%2fpackage.json']) {
      const res = await fetch(`${app.base}${url}`);
      assert.notEqual(res.status, 200, url);
    }
  });
});

describe('refused files', () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><script>alert(1)</script></svg>';
  for (const [name, buffer] of [
    ['an SVG, even one that claims to be a PNG', Buffer.from(svg)],
    ['HTML', Buffer.from('<!doctype html><script>alert(1)</script>')],
    ['a text file', Buffer.from('hello')],
    ['a PNG signature followed by junk', Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(200, 7)])],
    ['an empty file', Buffer.alloc(0)],
  ]) {
    it(`refuses ${name}`, async () => {
      const res = await upload(member, buffer);
      assert.equal(res.status, 400, res.text);
    });
  }

  it('refuses other image formats', async () => {
    assert.equal((await upload(member, await blank().tiff().toBuffer())).status, 400);
  });

  it('refuses images over 50 megapixels from their header, without decoding them', async () => {
    const res = await upload(member, await png(8000, 7000));
    assert.equal(res.status, 400);
    assert.match(res.body.error.message, /50 megapixels/);
  });

  it('refuses files over 10 MB', async () => {
    const res = await upload(member, Buffer.alloc(10 * 1024 * 1024 + 1, 1));
    assert.equal(res.status, 413);
  });

  it('refuses a wrong field, several files, or extra fields', async () => {
    const image = await png();
    assert.equal((await upload(member, image, { field: 'photo' })).status, 400);
    assert.equal((await member.request('POST', '/forum/uploads', { form: new FormData() })).status, 400);

    const two = formWith(image);
    two.append('image', new Blob([image], { type: 'image/png' }), 'b.png');
    assert.equal((await member.request('POST', '/forum/uploads', { form: two })).status, 400);

    const extra = formWith(image);
    extra.append('note', 'hello');
    assert.equal((await member.request('POST', '/forum/uploads', { form: extra })).status, 400);
    assert.equal((await member.post('/forum/uploads', { image: 'not multipart' })).status, 400);
  });

  it('refuses another origin', async () => {
    const res = await member.request('POST', '/forum/uploads', { form: formWith(await png()), origin: 'https://evil.example' });
    assert.equal(res.status, 403);
  });
});

describe('uploads at the same time', () => {
  // A request whose body never finishes, holding its place until destroyed.
  function stalledUpload(client) {
    return new Promise((resolve, reject) => {
      const { hostname, port } = new URL(app.base);
      const req = http.request({
        hostname,
        port,
        method: 'POST',
        path: '/api/forum/uploads',
        headers: {
          origin: ORIGIN,
          cookie: `sid=${client.cookie}`,
          'x-forwarded-for': client.ip,
          'content-type': 'multipart/form-data; boundary=x',
          'transfer-encoding': 'chunked',
        },
      });
      req.on('error', () => {});
      req.write('--x\r\nContent-Disposition: form-data; name="image"; filename="a.png"\r\nContent-Type: image/png\r\n\r\n', () => {
        // Give the server time to reach the upload middleware.
        setTimeout(() => resolve(req), 100);
      });
      req.once('response', () => reject(new Error('a stalled upload was answered')));
    });
  }

  it('turns away uploads beyond the limit, and recovers when they end', async () => {
    const stalled = [];
    for (let i = 0; i < 8; i += 1) {
      stalled.push(await stalledUpload(member));
    }
    const refused = await upload(other, await png());
    assert.equal(refused.status, 429, refused.text);
    assert.ok(refused.headers.get('retry-after'));

    for (const req of stalled) {
      req.destroy();
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
    assert.equal((await upload(other, await png())).status, 201);
  });

  it('copes with a burst of real uploads', async () => {
    const image = await png(1500, 1500);
    const burst = await Promise.all(Array.from({ length: 8 }, () => upload(member, image)));
    assert.deepEqual([...new Set(burst.map((res) => res.status))], [201]);
  });
});

describe('attaching uploads to posts', () => {
  const topicWith = (client, images) => client.post('/forum/topics', { title: 'Topic with images', body: 'x', images });

  it('attaches in order, and each upload to one post only', async () => {
    const [a, b] = [await uploadOk(member, await png()), await uploadOk(member, await png())];
    const res = await topicWith(member, [b.id, a.id]);
    assert.equal(res.status, 201);
    assert.deepEqual(res.body.topic.images.map((image) => image.id), [b.id, a.id]);
    assert.equal((await topicWith(member, [a.id])).status, 400);
  });

  it('refuses someone else’s upload, and a repeated one, attaching nothing', async () => {
    const mine = await uploadOk(member, await png());
    const theirs = await uploadOk(other, await png());
    assert.equal((await topicWith(member, [mine.id, theirs.id])).status, 400);
    assert.equal((await topicWith(member, [mine.id, mine.id])).status, 400);
    assert.equal((await topicWith(member, [mine.id])).status, 201, 'the refused attempts left it free');
  });

  it('deletes the file when an image is removed, or its post is deleted', async () => {
    const [a, b, c] = [await uploadOk(member, await png()), await uploadOk(member, await png()), await uploadOk(member, await png())];
    const { topic } = (await topicWith(member, [a.id, b.id])).body;

    const edited = await member.patch(`/forum/topics/${topic.id}`, { images: [b.id] });
    assert.deepEqual(edited.body.topic.images.map((image) => image.id), [b.id]);
    assert.ok(!fs.existsSync(fileOf(a)));
    assert.ok(fs.existsSync(fileOf(b)));

    const reply = (await member.post(`/forum/topics/${topic.id}/replies`, { images: [c.id] })).body.reply;
    assert.equal(reply.body, '');
    assert.equal((await member.delete(`/forum/topics/${topic.id}`)).status, 204);
    assert.ok(!fs.existsSync(fileOf(b)));
    assert.ok(!fs.existsSync(fileOf(c)));
  });
});

describe('purging unused uploads', () => {
  it('deletes only uploads unused for a day', async () => {
    const { purgeUnusedUploads } = await import('../src/services/uploads.service.js');
    const [old, fresh, used] = [await uploadOk(member, await png()), await uploadOk(member, await png()), await uploadOk(member, await png())];
    assert.equal((await member.post('/forum/topics', { title: 'Topic with images', body: 'x', images: [used.id] })).status, 201);

    const later = new Date(Date.now() + 25 * 60 * 60 * 1000);
    const { ObjectId } = (await import('mongoose')).default.mongo;
    await app.db.collection('uploads').updateOne({ _id: new ObjectId(fresh.id) }, { $set: { createdAt: new Date(later.getTime() - 60_000) } });

    assert.ok((await purgeUnusedUploads(later)) >= 1);
    assert.ok(!fs.existsSync(fileOf(old)));
    assert.ok(fs.existsSync(fileOf(fresh)));
    assert.ok(fs.existsSync(fileOf(used)));
  });
});
