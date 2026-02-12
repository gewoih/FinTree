# Deploy and Infra Target Standards

## Deployment goals
- Reliable and repeatable deployments.
- Minimal downtime.
- Predictable recovery after failed releases.
- Environment configuration separated from source code.

## Runtime model
- Production runtime is fully containerized and reproducible via `docker compose`.
- Secrets and environment-specific values are stored outside git.
- HTTPS is mandatory for production.

## CI/CD principles
- Pipeline must be deterministic and idempotent.
- Build and deploy should be logically separated to reduce runtime server load.
- On low-resource servers, avoid heavy rebuild loops unless required.
- Migrations/updates must be safe under repeated execution.

## Release safety
- Before traffic switch, service startup must succeed without manual steps.
- Deployment failures must be quickly diagnosable from logs.
- A simple rollback path to the last stable release must exist.

## Operational guardrails
- Commands and runbooks must use a single up-to-date stack standard.
- Manual workaround flows must not become the default operating path.
- Infrastructure changes must include corresponding runbook updates.

## Compose runbook
- Base production stack is `compose.yaml` (no public Postgres port, secrets from environment only).
- Local development stack is standalone in `compose.dev.yaml` (no nginx/certbot).
- Local run command: `docker compose -f compose.dev.yaml up -d`.
- Production run command: `docker compose -f compose.yaml up -d`.
- Auth environment variables must include:
  - `AUTH_JWT_SECRET_KEY`
  - `AUTH_ISSUER`
  - `AUTH_AUDIENCE`
  - `AUTH_ACCESS_TOKEN_LIFETIME_MINUTES`
  - `AUTH_REFRESH_TOKEN_LIFETIME_DAYS`
