/**
 * Script to update Service Worker version before deployment
 * Run: node scripts/update-sw-version.js
 */

const fs = require('fs');
const path = require('path');

const SW_PATH = path.join(__dirname, '../public/sw.js');

// Generate version based on timestamp
const version = `v${new Date().toISOString().slice(0, 10).replace(/-/g, '.')}.${Date.now().toString(36)}`;

// Read SW file
let swContent = fs.readFileSync(SW_PATH, 'utf8');

// Update version
swContent = swContent.replace(
  /const CACHE_VERSION = '[^']+';/,
  `const CACHE_VERSION = '${version}';`
);

// Write back
fs.writeFileSync(SW_PATH, swContent);

console.log(`✅ Service Worker version updated to: ${version}`);

