import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import process from 'node:process'
import { defineConfig } from 'vite'

// The site's public address, for the two places that need a full URL: the
// share image in index.html and the sitemap line in robots.txt. Vercel sets
// VERCEL_PROJECT_PRODUCTION_URL to the production domain (a custom domain once
// one is added), so neither needs editing when the domain changes. SITE_URL
// overrides it on another host.
const siteUrl = (
  process.env.SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
  'https://maison-prix.vercel.app'
).replace(/\/+$/, '')

const ROBOTS = `# Accounts and the members-only forum have nothing to index.
User-agent: *
Disallow: /account
Disallow: /community

Sitemap: ${siteUrl}/sitemap.xml
`

const siteAddress = () => ({
  name: 'site-address',
  transformIndexHtml: (html) => html.replaceAll('%SITE_URL%', siteUrl),
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'robots.txt', source: ROBOTS })
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), siteAddress()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
