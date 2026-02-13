# FinTree

Personal finance app: Telegram bot for transaction capture + Vue web app for analytics.
Russian-language UI. Tech: .NET 8 API, Vue 3 + TypeScript frontend, PostgreSQL, Docker Compose.

## Hard invariants
- Personal finance only; no cross-user analytics.
- Categories are user-owned; no global/system categories.
- Deleting a category reassigns its transactions to "Uncategorized".
- Soft-delete only; deleted entities hidden from UI but preserved in DB.
- Accounts support archive/unarchive with full history preservation.
- New users get 1-month free trial. Inactive subscription = read-only.
- Subscription catalog: month 390₽, year 3900₽.

## Instruction precedence
1. Explicit user instruction in current thread.
2. This file and docs/agent/*.
3. Existing code behavior.
4. Agent assumptions (last resort).

## Before coding
- If uncertainty > 0.05: ask before implementing.
- No inventing requirements for data integrity, auth, migrations, or core UX.
- Structure: Goal → Constraints → Acceptance criteria → Scope → Risks.
- Keep diffs minimal. Never revert unrelated user changes.

## Execution constraints
- Do NOT run build/test commands unless user explicitly asks.
- For deploy/config changes: validate with `docker compose config`.
- If architecture or invariants change: update relevant docs/agent/ file.

## Domain standards
Read the relevant file in `docs/agent/` before domain-specific work:
- product.md — scope boundaries, navigation, subscription rules
- backend.md — DDD layers, API contracts, data integrity
- frontend.md — architecture, tokens, UI/UX standards
- security-auth.md — auth model, cookies, CORS, hardening
- deploy.md — Docker, nginx, compose commands, cert setup

## Delivery
Report: summary, files changed, checks run (pass/fail), risks/follow-ups.
