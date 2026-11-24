// The API reference (apiDoc): every route has a doc block, and the built page is served.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { after, describe, it } from 'node:test';
import { startApp } from './helpers.js';

const app = await startApp();
after(() => app.stop());

const ROUTES_DIR = new URL('../src/routes/', import.meta.url);
const PREFIXES = {
  'health.routes.js': '/api/health',
  'brands.routes.js': '/api/brands',
  'products.routes.js': '/api/products',
  'deals.routes.js': '/api/deals',
  'auth.routes.js': '/api/auth',
  'me.routes.js': '/api/me',
  'forum.routes.js': '/api/forum',
  'index.js': '/api',
};

// "get /api/products/:brand/:ref" for each router.get(...) and each @api block.
function routesIn(file) {
  const source = fs.readFileSync(new URL(file, ROUTES_DIR), 'utf8');
  const routes = [...source.matchAll(/router\.(get|post|put|patch|delete)\(\s*'([^']+)'/g)].map(
    ([, method, path]) => `${method} ${`${PREFIXES[file]}${path}`.replace(/\/$/, '')}`,
  );
  const documented = [...source.matchAll(/@api \{(\w+)\} (\S+)/g)].map(([, method, path]) => `${method} ${path}`);
  return { routes, documented };
}

describe('API reference', () => {
  it('documents every route with an @api block', () => {
    for (const file of Object.keys(PREFIXES)) {
      const { routes, documented } = routesIn(file);
      assert.deepEqual(documented.sort(), routes.sort(), file);
    }
  });

  it('serves the built reference at /api/docs', async () => {
    for (const path of ['/docs', '/docs/']) {
      const res = await app.client().get(path);
      assert.equal(res.status, 200, path);
      assert.match(res.headers.get('content-type'), /^text\/html/);
      assert.match(res.text, /Maison Prix API/);
      assert.match(res.text, /ModerateMember/);
    }
  });
});
