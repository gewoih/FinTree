# Frontend Target Standards

## Product UX goals
- The interface is understandable without training.
- Primary actions are reachable in minimal steps.
- Analytics and statuses are explainable, without visual noise.

## Architecture and state management
- UI components handle rendering and interaction, not business logic.
- Data orchestration is handled via stores/composables/service layer.
- API calls are centralized; ad-hoc requests inside page components are not allowed.
- Async states are always explicit: `loading`, `empty`, `error`, `success`.

## Type safety and contracts
- TypeScript strict-first: avoid implicit `any`.
- DTOs and UI models must be explicitly separated and mapped predictably.
- Any API contract change must be reflected in frontend types in the same task.

## UI/UX best practices
- Mobile-first: critical flows must work correctly from 360px width.
- Predictable layout: no horizontal overflow or layout jumps.
- Minimum interactive hit area: 44x44.
- Destructive actions require confirmation with clear impact messaging.
- Forms provide immediate, understandable validation in Russian.
- Visual hierarchy uses shared tokens and consistent patterns.
- Motion is functional only: indicates state changes without distraction.
- Accessibility is mandatory: semantics, focus visibility, contrast, keyboard navigation.

## Performance and scalability
- Do not block first render with heavy computation.
- Load non-critical data lazily.
- Use pagination/virtualization for large lists as data grows.
- Avoid unnecessary re-renders and expensive deep-watch usage.

## Delivery quality bar
- Any UI change must be:
  - visually consistent;
  - responsive;
  - manually testable in both happy path and failure path.
