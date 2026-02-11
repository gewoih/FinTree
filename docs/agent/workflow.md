# Agent Workflow Standard

## 1) Task intake template
Before coding, structure the task using this template:
- Goal: what user outcome must be achieved.
- Constraints: explicit functional/non-functional limits from user and docs.
- Acceptance criteria: observable conditions of done.
- Scope surface: backend/frontend/auth/deploy/data-migration touched.
- Risks: data loss, auth regressions, UX breakage, deployment risk.
- Unknowns: items requiring clarification.

## 2) Uncertainty threshold rule
- If estimated uncertainty is `> 0.05`, ask clarifying questions first.
- Do not invent requirements.
- For high-impact areas (data integrity, auth/security, migrations, destructive behavior), clarifications are mandatory unless the requirement is explicit.
- If the user asks to proceed with assumptions, list assumptions explicitly and keep them minimal.

## 3) Mandatory validation checks
Run checks relevant to touched scope. Do not skip silently.

- Backend changes:
  - Do not run backend restore/build/test commands.
  - Backend build/test execution is disabled by project instruction.
- Frontend changes (in `vue-app/`):
  - `npm ci`
  - `npm run build`
- Contract/auth/shared-flow changes:
  - run frontend check set only (backend checks are intentionally disabled).
- Deployment/config changes:
  - validate compose config before reporting done:
  - `docker compose config`

## 4) Failure protocol
If any mandatory check fails:
- Do not report task as complete.
- Report exact failing command(s) and first actionable error.
- Separate failure type:
  - code regression introduced by current change;
  - pre-existing project issue;
  - environment/infrastructure issue.
- Either fix within scope or ask user for direction with concrete options.

## 5) Delivery format standard
Final implementation report should always include:
- Summary of what changed.
- Exact files changed.
- Checks executed with pass/fail status.
- Known risks or follow-up actions (if any).
