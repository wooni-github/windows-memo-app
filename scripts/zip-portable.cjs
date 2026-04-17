#!/usr/bin/env node
/*
 * Zip release/win-unpacked into release/Memo-Portable-<version>.zip.
 * Uses PowerShell's Compress-Archive so no extra npm deps are needed.
 * Run after `npm run pack` (or `npm run build:portable-zip`).
 */
const { execFileSync } = require('node:child_process');
const { existsSync, rmSync, mkdirSync } = require('node:fs');
const { join, resolve } = require('node:path');

const ROOT = resolve(__dirname, '..');
const SRC = join(ROOT, 'release', 'win-unpacked');
const RELEASE_DIR = join(ROOT, 'release');
const pkg = require(join(ROOT, 'package.json'));
const OUT = join(RELEASE_DIR, `Memo-Portable-${pkg.version}.zip`);

if (!existsSync(SRC)) {
  console.error(`[zip-portable] missing ${SRC} — run \`npm run pack\` first.`);
  process.exit(1);
}

mkdirSync(RELEASE_DIR, { recursive: true });
if (existsSync(OUT)) rmSync(OUT);

console.log(`[zip-portable] Compressing ${SRC}\n                → ${OUT}`);

try {
  execFileSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      `Compress-Archive -Path "${SRC}\\*" -DestinationPath "${OUT}" -CompressionLevel Optimal -Force`
    ],
    { stdio: 'inherit' }
  );
  console.log(`[zip-portable] Done: ${OUT}`);
} catch (err) {
  console.error('[zip-portable] Compression failed:', err.message);
  process.exit(1);
}
