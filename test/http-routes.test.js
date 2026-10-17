/**
 * HTTP behaviour tests for the Express app.
 *
 * These tests exercise routing, session handling and the admin gate.
 * They do NOT require MongoDB: only routes that never touch the database
 * (static pages, health check, admin login, input validation) are covered.
 * Database-backed flows (user signup/login persistence) are verified manually.
 *
 * Run with: npm test
 */

'use strict';

// Set the environment BEFORE requiring the app. dotenv never overrides
// variables that already exist, so a developer's local .env cannot leak
// into the test run.
process.env.NODE_ENV = 'test';
process.env.PORT = '0';
process.env.SESSION_SECRET = 'test-session-secret-not-a-real-one';
process.env.ADMIN_USERNAME = 'test-admin';
process.env.ADMIN_PASSWORD = 'test-admin-password';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/foodie-test';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const { app } = require('../server');

const ADMIN_PAGES = [
  '/adminpage.html',
  '/add_product.html',
  '/delete_product.html',
  '/view_orders.html',
  '/view_customers.html',
];

let server;
let baseUrl;

/** Read every Set-Cookie header (getSetCookie is Node 18.14+). */
function cookiesFrom(response) {
  if (typeof response.headers.getSetCookie === 'function') {
    return response.headers.getSetCookie();
  }
  const raw = response.headers.get('set-cookie');
  return raw ? [raw] : [];
}

/** Extract just the `name=value` pair from a Set-Cookie header. */
function cookieJar(response) {
  return cookiesFrom(response)
    .map((header) => header.split(';')[0])
    .join('; ');
}

function get(path, cookie) {
  return fetch(`${baseUrl}${path}`, {
    redirect: 'manual',
    headers: cookie ? { cookie } : {},
  });
}

function post(path, form, cookie) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    redirect: 'manual',
    headers: cookie ? { cookie } : {},
    body: new URLSearchParams(form),
  });
}

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('GET / serves the home page', async () => {
  const res = await get('/');
  const body = await res.text();

  assert.equal(res.status, 200);
  assert.match(body, /Foodie/);
});

test('GET /home is an alias for the home page', async () => {
  const res = await get('/home');
  assert.equal(res.status, 200);
});

test('static assets are served from /public', async () => {
  const css = await get('/home.css');
  assert.equal(css.status, 200);
  assert.match(css.headers.get('content-type') || '', /text\/css/);

  const logo = await get('/food%20logo.png');
  assert.equal(logo.status, 200);
  assert.match(logo.headers.get('content-type') || '', /image\/png/);
});

test('security headers are set by helmet', async () => {
  const res = await get('/');

  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(res.headers.get('x-frame-options'), 'SAMEORIGIN');
});

test('GET /api/health reports service status', async () => {
  const res = await get('/api/health');
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.status, 'ok');
  assert.equal(body.database, 'disconnected', 'tests run without MongoDB');
  assert.equal(typeof body.uptime, 'number');
});

test('unknown /api routes return a JSON 404', async () => {
  const res = await get('/api/does-not-exist');
  const body = await res.json();

  assert.equal(res.status, 404);
  assert.equal(body.error, 'API endpoint not found');
});

test('GET /check-auth reports a logged-out visitor', async () => {
  const res = await get('/check-auth');
  assert.deepEqual(await res.json(), { loggedIn: false });
});

test('GET /api/check-login-status reports a logged-out visitor', async () => {
  const res = await get('/api/check-login-status');
  assert.deepEqual(await res.json(), { isLoggedIn: false });
});

test('GET /indiandish redirects visitors who are not logged in', async () => {
  const res = await get('/indiandish');

  assert.equal(res.status, 302);
  assert.match(res.headers.get('location') || '', /^\/\?message=/);
});

test('admin pages are not reachable without an admin session', async () => {
  for (const page of ADMIN_PAGES) {
    const res = await get(page);

    assert.equal(res.status, 302, `${page} should redirect`);
    assert.match(
      res.headers.get('location') || '',
      /^\/adminlogin\.html\?message=/,
      `${page} should redirect to the admin login`
    );
  }
});

test('POST /admin-login rejects wrong credentials', async () => {
  const res = await post('/admin-login', {
    username: 'test-admin',
    password: 'definitely-wrong',
  });

  assert.equal(res.status, 302);
  assert.match(res.headers.get('location') || '', /^\/adminlogin\.html\?message=Invalid/);
  assert.equal(cookiesFrom(res).length, 0, 'no session cookie on failure');
});

test('POST /admin-login accepts the configured credentials and unlocks the dashboard', async () => {
  const login = await post('/admin-login', {
    username: 'test-admin',
    password: 'test-admin-password',
  });

  assert.equal(login.status, 302);
  assert.match(login.headers.get('location') || '', /^\/adminpage\.html\?message=/);

  const jar = cookieJar(login);
  assert.ok(jar.includes('connect.sid'), 'session cookie should be issued');

  for (const page of ADMIN_PAGES) {
    const res = await get(page, jar);
    assert.equal(res.status, 200, `${page} should be reachable with an admin session`);
  }

  const dashboard = await get('/adminpage.html', jar);
  assert.match(await dashboard.text(), /Admin Panel/);
});

test('POST /admin-logout ends the admin session', async () => {
  const login = await post('/admin-login', {
    username: 'test-admin',
    password: 'test-admin-password',
  });
  const jar = cookieJar(login);

  assert.equal((await get('/adminpage.html', jar)).status, 200);

  const logout = await post('/admin-logout', {}, jar);
  assert.equal(logout.status, 302);
  assert.match(logout.headers.get('location') || '', /^\/\?message=/);

  const afterLogout = await post('/admin-logout', {}, jar);
  assert.equal(afterLogout.status, 302);

  const gated = await get('/adminpage.html', cookieJar(afterLogout));
  assert.equal(gated.status, 302, 'dashboard must be gated again after logout');
});

test('POST /logout is safe for visitors without a session', async () => {
  const res = await post('/logout', {});

  assert.equal(res.status, 302);
  assert.match(res.headers.get('location') || '', /^\/\?message=You%20have%20been%20logged%20out/);
});

test('POST /signup validates required fields before touching the database', async () => {
  const missing = await post('/signup', { username: '', email: '', password: '' });
  assert.equal(missing.status, 302);
  assert.match(missing.headers.get('location') || '', /message=All%20fields%20are%20required/);

  const shortPassword = await post('/signup', {
    username: 'tester',
    email: 'tester@example.com',
    password: '123',
  });
  assert.equal(shortPassword.status, 302);
  assert.match(shortPassword.headers.get('location') || '', /at%20least%206%20characters/);
});
