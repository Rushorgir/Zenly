# Error Catalog — recurring failures and fixes

This file summarizes recurring errors, their typical root causes, and preferred fixes. Use it before applying fixes.

- Lint/type failures on frontend build
  - Root cause: TypeScript strictness or missing types; ESLint rules enforced in CI.
  - Fix: Run `npm run lint`, address the top-most error, add or refine types, and re-run `cd frontend && npm run build`.

- Missing env or incorrect `FRONTEND_URL` leading to CORS
  - Root cause: envs not set in local/dev; FRONTEND_URL mismatch.
  - Fix: Verify `backend/.env` and `frontend/.env.local` from `.env.example`; ensure CORS whitelist allows local host.

- SSE/Socket.IO not streaming in local/dev
  - Root cause: proxies or dev server buffering, incorrect CORS, or missing SSE headers.
  - Fix: Run `./start-dev.sh` and test SSE/Socket endpoints; verify proxy passes 'text/event-stream' and CORS config permits streaming.

- Accidental commit of secrets or `.env`
  - Root cause: developer error.
  - Fix: Remove secrets, rotate if necessary, and add a note to the session log; update pre-commit to catch these if missing.
