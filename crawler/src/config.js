import dotenv from 'dotenv';

// Load crawler/.env (if present) before anything reads process.env.
dotenv.config({ quiet: true });

const contact = process.env.CRAWL_CONTACT?.trim();

export const config = {
  mongodbUri: process.env.MONGODB_URI || '',
  // Never below 3 s: at most one request every few seconds per site.
  crawlDelayMs: Math.max(Number(process.env.CRAWL_DELAY_MS) || 5000, 3000),
  // Honest User-Agent: says who we are, never pretends to be a browser.
  userAgent: `MaisonPrixBot/0.1 (non-commercial university project${contact ? `; +${contact}` : ''})`,
  // Token matched against robots.txt `User-agent:` groups.
  robotsAgent: 'MaisonPrixBot',
};
