# FinTree — TODO (Frontend Stabilization)

This backlog reflects the frontend audit (February 2026).
Goal: remove systemic causes of UI bugs, inconsistency, and high maintenance cost.

---

## P1 — Critical (Do First)

### No tasks

---

## P2 — Important Improvements (After P1)

### 8) Complete localization consistency (end-user UI Russian-only)

- [ ] Align route titles and user-facing error messages with Russian UI policy.
- [ ] Add lint/check to prevent new unintended English UI strings (except technical identifiers).

Why:
- Mixed RU/EN copy reduces product coherence.

---

### 9) Unify auth networking path

- [ ] Move `auth` store from direct `axios` calls to shared `apiClient`/`apiService` contract.
- [ ] Reuse one interceptor policy for refresh/redirect/error behavior.

Why:
- Multiple HTTP paths produce inconsistent behavior for 401/error scenarios.

---

### 10) Add minimal frontend smoke tests

- [ ] Add smoke coverage for critical user flows:
  - sign in / sign out
  - create transaction
  - list filtering
  - baseline analytics states

Why:
- There is currently no automated behavioral safety net for UI refactors.

---

## Priority Rule

1. Complete P1 first (architecture, style ownership, validation, CI).
2. Then complete P2 (decomposition, tokens, localization, tests).
3. Any new feature work must follow updated `CLAUDE.md` and `DESIGN.md`.
