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
- Public traffic must enter through nginx; API containers must stay internal-only on the docker network.
- nginx runtime config is static (`deploy/nginx/nginx.conf`) and copied into image as-is (no runtime templating).
- Local development also runs through nginx (`deploy/nginx/nginx.dev.conf`) to keep routing behavior close to production.

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
- nginx production startup requires existing cert files at `/etc/letsencrypt/live/fin-tree.ru/fullchain.pem` and `/etc/letsencrypt/live/fin-tree.ru/privkey.pem`.
- nginx must include default virtual hosts (`default_server`) that drop unknown hosts and direct-IP traffic.
- nginx must block known scanner signatures (for example dotfiles and legacy exploit paths) before proxying to API.
- nginx must enforce request throttling for both `/api/*` and stricter `/api/auth/*`.

## Compose runbook
- Base production stack is `compose.yaml` (no public Postgres port, secrets from environment only).
- Local development stack is standalone in `compose.dev.yaml` with nginx + API + Postgres (no certbot).
- Optional frontend hot-reload service is available in local stack via profile `hotreload`.
- Local run command: `docker compose -f compose.dev.yaml up -d`.
- Local run with hot-reload frontend: `docker compose -f compose.dev.yaml --profile hotreload up -d`.
- Production run command: `docker compose -f compose.yaml up -d`.
- Auth environment variables must include:
  - `AUTH_JWT_SECRET_KEY`
  - `AUTH_ISSUER`
  - `AUTH_AUDIENCE`
  - `AUTH_ACCESS_TOKEN_LIFETIME_MINUTES`
  - `AUTH_REFRESH_TOKEN_LIFETIME_DAYS`
- Production CORS origins must be explicit HTTPS origins for public domains (`https://fin-tree.ru`, `https://www.fin-tree.ru`).
- API host filtering must be configured through explicit `AllowedHosts` values in compose environment.
- Production deployments should set `ASPNETCORE_ALLOWED_HOSTS` explicitly to the project domains.
