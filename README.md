# 🍽️ Foodie App — Online Food Ordering System

> A full-stack food ordering platform with user authentication, multi-cuisine menu browsing, cart & checkout, and an admin dashboard.

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)](https://mongoosejs.com)
[![CI](https://github.com/hareshbharadwaj/foodie-app/actions/workflows/ci.yml/badge.svg)](https://github.com/hareshbharadwaj/foodie-app/actions)

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Architecture & Workflow](#architecture--workflow)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Running the App](#running-the-app)
- [API Reference](#api-reference)
- [Screenshots](#screenshots)
- [Testing](#testing)
- [Deployment](#deployment)
- [Continuous Integration](#continuous-integration)
- [Known Limitations](#known-limitations)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

### Problem Statement

Small restaurants and food vendors often rely on phone orders or third-party aggregators that charge high commissions. Customers want a simple way to browse menus by cuisine, add items to a cart, and place orders without a complex account flow — while owners need a lightweight dashboard to manage the catalogue and review orders.

### Objectives

- Provide a **single web app** that serves both customers and administrators.
- Demonstrate **end-to-end full-stack techniques**: server-side authentication, session management, persistence with MongoDB, and a static frontend served by Express.
- Keep the system easy to run locally for learning and portfolio review — no payment gateway or external service required.

> **Important:** Payments in this project are **simulated** on the client side. No real card processing occurs and no card data is sent to the server. See [Known Limitations](#known-limitations).

---

## Key Features

| Area | What is implemented |
|------|---------------------|
| **User Auth** | Sign up, sign in, sign out. Passwords hashed with `bcryptjs`. Session cookie (httpOnly, sameSite=lax). Protected routes (`/indiandish`). Login-status API for the navbar. |
| **Menu Browsing** | Home page with featured cuisines (Indian, Chinese, Italian). Each cuisine has a dedicated page with hardcoded dishes + dynamically added dishes from the admin. |
| **Cart** | Add-to-cart, view cart, remove items, running total. Each click stores one unit (`quantity: 1`) — there is no quantity stepper yet. Persisted in `localStorage`. |
| **Checkout** | Two flows: (1) multi-item cart → `payment.html`, (2) single-dish Buy Now → `paymentorder.html`. Orders stored in `localStorage` and displayed on `view_orders.html` and `order-confirmation.html`. |
| **Admin Dashboard** | Separate admin login (env-configured). Protected `adminpage.html` with sidebar loading `add_product.html`, `delete_product.html`, `view_orders.html`, `view_customers.html` in an iframe. Add/delete dishes by cuisine stored in `localStorage`. Customers list fetched from `GET /api/customers`. |
| **Static Pages** | About, Contact, Privacy Policy, responsive navbar/footer. |

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| **Runtime** | Node.js 18+ |
| **Backend Framework** | Express 4 |
| **Database** | MongoDB with Mongoose 8 |
| **Authentication** | express-session, bcryptjs |
| **Security** | helmet, dotenv, httpOnly cookies |
| **Frontend** | Vanilla HTML, CSS, JavaScript (no framework) |
| **Client Persistence** | localStorage (cart, orders, custom dishes), sessionStorage (single-dish handoff) |
| **Dev Tooling** | nodemon, GitHub Actions CI |

---

## Architecture & Workflow

```text
Browser  (public/*.html — vanilla HTML/CSS/JS)
   │  ▲
   │  └── static files + JSON responses (session cookie: connect.sid)
   ▼
Express server  (server.js)
   ├── GET  /                  → home.html (featured cuisines)
   ├── GET  /login, /signup    → auth pages
   ├── POST /signup, /login    → bcrypt hashing + session  ──►  MongoDB (users collection)
   ├── POST /admin-login       → credentials from .env     ──►  session flag isAdminLoggedIn
   ├── GET  /api/*             → JSON: /api/health, /api/check-login-status, /api/customers
   ├── admin gate (middleware) → 302 to /adminlogin.html for unauthenticated admin pages
   └── GET  /indiandish        → requires a user session

Browser storage (per device — NOT persisted server-side)
   ├── localStorage   : cart, orders, admin-added dishes
   └── sessionStorage : dishName / dishPrice (single-dish checkout handoff)
```

Only **user accounts** are stored in MongoDB. Cart, orders and admin-added dishes
live in the browser (see [Known Limitations](#known-limitations)).

**Request lifecycle (example — signup):**

1. User submits `POST /signup` with `username`, `email`, `password`.
2. Server validates input, checks for existing email, hashes password, creates `User` document.
3. Session is created (`isLoggedIn`, `username`) and cookie set.
4. Client redirects to `/?message=...` and fetches `GET /api/check-login-status` to render the welcome banner.

---

## Project Structure

```
foodie-app/
├── server.js                 # Express app, routes, DB connection
├── test/                     # Automated tests (node:test)
│   ├── http-routes.test.js   # Routing, sessions, admin gate
│   ├── password-hashing.test.js
│   └── repo-hygiene.test.js  # Secrets/config regression guards
├── public/                   # Static frontend (served at /)
│   ├── home.html             # Landing page with featured cuisines
│   ├── home.css              # Global styles
│   ├── login.html            # User sign-in
│   ├── signup.html           # User sign-up
│   ├── adminlogin.html       # Admin sign-in
│   ├── adminpage.html        # Admin dashboard (sidebar + iframe)
│   ├── add_product.html      # Admin: add dish (localStorage)
│   ├── delete_product.html   # Admin: delete dish (localStorage)
│   ├── view_orders.html      # Admin: view orders (localStorage)
│   ├── view_customers.html   # Admin: customer list (GET /api/customers)
│   ├── cart.html             # Cart overview
│   ├── payment.html          # Multi-item checkout
│   ├── paymentorder.html     # Single-item checkout
│   ├── order-confirmation.html
│   ├── indiandish.html       # Indian cuisine catalogue
│   ├── chinesedish.html      # Chinese cuisine catalogue
│   ├── italiandish.html      # Italian cuisine catalogue
│   ├── about.html
│   ├── contact.html
│   ├── privacy.html
│   └── food logo.png         # Logo asset
├── .env.example              # Environment template (commit-safe)
├── .env                      # Local env (gitignored — create from .env.example)
├── .gitignore
├── .editorconfig
├── .nvmrc                    # Node version hint
├── .github/
│   ├── workflows/ci.yml
│   ├── ISSUE_TEMPLATE/
│   └── pull_request_template.md
├── CONTRIBUTING.md
├── SECURITY.md
├── LICENSE
├── package.json
└── README.md
```

> `node_modules/` and `.env` are **not** committed. See `.gitignore`.

---

## Prerequisites

- **Node.js** 18 or later (`node -v`)
- **npm** 9+ (`npm -v`)
- **MongoDB** — either:
  - Local instance (MongoDB Community Server), or
  - [MongoDB Atlas](https://www.mongodb.com/atlas) free cluster

---

## Installation

```bash
# 1. Clone
git clone https://github.com/hareshbharadwaj/foodie-app.git
cd foodie-app

# 2. Install dependencies
npm install

# 3. Create env file
cp .env.example .env
# — edit .env with your values (see next section)
```

---

## Environment Variables

All configuration is read from `.env` via `dotenv`. Copy `.env.example` to `.env`:

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/foodieDB
SESSION_SECRET=change-me-to-a-long-random-string
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-me-to-a-strong-password
```

| Variable | Required in production | Description |
|----------|------------------------|-------------|
| `PORT` | No | HTTP port. Defaults to `3000` (the original code hardcoded `330`, which collides with MySQL). |
| `NODE_ENV` | No | `development` (default) or `production`. In production, session cookies are `Secure` and missing config aborts startup. |
| `MONGODB_URI` | **Yes** | MongoDB connection string. Local: `mongodb://127.0.0.1:27017/foodieDB`. Atlas: `mongodb+srv://<DB_USER>:<DB_PASSWORD>@<CLUSTER_HOST>/foodieDB`. Falls back to the local URI in development. |
| `SESSION_SECRET` | **Yes** | Secret used to sign session cookies. Generate one with `openssl rand -hex 32`. |
| `ADMIN_USERNAME` | **Yes** | Username accepted by `POST /admin-login` (dev fallback: `admin`). |
| `ADMIN_PASSWORD` | **Yes** | Password accepted by `POST /admin-login`. No default is shipped — in development a temporary one is generated and printed at startup. |

If `NODE_ENV=production` and any of the four required variables is missing, the server logs the missing keys and exits instead of starting with insecure defaults.

> **Never commit `.env`.** It is gitignored. Only `.env.example` is tracked.

---

## Database Setup

No migrations are required. Mongoose creates the `users` collection automatically.

**Local MongoDB:**

```bash
# Start mongod (varies by OS)
mongod --dbpath /data/db

# Verify connection
mongosh --eval "db.adminCommand('ping')"
```

**Atlas:**

1. Create a free cluster at https://cloud.mongodb.com.
2. Create a database user and whitelist your IP.
3. Copy the SRV connection string into `MONGODB_URI`.

The app logs `[db] Connected to MongoDB` on successful connection.

---

## Running the App

```bash
# Development (auto-reload)
npm run dev

# Production
npm start
```

Open **http://localhost:3000** (or the `PORT` you configured).

| URL | Description |
|-----|-------------|
| `/` | Home / Featured cuisines |
| `/login` | User login page |
| `/signup` | User registration |
| `/indiandish` | Indian menu (requires login) |
| `/adminpage.html` | Admin dashboard (requires admin login) |
| `/api/health` | JSON health check |

**Admin credentials** come from your `.env` (`ADMIN_USERNAME` / `ADMIN_PASSWORD`).
No well-known default password ships with this repository: if `ADMIN_PASSWORD`
is not set in development, a temporary password is generated and printed once at
startup. In production the server **refuses to start** until all required
variables are set.

```text
[config] ADMIN_PASSWORD not set — temporary dev password for this run: 6f1c…
```

---

## API Reference

All API routes return JSON. Authenticated routes use the session cookie automatically set on login.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | — | Serves `home.html` |
| `GET` | `/signup` | — | Serves `signup.html` |
| `GET` | `/login` | — | Serves `login.html` |
| `GET` | `/home` | — | Alias for `/` |
| `GET` | `/indiandish` | User | Serves `indiandish.html` |
| `GET` | `/adminpage.html` | Admin | Admin dashboard (also gates `add_product.html`, `delete_product.html`, `view_orders.html`, `view_customers.html`) |
| `POST` | `/signup` | — | Create account. Body: `username`, `email`, `password`. Redirects with `?message=` |
| `POST` | `/login` | — | User login. Body: `email`, `password`. |
| `POST` | `/logout` | User | Destroys session, clears cookie |
| `POST` | `/admin-login` | — | Admin login. Body: `username`, `password` |
| `POST` | `/admin-logout` | Admin | Clears admin session flag |
| `GET` | `/check-auth` | — | `{ loggedIn: boolean }` |
| `GET` | `/api/check-login-status` | — | `{ isLoggedIn: boolean, username?: string }` |
| `GET` | `/api/customers` | — | List of users (username + email only, no password hash) |
| `GET` | `/api/items` | — | Deprecated alias for `/api/customers` |
| `GET` | `/api/health` | — | `{ status, database, uptime }` |

**Example — check login status:**

```bash
curl http://localhost:3000/api/check-login-status
# → {"isLoggedIn": false}
```

**Example — health check:**

```bash
curl http://localhost:3000/api/health
# → {"status":"ok","database":"connected","uptime":12.34}
```

> Orders, cart, and custom dishes are intentionally **client-side only** (localStorage). They are not exposed via REST APIs in this version. See [Known Limitations](#known-limitations).

---

## Screenshots

Screenshot carried over from the original project README (author-uploaded):

![Foodie App screenshot from the original project README](https://github.com/user-attachments/assets/4d16dc31-17f8-444d-8afe-0354b64b5b4b)

To add current screenshots of your own, run the app and save them under `docs/screenshots/`:

```bash
npm start
# Open http://localhost:3000, then capture: home, login, a cuisine menu,
# the cart, checkout, and the admin dashboard.
```

Then reference them like this:

```markdown
![Home page](docs/screenshots/home.png)
```

---

## Testing

The project uses the **built-in Node.js test runner** (`node:test`) — no extra test framework is installed.

```bash
npm test            # run the full suite
npm run test:watch  # re-run on file changes
node -c server.js   # syntax check
npm run audit       # dependency security audit
```

### What is covered automatically

| File | Covers |
|------|--------|
| `test/password-hashing.test.js` | bcrypt hashing: no plain-text storage, correct/incorrect password verification, unique salts |
| `test/http-routes.test.js` | Page routing, static assets, helmet headers, `/api/health`, JSON 404s, login-status endpoints, the `/indiandish` auth redirect, the **admin page gate**, admin login/logout with sessions, and signup input validation |
| `test/repo-hygiene.test.js` | `.gitignore` coverage, `.env.example` placeholders only, no hardcoded secrets in `server.js`, password field never projected by the customer API, npm scripts/license present, README sections present, `.env`/`node_modules` not tracked by git |

These tests need **no MongoDB instance** — they only exercise routes that do not touch the database.

### What still requires manual verification

Database-backed flows need a running MongoDB (see [Database Setup](#database-setup)):

1. Sign up → sign in → browse a cuisine → add to cart → checkout → order confirmation.
2. Sign in as admin → add a dish → confirm it renders on the cuisine page → delete it → confirm removal.
3. Restart MongoDB and confirm `/api/health` reports `"database": "connected"`.

---

## Deployment

### Any Node Host (Render, Railway, Fly.io, VPS)

1. Set environment variables in the host dashboard (`MONGODB_URI`, `SESSION_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `NODE_ENV=production`, `PORT`).
2. Build command: `npm install`
3. Start command: `npm start`
4. Ensure the host forwards `PORT` correctly (most PaaS do this automatically).

### Environment

- `NODE_ENV=production` enables `Secure` cookies — ensure the app is served over **HTTPS**.
- Use a managed MongoDB Atlas cluster for production data.

### Health Checks

Configure the host to ping `GET /api/health` for liveness.

---

## Continuous Integration

`.github/workflows/ci.yml` runs on every push and pull request (Node 18 and 20):
`npm ci` → `node -c server.js` → `npm test` → `npm audit --omit=dev` (blocking) →
`npm audit` for dev dependencies (informational).

### Dependency security status

- `npm audit --omit=dev` → **0 vulnerabilities** (all runtime dependencies patched:
  Express 4.22.x, Mongoose 8.24.x, express-session 1.19.x, body-parser 1.20.8).
- `npm audit` (including dev) → **3 high advisories**, all inside the dev-only
  `nodemon → chokidar → braces` chain. They never ship to production and cannot be
  fixed without a breaking `nodemon` downgrade, so they are reported but not blocking.

---

## Known Limitations

- **Payments are simulated.** The payment forms accept any text and store orders in `localStorage`. No data is sent to a payment processor, and card details are **never transmitted to the server** — do not enter real card details.
- **Client-side persistence.** Cart, orders, and admin-added dishes live in the browser's `localStorage`. They are per-device, per-browser, not shared between users, and disappear when browser storage is cleared.
- **Menu pages are publicly reachable.** Cuisine pages are static files; the "log in before ordering" rule is enforced in the browser via `GET /check-auth`. Only `GET /indiandish` is protected server-side. Server-side enforcement of ordering requires moving dishes and orders into the API (see Roadmap).
- **In-memory sessions.** `express-session` uses the default `MemoryStore`: sessions are lost on restart and are not shared across processes. Use `connect-mongo` or Redis before deploying more than one instance.
- **Single admin account** configured through environment variables — no multi-admin roles or permissions.
- **No automated coverage of database-backed flows** (signup/login persistence) because those tests would require a running MongoDB instance.
- **No email verification, password reset, rate limiting, or CSRF tokens** on form posts.
- **No pagination or search** on menu pages; dish images are external URLs.

---

## Roadmap

- [ ] Move cart/orders/dishes from `localStorage` to MongoDB with proper REST APIs
- [ ] Add JWT or persistent session store (e.g., `connect-mongo`) instead of in-memory sessions
- [ ] Input validation and sanitization with `express-validator`
- [ ] Rate limiting on auth endpoints
- [ ] Image uploads (instead of URL-only dish images)
- [ ] Extend automated tests to database-backed flows (e.g. `mongodb-memory-server`) and add browser E2E tests (Playwright)
- [ ] Quantity stepper in the cart and CSRF protection on form posts
- [ ] Responsive polish and accessibility (ARIA, keyboard navigation)

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, branch workflow, and PR checklist.

Please follow the [Security Policy](SECURITY.md) to report vulnerabilities.

---

## License

No license has been chosen for this project yet, so under copyright law the
default applies: **all rights reserved** by the repository owner. The code is
published here as a portfolio/demonstration project — you are welcome to read it
and learn from it, but please ask the owner before reusing or redistributing it.

To add a license later, drop a `LICENSE` file in the repository root and update
the `license` field in `package.json`.

---

## Acknowledgments

Built as a portfolio / educational project demonstrating Express, Mongoose, and session-based auth without external UI frameworks.
