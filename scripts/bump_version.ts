/**
 * KamaiPlus Automatic Version Bumper
 * Increments minor version by +0.1.0 on every git commit / push
 * Example: 3.7.0 -> 3.8.0 -> 3.9.0 -> 3.10.0
 */

import fs from 'fs';
import path from 'path';

const packageJsonPath = path.resolve(__dirname, '../package.json');
const versionTsPath = path.resolve(__dirname, '../src/lib/constants/version.ts');

function bumpVersion() {
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const currentVersion = pkg.version || '3.7.0';
  const parts = currentVersion.split('.').map(Number);
  
  // Increment minor version by 1 (e.g. 3.7.0 -> 3.8.0)
  if (parts.length >= 2) {
    parts[1] += 1;
    parts[2] = 0;
  } else {
    parts[0] += 1;
  }

  const newVersion = parts.join('.');
  pkg.version = newVersion;
  fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');

  // Update src/lib/constants/version.ts
  const today = new Date().toISOString().split('T')[0];
  const versionFileContent = `/**
 * KamaiPlus App Version Configuration
 * Single Source of Truth for current application release version.
 * Auto-incremented on every git commit & push.
 */

export const APP_VERSION = '${newVersion}';
export const APP_RELEASE_DATE = '${today}';
export const APP_BUILD_NAME = 'KamaiPlus Pro Enterprise';
`;
  fs.writeFileSync(versionTsPath, versionFileContent, 'utf-8');

  console.log(`🚀 Version bumped: ${currentVersion} -> ${newVersion}`);
  return newVersion;
}

bumpVersion();
