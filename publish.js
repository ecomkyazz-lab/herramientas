const fs = require('fs');
const path = require('path');

const DRAFTS_DIR = path.join(__dirname, 'drafts');
const BLOG_DIR = path.join(__dirname, 'blog');

// Get all draft files sorted by number
const drafts = fs.readdirSync(DRAFTS_DIR)
  .filter(f => f.endsWith('.html'))
  .sort();

if (drafts.length === 0) {
  console.log('No drafts to publish.');
  process.exit(0);
}

// Publish the first (lowest numbered) draft
const next = drafts[0];
const src = path.join(DRAFTS_DIR, next);
const dest = path.join(BLOG_DIR, next);

fs.copyFileSync(src, dest);
fs.unlinkSync(src);

console.log(`Published: ${next}`);
console.log(`Remaining drafts: ${drafts.length - 1}`);
