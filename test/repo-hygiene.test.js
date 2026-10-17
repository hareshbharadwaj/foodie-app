/**
 * Repository hygiene / security regression tests.
 *
 * These guard the issues found during the repository audit so they cannot
 * silently come back: committed dependencies, hardcoded secrets, missing
 * env template, missing npm scripts.
 *
 * Run with: npm test
 */

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

test('.gitignore excludes dependencies, env files and editor folders', () => {
  const ignore = read('.gitignore');

  assert.match(ignore, /^node_modules\/$/m);
  assert.match(ignore, /^\.env$/m);
  assert.match(ignore, /^\.vscode\/$/m);
  assert.match(ignore, /^\*\.log$/m);
});

test('.env.example ships variable names with placeholder values only', () => {
  const example = read('.env.example');

  for (const key of ['PORT', 'MONGODB_URI', 'SESSION_SECRET', 'ADMIN_USERNAME', 'ADMIN_PASSWORD']) {
    assert.match(example, new RegExp(`^${key}=`, 'm'), `${key} should be documented`);
  }

  // Placeholders must not look like real credentials.
  assert.match(example, /SESSION_SECRET=change-me/);
  assert.match(example, /ADMIN_PASSWORD=change-me/);
  assert.doesNotMatch(example, /[0-9a-f]{32,}/i, 'no long hex secret in the template');

  // Any Atlas URI mentioned must use obvious placeholders, never real credentials.
  for (const line of example.split('\n')) {
    if (line.includes('mongodb+srv://')) {
      assert.match(line, /<DB_USER>:<DB_PASSWORD>@<CLUSTER_HOST>/, 'Atlas example must use placeholders');
    }
  }
});

test('server.js reads configuration from the environment', () => {
  const server = read('server.js');

  assert.match(server, /require\('dotenv'\)\.config\(\)/);
  assert.match(server, /process\.env\.SESSION_SECRET/);
  assert.match(server, /process\.env\.MONGODB_URI/);
  assert.match(server, /process\.env\.ADMIN_PASSWORD/);
});

test('server.js contains no hardcoded secrets from the original audit', () => {
  const server = read('server.js');

  assert.doesNotMatch(server, /tubelight/, 'old hardcoded session secret must stay removed');
  assert.doesNotMatch(server, /admin123/, 'no well-known default admin password');
  assert.doesNotMatch(server, /secret:\s*'[A-Za-z0-9]+'/, 'session secret must come from env');
  assert.doesNotMatch(server, /mongodb:\/\/0\.0\.0\.0/, 'no hardcoded loopback-everywhere DB URI');
});

test('password hashes are never returned by the customer API', () => {
  const server = read('server.js');

  assert.match(server, /\/api\/customers/, 'customer endpoint should exist');
  // The handlers must use an explicit inclusion projection that omits `password`.
  assert.match(server, /\{ username: 1, email: 1, _id: 0 \}/);
  assert.doesNotMatch(server, /password:\s*1/, 'password must never be projected');
});

test('package.json declares runnable scripts, engines and a license', () => {
  const pkg = JSON.parse(read('package.json'));

  assert.equal(pkg.main, 'server.js');
  assert.equal(pkg.scripts.start, 'node server.js');
  assert.match(pkg.scripts.dev, /nodemon/);
  assert.match(pkg.scripts.test, /node --test/);
  assert.equal(pkg.license, 'UNLICENSED', 'no license chosen yet — must not claim one');
  assert.match(pkg.engines.node, />=\s*18/);
  assert.ok(pkg.dependencies.express, 'express must stay a dependency');
  assert.ok(pkg.devDependencies.nodemon, 'nodemon belongs in devDependencies');
  assert.equal(pkg.dependencies.path, undefined, 'the npm "path" shim must not be a dependency');
});

test('no license is claimed until the owner chooses one', () => {
  // The owner decided to keep the project unlicensed for now, so the repo must
  // not ship a LICENSE file or advertise a license badge.
  assert.ok(!fs.existsSync(path.join(ROOT, 'LICENSE')), 'LICENSE must not exist yet');

  const readme = read('README.md');
  assert.match(readme, /No license has been chosen/, 'README must state the licensing status');
  assert.doesNotMatch(readme, /License-MIT/, 'no MIT badge while unlicensed');
});

test('README documents setup, environment variables and the API', () => {
  const readme = read('README.md');

  for (const heading of [
    '## Installation',
    '## Environment Variables',
    '## Database Setup',
    '## Running the App',
    '## API Reference',
    '## Known Limitations',
  ]) {
    assert.ok(readme.includes(heading), `README should contain "${heading}"`);
  }

  assert.match(readme, /cp \.env\.example \.env/);
  assert.match(readme, /\/api\/health/);
});

test('secrets files and dependencies are not tracked by git', (t) => {
  let tracked;
  try {
    tracked = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' }).split('\n');
  } catch {
    t.skip('git is not available in this environment');
    return;
  }

  assert.ok(!tracked.includes('.env'), '.env must never be committed');
  assert.ok(
    !tracked.some((file) => file.startsWith('node_modules/')),
    'node_modules must never be committed'
  );
  assert.ok(tracked.includes('.env.example'), '.env.example should be committed');
  assert.ok(tracked.includes('package-lock.json'), 'lockfile should be committed');
});
