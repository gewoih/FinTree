# FinTree Claude Entry Point

## Context imports
@AGENTS.md
@docs/agent/README.md
@docs/agent/product.md
@docs/agent/backend.md
@docs/agent/frontend.md
@docs/agent/security-auth.md
@docs/agent/deploy.md
@docs/agent/workflow.md

## Operating rules
- Follow instruction precedence from `AGENTS.md` exactly.
- Before coding, structure work as: Goal, Constraints, Acceptance criteria, Scope surface, Risks, Unknowns.
- If estimated uncertainty is greater than `0.05`, ask clarifying questions before implementation.
- Do not invent requirements for data integrity, auth/security, migrations, destructive behavior, or core UX flows.
- Keep diffs minimal and scoped to the requested task.
- Never revert or rewrite unrelated user changes.

## Product invariants (hard)
- FinTree is personal finance only; no cross-user analytics behavior.
- Categories are user-owned only; no global/system categories.
- Deleting a category must not delete transactions; reassign them to `Uncategorized`.
- Domain delete workflows are soft-delete, not hard-delete.
- Deleted entities must be hidden from UI and app behavior but preserved in DB for audit.

## Execution constraints
- Do not run backend or frontend build/test commands unless the user explicitly requests it in the current thread.
- For deployment/config changes, validate compose configuration before completion using `docker compose config`.
- If architecture, auth, deployment, or core product invariants change, update relevant files in `docs/agent/` in the same task.

## Delivery standard
- Report: summary of changes, exact files changed, checks executed with pass/fail status, and known risks/follow-ups.
