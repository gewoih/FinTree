# Product Context

## Mission
FinTree helps people control personal finances without complex tooling: fast transaction capture and clear analytics that support practical behavior change.

## Target audience
- Regular users, not professional analysts.
- Users who need understandable metrics and simple flows instead of deep instrument-level accounting.

## Problems the product solves
- Loss of spending control due to inconsistent tracking.
- Poor visibility into spending structure and financial trajectory.
- Mixing liquid cash and investments without a clear picture.

## Product principles
- Simplicity over feature bloat.
- Analytics must be explainable and actionable.
- UX must be predictable, with no hidden critical actions.
- Default user-facing language is Russian unless explicitly changed by the user.

## Confirmed scope boundaries
- No cross-user analytics and no plan to add it.
- No mandatory dependency on bank integrations.
- Investment module is high-level, without mandatory instrument-level accounting.

## Core data invariants
- Categories are user-owned only.
- Deleting a category preserves transactions and reassigns them to `"Uncategorized"`.
- Domain workflows use soft-delete, not hard-delete.
- Deleted entities must not participate in user-facing behavior.
- Accounts support archive/unarchive: archived accounts are hidden from active operational flows, unavailable for new operations, and can be restored.
- Account archiving must preserve historical transactions and analytics continuity.
- New users receive a 1-month free subscription trial.
- If subscription is inactive, product behavior is read-only: viewing is allowed, any write operation must be blocked (web and Telegram).
- Active subscription provides full product access without feature restrictions.
- Subscription catalog baseline: month `390 RUB`, year `3900 RUB`.
- Subscription payment history is append-only and stored for all users for future analytics.

## Confirmed IA/navigation decisions
- Default authenticated page is `/analytics`.
- Dashboard is removed as a standalone module.
- Income plan is removed.
- Category management lives in profile/settings.
- User popup menu contains only `Settings` and `Logout`.
