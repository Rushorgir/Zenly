# Project Memory — Zenly (concise)

Last updated: 2026-06-01

Project overview
- Zenly is a full-stack mental health support platform: Next.js frontend + Express backend + MongoDB. Key features: AI journaling (SSE), mood tracking, community forum, curated resources.

Current architecture
- Frontend: `frontend/` (Next.js 14, TypeScript, App Router)
- Backend: `backend/` (Express, Node.js, JS) — entry: `backend/server.js`
- Dev start: `./start-dev.sh` (starts MongoDB locally, backend, frontend)

Main subsystems
- Journals (SSE streaming + AI analysis) — backend controllers + streaming.service
- Forum (Socket.IO realtime) — controllers + models
- Resources (admin CRUD + view metrics)

Important conventions
- Frontend TypeScript is strict; prefer `frontend/lib` and `frontend/hooks` for shared logic.
- Linting via root `npm run lint`. Pre-commit runs `lint-staged`.
- Branching: follow `CONTRIBUTING.md` naming and use Conventional Commits.
- Never commit `.env` files; use `.env.example` templates.

Major decisions
- Use SSE for AI journaling streams and Socket.IO for room-based realtime features.

Recent meaningful changes
- (placeholder) Add entries here after significant merges.

Known recurring issues
- Lint/type issues on frontend builds — run `npm run lint` and `cd frontend && npm run build` during validation.
- SSE buffering/proxy issues — verify proxy pass-through in CI.

Open risks / things to watch
- Production SSE/Socket proxy config and CORS correctness.
- Secrets management — ensure envs are injected via deployment, not source.

Guidance for agents
- Read this file at the start of any session. If you modify architecture or conventions, update this file with a short `Last updated` note and link to session logs.
