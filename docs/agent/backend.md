# Backend Target Standards

## Core goals
- Data correctness by default.
- Security by default.
- Extensibility without cascading breaking changes.
- Predictable API behavior for frontend consumers.

## DDD boundaries
- Domain layer:
  - contains business invariants, entities, and value objects;
  - has no infrastructure or transport dependencies;
  - contains no HTTP/DTO/ORM-specific concerns.
- Application layer:
  - implements use cases;
  - orchestrates repositories/services and transactional workflows;
  - depends on abstractions (for example, `IAppDbContext`) instead of infrastructure implementations;
  - contains no UI logic.
- Infrastructure layer:
  - handles persistence and integrations;
  - implements application abstractions and DI bindings;
  - does not define business invariants.
- API layer:
  - is a transport/mapping/auth boundary;
  - does not duplicate domain rules.

## Data integrity rules
- All user-data operations are scoped to the current user context.
- Deletion workflows use soft-delete unless explicitly approved otherwise.
- Referential integrity and invariants are enforced by domain logic and application checks.
- Multi-step dependent workflows must be atomic (transaction-safe).

## API contract policy
- Contracts are stable by default.
- Prefer additive changes over breaking changes.
- Breaking changes are allowed only with explicit approval.
- API errors must use a consistent machine-readable payload and unambiguous HTTP status.
- Validation errors must be user-comprehensible and UI-friendly.

## Security baseline
- Authorization is mandatory for all user-scoped endpoints.
- All input is untrusted and validated server-side.
- Do not log secrets, tokens, passwords, or raw personal data.
- Any side-effect endpoint must have explicit guard checks.
- Crypto/signature verification must use constant-time comparisons where applicable.

## Maintainability rules
- Minimize implicit side effects.
- New business logic belongs in the correct layer, not via architectural shortcuts.
- Complex rules should be documented with short local comments or in the relevant agent doc.
- Changes affecting domain invariants must be explicitly reflected in `product.md`.
