// Registry of source adapters, in crawl order. Each adapter lives in its own
// file, src/sources/<source-id>.js. See SOURCES.md for the status of each site.
import cartierHk from './cartier-hk.js';
import cartierSg from './cartier-sg.js';
import cartierVn from './cartier-vn.js';
import dafcVn from './dafc-vn.js';

export const sources = [dafcVn, cartierVn, cartierSg, cartierHk];
