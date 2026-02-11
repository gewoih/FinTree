# FinTree Agent Docs

This folder stores AI-agent context for the repository.
These documents define target state, standards, and practices, not an implementation snapshot.

## How to use
1. Start with `product.md`.
2. Open the task-specific document:
   - backend: `backend.md`
   - frontend/UI: `frontend.md`
   - auth/security: `security-auth.md`
   - deploy/infra: `deploy.md`
3. Follow `workflow.md` for execution protocol and required validation.
4. If documents conflict, use this precedence:
   - runtime system/developer instructions;
   - latest explicit user instruction;
   - `product.md`;
   - task-specific document;
   - existing code behavior.

## Documents
- `product.md`: product purpose, audience, and non-breakable invariants.
- `backend.md`: DDD boundaries, backend standards, and API stability rules.
- `frontend.md`: frontend architecture and production UI/UX standards.
- `security-auth.md`: authentication, cookie/CORS, and security guardrails.
- `deploy.md`: target deployment model, operational practices, and constraints.
- `workflow.md`: uncertainty policy, task template, mandatory checks, and failure protocol.

## Freshness principle
- Documents define target requirements for quality, extensibility, security, and UX.
- Implementation may temporarily lag behind the standard, but standards must not be lowered to match technical debt.
- Any architecture-significant decision must comply with these standards or be explicitly approved by the user.

## Clarification policy
- If estimated uncertainty is `> 0.05`, the agent must ask clarifying questions before implementation.
- This applies especially to data integrity, auth/security, migrations, and critical UX flows.
