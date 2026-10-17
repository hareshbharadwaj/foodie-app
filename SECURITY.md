# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, **do not** open a public issue.

Instead, email the repository owner directly or open a private security advisory via GitHub:
`GitHub → Security → Report a vulnerability`.

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact

You can expect a response within 48 hours. We will work with you to verify and patch the issue before public disclosure.

## Secrets Handling

- Never commit `.env` or any file containing real credentials.
- Use `.env.example` as a template. All secrets must be provided via environment variables.
- If a secret was accidentally committed:
  1. **Revoke / rotate** it immediately (DB password, session secret, API keys).
  2. Remove it from Git history with `git filter-repo` or BFG Repo-Cleaner.
  3. Force-push the cleaned history only if you understand the implications for collaborators.

## Hardening Checklist for Production

- [ ] Set strong `SESSION_SECRET` (`openssl rand -hex 32`)
- [ ] Use a dedicated MongoDB user with least privilege (not admin)
- [ ] Enable `NODE_ENV=production` (activates `Secure` cookies + Helmet)
- [ ] Serve over HTTPS and set `secure: true` cookies
- [ ] Deploy behind a reverse proxy that enforces TLS
- [ ] Regularly run `npm audit` and update dependencies
