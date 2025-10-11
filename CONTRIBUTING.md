# Contributing to Zenly

Thanks for your interest in contributing! This guide explains how to set up the project locally, the development workflow, and our expectations for code quality and pull requests.

Please read our [Code of Conduct](./CODE_OF_CONDUCT.md) before participating.

## Quick Start

1) Fork the repo and clone your fork

```bash
git clone https://github.com/<your-username>/Zenly.git
cd Zenly
git remote add upstream https://github.com/Rushorgir/Zenly.git
```

2) Create a feature branch

```bash
git checkout -b feat/short-description
```

3) Set up your environment

```bash
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
```

4) Run the app (both servers)

```bash
./start-dev.sh
```

Frontend: http://localhost:3000  |  Backend: http://localhost:5001

## Project Structure

- `frontend/` — Next.js 14 (App Router)
- `backend/` — Express API + Socket.IO + SSE
- `start-dev.sh` — Starts MongoDB (macOS/Homebrew), backend, and frontend

## Development Guidelines

- Language/stack: TypeScript on the frontend, JavaScript on the backend
- Style: ESLint is configured; please run lints before committing
- Keep PRs focused: small, self-contained changes are easier to review
- Include UI screenshots/video for visible changes when possible

### Linting

Run from repo root:

```bash
npm run lint
```

Auto-fix:

```bash
npm run lint:fix
```

### Tests

The test suite is evolving. If you add or change behavior, please include minimal tests when feasible (unit or integration) and describe manual verification steps in the PR description.

## Branching Strategy

- Base branch: `main`
- Create topic branches from `main`:
  - `feat/<name>` for features
  - `fix/<name>` for bug fixes
  - `docs/<name>` for documentation
  - `chore/<name>` for tooling/infra
  - `refactor/<name>` for refactoring

Keep branches up to date by rebasing on the latest main:

```bash
git fetch upstream
git rebase upstream/main
```

## Commit Messages (Conventional Commits)

We prefer Conventional Commits:

- `feat: add mood trend line chart`
- `fix: handle SSE disconnect on journal page`
- `docs: expand README quickstart`
- `chore: update eslint config`
- `refactor: simplify api client`

Include scope when helpful, e.g., `feat(profile): show average mood`.

## Pull Requests

1. Ensure your branch is rebased on `main` and lints pass
2. Open a PR to `main` with a descriptive title and summary
3. Include:
   - What/why of the change
   - How to test (steps, inputs, expected outputs)
   - Screenshots/video for UI changes
   - Any follow-ups or out-of-scope items
4. Link related issues with keywords (Fixes #123)

### PR Checklist

- [ ] Code compiles and runs locally
- [ ] `npm run lint` passes (or explain lint exceptions)
- [ ] Docs updated (README/inline comments as needed)
- [ ] No secrets or large files committed

## Issue Reporting

When filing a bug report, include:

- Steps to reproduce
- Expected vs actual behavior
- Console/server logs and screenshots
- Environment (OS, browser, Node version)

For feature requests, describe the problem and proposed solution, ideally with mockups.

## Security

Please do not open public issues for security vulnerabilities. Instead, use GitHub’s "Report a vulnerability" (Security Advisories) or contact the repository owner privately. We’ll coordinate a responsible disclosure.

## Licensing

By contributing, you agree that your contributions are licensed under the repository’s license (MPL-2.0).

## Thanks

Your time and contributions help students. Thank you for making Zenly better! 💚
