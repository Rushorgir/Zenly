# Agent Logs — Format and location

Location
- Per-session logs live in `docs/agent-logs/` and should use the filename pattern: `YYYY-MM-DD-HHMM-<summary-slug>.md`.

Format
- Use the `docs/agent-logs/session-template.md` as a template. Required fields: Summary, Branch, Timestamp, Files changed, Commands run, Results, Issues found, Fixes attempted, Unresolved risks, Lessons.

Purpose
- These logs are the canonical chronological record agents use to extract lessons and update memory.

Privacy
- Do not include secrets or raw `.env` values in logs.
