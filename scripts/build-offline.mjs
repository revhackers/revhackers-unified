#!/usr/bin/env node

/**
 * Isolated local build validation for macOS.
 *
 * This wrapper deliberately refuses to run without sandbox-exec. It creates a
 * fresh envDir, output directory, HOME, TMPDIR and Chrome profile, then runs
 * Vite and the prerenderer as sandboxed child processes. Only loopback IP
 * traffic and local Unix sockets required by Chrome are permitted.
 *
 * Limitations:
 * - This validates the static build and the fixed prerender route set only.
 * - Dynamic routes that need a backend are intentionally excluded.
 * - It is a macOS validation harness, not the production build/deploy path.
 * - It proves isolation for the child processes launched here; it does not
 *   make the normal `npm run build` offline.
 * - macOS can refuse nested sandbox-exec. Sandboxed automation must launch
 *   this wrapper as a top-level sandboxed process instead of nesting it.
 */

import { accessSync, constants, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(import.meta.dirname, '..');
const sandboxExecutable = '/usr/bin/sandbox-exec';
const sandboxProfileFile = path.join(repoRoot, 'scripts/offline-network.sb');
const sandboxChildArgument = '--sandboxed-child';
const chromeCandidates = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
];

function requireExecutable(file, description) {
  try {
    accessSync(file, constants.X_OK);
    return file;
  } catch {
    throw new Error(`${description} is unavailable at ${file}; refusing to claim an offline validation.`);
  }
}

function findChrome() {
  for (const candidate of chromeCandidates) {
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {
      // Try the next local browser. Downloads are intentionally forbidden.
    }
  }
  throw new Error('No supported local Chrome executable was found; refusing to download one.');
}

function childEnvironment(tempRoot, extra = {}) {
  const env = {
    HOME: path.join(tempRoot, 'home'),
    TMPDIR: path.join(tempRoot, 'tmp'),
    PATH: '/usr/bin:/bin:/usr/sbin:/sbin',
    LANG: 'C',
    CI: '1',
    ...extra,
  };

  for (const name of Object.keys(env)) {
    if (name.startsWith('VITE_')) {
      throw new Error(`Unexpected Vite variable in isolated child environment: ${name}`);
    }
  }

  return env;
}

function bootstrapEnvironment() {
  return {
    HOME: os.tmpdir(),
    TMPDIR: os.tmpdir(),
    PATH: '/usr/bin:/bin:/usr/sbin:/sbin',
    LANG: 'C',
    CI: '1',
  };
}

function runChild(label, command, args, options) {
  console.log(`\n🔒 ${label}`);
  const result = spawnSync(
    command,
    args,
    {
      cwd: repoRoot,
      env: options.env,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) throw result.error;
  if (result.signal) throw new Error(`${label} terminated by signal ${result.signal}.`);
  if (result.status !== 0) throw new Error(`${label} failed with exit code ${result.status}.`);
}

if (process.platform !== 'darwin') {
  throw new Error('build:offline currently requires macOS sandbox-exec; refusing an uncontained fallback.');
}

requireExecutable(sandboxExecutable, 'macOS sandbox-exec');
accessSync(sandboxProfileFile, constants.R_OK);

const argumentsList = process.argv.slice(2);
if (argumentsList.length === 0) {
  const result = spawnSync(
    sandboxExecutable,
    [
      '-f',
      sandboxProfileFile,
      process.execPath,
      fileURLToPath(import.meta.url),
      sandboxChildArgument,
    ],
    {
      cwd: repoRoot,
      env: bootstrapEnvironment(),
      stdio: 'inherit',
    },
  );

  if (result.error) throw result.error;
  if (result.signal) throw new Error(`sandbox-exec terminated by signal ${result.signal}.`);
  process.exit(result.status ?? 1);
}
if (argumentsList.length !== 1 || argumentsList[0] !== sandboxChildArgument) {
  throw new Error('Unknown argument; refusing an uncontained offline build.');
}

const chromeExecutable = findChrome();
const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'revhackers-offline-build-'));
const envDir = path.join(tempRoot, 'env');
const outDir = path.join(tempRoot, 'dist');
const homeDir = path.join(tempRoot, 'home');
const tempDir = path.join(tempRoot, 'tmp');
const chromeProfile = path.join(tempRoot, 'chrome-profile');

try {
  for (const directory of [envDir, outDir, homeDir, tempDir, chromeProfile]) {
    mkdirSync(directory, { recursive: true });
  }

  const viteEnvironment = childEnvironment(tempRoot, {
    REVHACKERS_OFFLINE_ENV_DIR: envDir,
    REVHACKERS_OFFLINE_OUT_DIR: outDir,
  });
  runChild(
    'Building into an isolated temporary outDir',
    process.execPath,
    [
      path.join(repoRoot, 'node_modules/vite/bin/vite.js'),
      'build',
      '--mode',
      'offline',
      '--config',
      path.join(repoRoot, 'vite.config.ts'),
    ],
    { env: viteEnvironment },
  );

  runChild(
    'Prerendering fixed routes with external network denied',
    process.execPath,
    [
      path.join(repoRoot, 'scripts/prerender.js'),
      '--offline',
      '--dist-dir',
      outDir,
      '--browser-executable',
      chromeExecutable,
      '--browser-profile',
      chromeProfile,
    ],
    { env: childEnvironment(tempRoot) },
  );

  console.log('\n✅ Isolated offline build validation completed.');
  console.log('   Dynamic routes were skipped; temporary artifacts will now be removed.');
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
