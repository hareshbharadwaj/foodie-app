/**
 * Unit tests for password hashing behaviour (bcryptjs).
 *
 * These tests do not require MongoDB or a running server.
 * Run with: npm test
 */

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10; // must match server.js

test('hashed password is not stored in plain text', async () => {
  const plain = 'correct-horse-battery';
  const hash = await bcrypt.hash(plain, SALT_ROUNDS);

  assert.notEqual(hash, plain);
  assert.ok(!hash.includes(plain), 'hash must not contain the plain password');
  assert.match(hash, /^\$2[aby]\$\d{2}\$/, 'expected a bcrypt hash format');
});

test('correct password verifies, wrong password does not', async () => {
  const hash = await bcrypt.hash('s3cret-pass', SALT_ROUNDS);

  assert.equal(await bcrypt.compare('s3cret-pass', hash), true);
  assert.equal(await bcrypt.compare('wrong-pass', hash), false);
  assert.equal(await bcrypt.compare('', hash), false);
});

test('the same password produces different hashes (unique salt)', async () => {
  const [a, b] = await Promise.all([
    bcrypt.hash('repeatable', SALT_ROUNDS),
    bcrypt.hash('repeatable', SALT_ROUNDS),
  ]);

  assert.notEqual(a, b);
  assert.equal(await bcrypt.compare('repeatable', a), true);
  assert.equal(await bcrypt.compare('repeatable', b), true);
});
