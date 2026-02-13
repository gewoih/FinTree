# Security and Auth Target Standards

## Security principles
- Secure by default: any reduction in safeguards requires explicit approval.
- Least privilege: access only to current-user data.
- Defense in depth: transport, auth, validation, and domain guards.

## Authentication model
- Auth behavior must be consistent across clients and endpoint flows.
- Session handling must not break public pages or marketing routes.
- Auth failures must be deterministic: clear UI signal, no redirect loops.
- JWT access token must be short-lived and rotated via refresh-token flow.
- Refresh tokens must be one-time (rotation on refresh) and server-revocable.

## Cookie and session rules
- For production (HTTPS): `Secure=true`, `HttpOnly=true`, and a correct `SameSite` policy for the chosen model.
- Local/dev may use a separate cookie profile.
- Cookie behavior must not rely on implicit environment magic without explicit logic and validation.
- Access-token cookie and refresh-token cookie must be split (different names, scoped paths).
- Refresh tokens must not be stored in plain form in DB; only token hashes are allowed.

## CORS rules
- Wildcard origins are forbidden for credentialed requests.
- Only explicit allowed origins are permitted per environment.
- CORS configuration must be reproducible across environments.

## Request hardening rules
- API must enforce per-IP rate limiting with stricter limits for `/api/auth/*` than for general `/api/*` routes.
- Rate limit rejections must return deterministic `429` JSON payloads safe for frontend handling.
- Reverse-proxy deployments must pass and validate forwarded headers so limits are applied to client IPs, not proxy container IPs.
- `AllowedHosts` must use explicit hostnames in production; wildcard host allowance is forbidden.
- Kestrel server version header must be disabled in production.
- Subscription access guard must be enforced server-side for all mutation endpoints; inactive subscription allows read-only access only.

## External identity providers (Telegram and others)
- Signature verification and payload expiry checks are mandatory.
- External login must map safely to the internal user model without breaking invariants.
- Provider payload is untrusted until server-side validation passes.

## Data protection and logging
- Never store or log secrets/tokens in plain form.
- Security logs must be diagnostic but must not leak sensitive data.
- External error messages must stay safe and not expose internal architecture.
