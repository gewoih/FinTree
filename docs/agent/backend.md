# Backend Standards

## DDD layers
- **Domain**: business invariants, entities, value objects. No infra/transport deps.
- **Application**: use cases, orchestration, transactional workflows. Depends on abstractions.
- **Infrastructure**: persistence, integrations, DI. No business rules.
- **API**: transport/mapping/auth boundary. No domain rule duplication.

## Data integrity
- All operations scoped to current user.
- Soft-delete unless explicitly approved.
- Multi-step workflows must be atomic.

## API contracts
- Stable by default; prefer additive changes.
- Breaking changes require explicit approval.
- Errors: consistent machine-readable payload, unambiguous HTTP status.
- Validation errors must be UI-friendly.

## Code quality
- Minimize implicit side effects.
- New logic in the correct DDD layer.
- Domain invariant changes must update product.md.
