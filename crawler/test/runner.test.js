import assert from 'node:assert/strict';
import { test } from 'node:test';
import { refused } from './helpers.js';
import { runSource } from '../src/lib/runner.js';

const timeout = () => Object.assign(new DOMException('The operation was aborted due to timeout', 'TimeoutError'));

// A source whose listing fails with the given errors, then lists nothing.
function source(...errors) {
  let calls = 0;
  return {
    id: 'test-src',
    get calls() {
      return calls;
    },
    async listUrls() {
      calls += 1;
      if (errors.length) throw errors.shift();
      return [];
    },
    parse: () => null,
  };
}

const run = (src) => {
  const lines = [];
  return runSource(src, { save: async () => {}, log: (l) => lines.push(l), listRetryPauseMs: 0 }).then(() => lines);
};

for (const [what, err] of [
  ['a timeout', timeout()],
  ['a refused connection', refused()],
  ['an error marked retryable', Object.assign(new Error('sitemap answered HTTP 502'), { retryable: true })],
]) {
  test(`a listing that fails with ${what} is asked once more`, async () => {
    const src = source(err);
    const lines = await run(src);
    assert.equal(src.calls, 2);
    assert.match(lines[0], /listing failed .* trying once more/);
  });
}

test('only once: a second failure fails the source', async () => {
  const src = source(timeout(), timeout());
  await assert.rejects(run(src), { name: 'TimeoutError' });
  assert.equal(src.calls, 2);
});

test('a listing blocked or refused by the site is not asked again', async () => {
  const src = source(Object.assign(new Error('sitemap answered HTTP 403'), { retryable: false }));
  await assert.rejects(run(src), /HTTP 403/);
  assert.equal(src.calls, 1);
});
