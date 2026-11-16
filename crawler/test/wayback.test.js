import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cdxPrefix, cdxRows, refused, stubFetch } from './helpers.js';
import { ArchiveBusyError, IndexError, listCaptures, listCapturesSplit } from '../src/lib/wayback.js';

const PREFIX = 'hk.louisvuitton.com/eng-hk/products/';
const capture = (slug, ts = '20210301000000') => [ts, `https://${PREFIX}${slug}`];
const noop = async () => {};

test('a refused index request is sent again after onRefused, not restarted from the first page', async () => {
  const asked = stubFetch((href, n) => {
    if (n === 1) return cdxRows([capture('a-bag')], 'key1');
    if (n === 2 || n === 3) throw refused();
    return cdxRows([capture('b-bag')]);
  });
  const pages = [];
  let pauses = 0;
  await listCaptures(PREFIX, {
    onPage: async (c) => pages.push(c.map((x) => x.url)),
    onRefused: async () => (pauses += 1),
  });
  assert.equal(pauses, 2);
  assert.deepEqual(pages, [[`https://${PREFIX}a-bag`], [`https://${PREFIX}b-bag`]]);
  assert.equal(asked.length, 4);
  assert.ok(asked.slice(1).every((u) => new URL(u).searchParams.get('resumeKey') === 'key1'));
});

test('without onRefused a refused request fails as before', async () => {
  stubFetch(() => {
    throw refused();
  });
  await assert.rejects(listCaptures(PREFIX, { onPage: noop }), /fetch failed/);
});

test('onRefused can end the listing', async () => {
  stubFetch(() => {
    throw refused();
  });
  const stop = new Error('time is up');
  await assert.rejects(
    listCaptures(PREFIX, {
      onPage: noop,
      onRefused: async () => {
        throw stop;
      },
    }),
    (err) => err === stop,
  );
});

test('with retryBusy false a 503 fails at once, without the minute-long pause', async () => {
  const asked = stubFetch(() => new Response('', { status: 503 }));
  const t = Date.now();
  await assert.rejects(listCaptures(PREFIX, { onPage: noop, retryBusy: false }), ArchiveBusyError);
  assert.equal(asked.length, 1);
  assert.ok(Date.now() - t < 5000);
});

test('other index answers are IndexError with their status', async () => {
  stubFetch(() => new Response('', { status: 504 }));
  await assert.rejects(listCaptures(PREFIX, { onPage: noop }), (err) => err instanceof IndexError && err.status === 504);
});

test('a prefix too large for one query is asked again by first character', async () => {
  const asked = stubFetch((href) => {
    const p = cdxPrefix(href);
    if (p === PREFIX) return new Response('', { status: 503 });
    if (p === `${PREFIX}a`) return cdxRows([capture('a-bag')]);
    if (p === `${PREFIX}b`) return cdxRows([capture('b-bag')]);
    throw new Error(`unexpected ${p}`);
  });
  const urls = [];
  const splits = [];
  const complete = await listCapturesSplit(PREFIX, {
    from: '2021',
    to: '2021',
    chars: ['a', 'b'],
    onPage: async (c) => urls.push(...c.map((x) => x.url)),
    onSplit: (err, part) => splits.push(part),
  });
  assert.equal(complete, true);
  assert.deepEqual(urls, [`https://${PREFIX}a-bag`, `https://${PREFIX}b-bag`]);
  assert.deepEqual(splits, [PREFIX]);
  // Same years for every part, smaller pages for the parts.
  for (const u of asked) assert.equal(new URL(u).searchParams.get('from'), '2021');
  assert.equal(new URL(asked[1]).searchParams.get('limit'), '1000');
});

test('a part still too large (503 or 504) is split once more', async () => {
  const asked = stubFetch((href) => {
    const p = cdxPrefix(href).slice(PREFIX.length);
    if (p === '' || p === 'a') return new Response('', { status: 503 });
    if (p === 'b') return new Response('', { status: 504 });
    return cdxRows([capture(`${p}-bag`)]);
  });
  const urls = [];
  const failed = [];
  const complete = await listCapturesSplit(PREFIX, {
    chars: ['a', 'b'],
    onPage: async (c) => urls.push(...c.map((x) => x.url.slice(`https://${PREFIX}`.length))),
    onError: (err, part) => failed.push(`${part.slice(PREFIX.length)} ${err.status}`),
  });
  assert.equal(complete, true);
  assert.deepEqual(asked.map((u) => cdxPrefix(u).slice(PREFIX.length)), ['', 'a', 'aa', 'ab', 'b', 'ba', 'bb']);
  assert.deepEqual(urls, ['aa-bag', 'ab-bag', 'ba-bag', 'bb-bag']);
  assert.deepEqual(failed, []);
});

test('a 504 at the last depth is reported and the other parts carry on', async () => {
  stubFetch((href) => {
    const p = cdxPrefix(href).slice(PREFIX.length);
    if (p.length < 2) return new Response('', { status: 503 });
    if (p === 'ab') return new Response('', { status: 504 });
    return cdxRows([capture(`${p}-bag`)]);
  });
  const failed = [];
  const urls = [];
  const complete = await listCapturesSplit(PREFIX, {
    chars: ['a', 'b'],
    onPage: async (c) => urls.push(...c.map((x) => x.url.slice(`https://${PREFIX}`.length))),
    onError: (err, part) => failed.push(part.slice(PREFIX.length)),
  });
  assert.equal(complete, false);
  assert.deepEqual(failed, ['ab']);
  assert.deepEqual(urls, ['aa-bag', 'ba-bag', 'bb-bag']);
});

test('an error that says nothing about size is not split', async () => {
  const asked = stubFetch(() => new Response('', { status: 500 }));
  await assert.rejects(listCapturesSplit(PREFIX, { onPage: noop, chars: ['a'] }), (err) => err instanceof IndexError && err.status === 500);
  assert.equal(asked.length, 1);
});

test('errors from onPage end the split listing', async () => {
  stubFetch((href) => (cdxPrefix(href) === PREFIX ? new Response('', { status: 503 }) : cdxRows([capture('a-bag')])));
  await assert.rejects(
    listCapturesSplit(PREFIX, {
      chars: ['a', 'b'],
      onPage: async () => {
        throw new Error('database down');
      },
    }),
    /database down/,
  );
});
