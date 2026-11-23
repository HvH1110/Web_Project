import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cdxRows, stubFetch } from './helpers.js';
import { isPlayer, ldImages } from '../src/archives/common.js';
import { imageCopyUrl, listCaptures } from '../src/lib/wayback.js';

test('video players listed among JSON-LD pictures are not pictures', () => {
  const lv = 'https://hk.louisvuitton.com/images/is/image/lv/1/PP_VP_L/louis-vuitton--M20252_PM2_Front view.jpg';
  const images = ldImages([lv, 'https://player.louisvuitton.com/embed/1483596', { url: 'https://player.freecaster.com/embed/a2279889' }]);
  assert.deepEqual(images, ['https://hk.louisvuitton.com/images/is/image/lv/1/PP_VP_L/louis-vuitton--M20252_PM2_Front%20view.jpg']);
  assert.ok(isPlayer('https://sg.louisvuitton.com/embed/1188961?impolicy=bgcolor'));
  assert.ok(!isPlayer(lv));
});

test('the index can be asked for pictures, and their copies link to the image itself', async () => {
  const asked = stubFetch(() => cdxRows([['20250101000000', 'https://www.iwc.com/content/dam/rcq/iwc/21/58/18/7/2158187.png']]));
  const found = [];
  await listCaptures('www.iwc.com/content/dam/rcq/iwc/21/58/', { mimetype: 'image/.*', onPage: async (c) => found.push(...c) });
  assert.deepEqual(new URL(asked[0]).searchParams.getAll('filter'), ['statuscode:200', 'mimetype:image/.*']);
  assert.equal(imageCopyUrl(found[0].timestamp, found[0].url), 'https://web.archive.org/web/20250101000000im_/https://www.iwc.com/content/dam/rcq/iwc/21/58/18/7/2158187.png');
});
