# Security & Auth Standards

## Principles
- Secure by default; reductions require approval.
- Least privilege: current-user data only.
- Defense in depth: transport, auth, validation, domain guards.

## Authentication
- JWT access token: short-lived, rotated via refresh flow.
- Refresh tokens: one-time rotation, server-revocable, stored as hashes only.
- Auth failures: deterministic, clear UI signal, no redirect loops.
- Session handling must not break public/marketing routes.

## Cookies
- Production: `Secure`, `HttpOnly`, correct `SameSite`.
- Access and refresh tokens: separate cookies, scoped paths.
- Dev may use different cookie profile with explicit logic.

## CORS
- No wildcard origins for credentialed requests.
- Explicit allowed origins per environment.

## Hardening
- Per-IP rate limiting; stricter for `/api/auth/*`.
- 429 responses: deterministic JSON, frontend-safe.
- Reverse proxy must forward real client IPs.
- Production: explicit `AllowedHosts`, no wildcard. Kestrel version header disabled.
- Subscription guard: server-side, all mutation endpoints.

## External providers (Telegram)
- Signature verification + payload expiry mandatory.
- Provider payload untrusted until server-validated.

## Logging
- Never log secrets/tokens in plain form.
- Error messages must not expose internal architecture.
