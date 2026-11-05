import { loadSitemap } from '../services/sitemap.service.js';

export async function getSitemap(req, res) {
  const xml = await loadSitemap();
  res.set('Cache-Control', 'public, max-age=86400');
  res.type('application/xml').send(xml);
}
