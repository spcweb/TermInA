#!/usr/bin/env node

import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { cp, mkdir, rm, stat } from 'node:fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const rendererDir = join(projectRoot, 'renderer');
const distDir = join(projectRoot, 'dist');

async function ensureDirectoryExists(path) {
  try {
    const info = await stat(path);
    if (!info.isDirectory()) {
      throw new Error(`${path} esiste ma non è una directory`);
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      await mkdir(path, { recursive: true });
    } else {
      throw err;
    }
  }
}

async function main() {
  console.log('🛠️  Syncing renderer/ into dist/ ...');

  await ensureDirectoryExists(rendererDir);

  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });

  await cp(rendererDir, distDir, { recursive: true });

  console.log('✅ Renderer assets copied to dist/.');
}

main().catch((error) => {
  console.error('❌ Failed to sync renderer assets:', error);
  process.exitCode = 1;
});
