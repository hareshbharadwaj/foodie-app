# Contributing to Foodie App

Thank you for considering a contribution! This guide keeps the process smooth.

## Ground Rules

- Keep changes focused — one feature or fix per pull request.
- Do not commit secrets, `node_modules`, or generated files.
- Preserve existing behaviour unless the PR explicitly proposes a change.
- Run the app locally and verify manually before opening a PR.

## Development Setup

1. Fork and clone:

   ```bash
   git clone https://github.com/<your-username>/foodie-app.git
   cd foodie-app
   ```

2. Install and configure:

   ```bash
   npm install
   cp .env.example .env
   # edit .env with your local MongoDB URI and secrets
   ```

3. Start the app:

   ```bash
   npm run dev   # auto-reload with nodemon
   # or
   npm start     # production mode
   ```

   The server listens on `http://localhost:3000` (or the `PORT` you set).

## Branch Workflow

1. Create a feature branch: `git checkout -b feat/short-description`
2. Commit with clear messages: `feat: add cart quantity controls`
3. Push and open a Pull Request against `main`.

## Pull Request Checklist

- [ ] `npm test` passes (when tests exist)
- [ ] `node -c server.js` has no syntax errors
- [ ] README updated if setup or API changed
- [ ] No secrets or `node_modules` committed
- [ ] Screenshots added for UI changes (optional but appreciated)

## Code Style

- JavaScript (CommonJS) with 2-space indentation.
- Use `helmet`, `dotenv`, and `express-session` as already configured — do not introduce new heavy dependencies without discussion.
- Keep frontend HTML/CSS self-contained and avoid duplicating navbar styles where possible.

## Reporting Issues

Use the Bug Report template. Include:
- Steps to reproduce
- Expected vs actual behaviour
- Screenshots / logs (redact secrets)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
