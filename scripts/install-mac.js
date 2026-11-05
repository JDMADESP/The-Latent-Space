#!/usr/bin/env node
// Builds "The Latent Space.app" for this Mac, installs it in /Applications, and launches it.
// The app then starts by itself every time you log in (toggle in the 🪩 menu-bar menu).
'use strict';
const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const APP = 'The Latent Space.app';
const root = path.join(__dirname, '..');
const sh = (cmd, opts = {}) => execSync(cmd, { stdio: 'inherit', cwd: root, ...opts });
const quiet = cmd => { try { execSync(cmd, { stdio: 'ignore' }); } catch {} };

if (process.platform !== 'darwin') {
  console.error('The Latent Space currently supports macOS only.');
  process.exit(1);
}

const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
console.log(`\n🪩  Building The Latent Space for this Mac (${arch})…\n`);
// Build outside the project: folders synced by iCloud (like ~/Documents) add file metadata
// that macOS code signing rejects ("resource fork, Finder information, or similar detritus").
const distDir = fs.mkdtempSync(path.join(os.tmpdir(), 'latent-space-build-'));
sh(`npx electron-builder --mac dir --${arch} --publish never -c.directories.output="${distDir}"`);

const built = fs.readdirSync(distDir)
  .filter(d => d.startsWith('mac'))
  .map(d => path.join(distDir, d, APP))
  .find(p => fs.existsSync(p));
if (!built) { console.error('Build finished but the .app was not found in dist/.'); process.exit(1); }

// stop any running copy (installed app or `npm start` dev copy)
quiet(`osascript -e 'quit app "The Latent Space"'`);
quiet(`pkill -f "${path.join(root, 'node_modules', 'electron')}"`);
quiet(`pkill -f "${APP}/Contents/MacOS"`);

let destDir = '/Applications';
try { fs.accessSync(destDir, fs.constants.W_OK); } catch { destDir = path.join(os.homedir(), 'Applications'); fs.mkdirSync(destDir, { recursive: true }); }
const dest = path.join(destDir, APP);
fs.rmSync(dest, { recursive: true, force: true });
sh(`ditto "${built}" "${dest}"`);
quiet(`xattr -dr com.apple.quarantine "${dest}"`);

fs.rmSync(distDir, { recursive: true, force: true });
console.log(`\n✅  Installed to ${dest}`);
sh(`open "${dest}"`);
console.log('🪩  It\'s running now (look for the house in the bottom-right corner) and will start automatically at login.');
console.log('    Turn that off any time: click 🪩 in the menu bar → Start at Login.\n');
