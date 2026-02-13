# Deploy Standards

## Runtime model
- Fully containerized via Docker Compose. Secrets outside git.
- HTTPS mandatory in production.
- Public traffic through nginx only; API containers internal-only.
- nginx config is static (no runtime templating).
- Local dev also routes through nginx.

## Compose commands
- **Local**: `docker compose -f compose.dev.yaml up -d`
- **Local + hot-reload**: `docker compose -f compose.dev.yaml --profile hotreload up -d`
- **Production**: `docker compose -f compose.yaml up -d`

## Required env vars
AUTH_JWT_SECRET_KEY, AUTH_ISSUER, AUTH_AUDIENCE, AUTH_ACCESS_TOKEN_LIFETIME_MINUTES, AUTH_REFRESH_TOKEN_LIFETIME_DAYS

## Production rules
- CORS: explicit HTTPS origins (https://fin-tree.ru, https://www.fin-tree.ru).
- AllowedHosts: explicit hostnames, no wildcard.
- nginx requires certs at `/etc/letsencrypt/live/fin-tree.ru/`.
- nginx: default_server drops unknown hosts/direct-IP.
- nginx: block scanner signatures before proxy.
- nginx: rate limiting for /api/* and stricter /api/auth/*.

## CI/CD
- Pipeline: deterministic, idempotent.
- Build and deploy logically separated.
- Migrations must be safe under repeated execution.
- Rollback path to last stable release must exist.
