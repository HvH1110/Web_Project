import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pickSnapshots } from '../src/lib/sample.js';

const row = (key, timestamp, status = 'pending') => ({ key, timestamp, status, _id: `${key}@${timestamp}` });
const ids = (rows) => rows.map((r) => r._id);

test('one capture per product per year, the earliest, plus the newest', () => {
  const rows = [row('p', '20210101'), row('p', '20210601'), row('p', '20211201'), row('p', '20220301'), row('p', '20220901')];
  assert.deepEqual(ids(pickSnapshots(rows)).sort(), ['p@20210101', 'p@20220301', 'p@20220901']);
});

test('a year already read is skipped; a year read without a price is not', () => {
  const rows = [
    row('p', '20200101', 'saved'),
    row('p', '20200601'),
    row('p', '20210101', 'no-price'),
    row('p', '20210601'),
    row('p', '20220101', 'no-data'),
    row('p', '20220601'),
    row('p', '20230101'),
  ];
  assert.deepEqual(ids(pickSnapshots(rows)).sort(), ['p@20210601', 'p@20230101']);
});

test('products captured in more years come first, newest first unless oldestFirst', () => {
  const rows = [row('one', '20240101'), row('three', '20200101'), row('three', '20210101'), row('three', '20220101'), row('two', '20190101'), row('two', '20250101')];
  assert.deepEqual(ids(pickSnapshots(rows)), ['three@20220101', 'three@20210101', 'three@20200101', 'two@20250101', 'two@20190101', 'one@20240101']);
  assert.deepEqual(ids(pickSnapshots(rows, { oldestFirst: true })).slice(0, 3), ['three@20200101', 'three@20210101', 'three@20220101']);
});
