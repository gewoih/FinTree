# FinTree AI Agent Entry Point

This file contains only stable invariants and context navigation.
Detailed standards are stored in `docs/agent/`.

## Non-negotiable invariants
- The app is personal finance only: no cross-user analytics.
- Categories are user-owned only, with no global/system categories.
- Deleting a category must not delete transactions; they are reassigned to `"Uncategorized"`.
- Domain workflows use soft-delete, not hard-delete.
- Deleted entities must be hidden from UI and application behavior but preserved in DB for audit.
- If estimated uncertainty is `> 0.05`, the agent must ask clarifying questions before implementation.
- No guessing is allowed for requirements that impact data integrity, auth/security, migrations, or core UX flows.

## Instruction precedence (hard rule)
1. Runtime system/developer instructions from the Codex platform.
2. Latest explicit user instruction in the current thread.
3. Documents in `docs/agent/`.
4. Existing code behavior.
5. Agent assumptions.

## Where to get context
- `docs/agent/README.md`: navigation and usage rules.
- `docs/agent/product.md`: product context, goals, and invariants.
- `docs/agent/backend.md`: DDD boundaries and backend standards.
- `docs/agent/frontend.md`: frontend architecture and UI/UX standards.
- `docs/agent/security-auth.md`: auth, cookie, CORS, and security guardrails.
- `docs/agent/deploy.md`: deployment and infrastructure standards.
- `docs/agent/workflow.md`: execution protocol, mandatory checks, and failure handling.

## Maintenance rule
- If architecture, auth, deployment, or core product invariants change, update the relevant `docs/agent/*` document in the same task.

## Execution constraints
- Never run backend or frontend build/test commands unless the user explicitly asks for it in the current thread.
