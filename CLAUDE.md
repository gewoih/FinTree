# CLAUDE.md

Global AI agent contract for this repository.

References:
- `DESIGN.md` — authoritative frontend/UI-UX specification and frontend Definition of Done
- `TODO.md` — stabilization backlog and known technical debt

---

## Project Context

- Backend: .NET (Clean Architecture/DDD)
- Frontend: Vue 3 + TypeScript + PrimeVue (styled, token-driven preset)
- Target audience: users with low financial literacy
- Product UX baseline: clarity and predictability over cleverness

---

## Source-of-Truth Contract

- This file owns global project context and repository-wide agent guardrails.
- `DESIGN.md` owns frontend rules for `vue-app/**`, including:
  - UI/UX behavior
  - design system and styling constraints
  - accessibility and responsive requirements
  - localization UX rules
  - frontend completion gates
- If a frontend rule in this file conflicts with `DESIGN.md`, `DESIGN.md` takes precedence.

---

## Global Guardrails

- Keep changes scoped to the task. Avoid opportunistic refactors outside scope.
- Do not introduce silent technical debt. If debt is unavoidable, add a concise item to `TODO.md` in the same task.
- Do not claim completion without running required verification commands for the touched scope.
- For any work under `vue-app/**`, use the canonical frontend checklist in `DESIGN.md` instead of duplicating command lists.
- For PrimeVue visuals under `vue-app/**`, keep state theming (`hover`/`focus`/`invalid`/`active`) centralized in the styled preset, wrappers, or shared contracts; avoid per-feature visual overrides.
- **Never commit.** Do not run `git commit` or `git add` under any circumstances unless the user explicitly asks for a commit in that moment. This applies even if a plan file or skill instructs you to commit.
- **Migration approval gate.** Never create, edit, delete, or regenerate files under `FinTree.Infrastructure/Migrations/**` and never run `dotnet ef migrations` commands unless the user explicitly approves migration work in that turn.
- **No .NET build commands.** Never run `dotnet build`, `dotnet test`, `dotnet run`, or `dotnet publish` unless the user explicitly asks for that command in that turn.
- **CSS blast radius rule.** Before editing any CSS, identify every file that contains styles for the component you are changing. If that list has more than one file, co-locate all styles into the component file first, then make the visual change. Never edit a shared CSS file to fix a specific component's appearance.
- **Never ignore problems.** When you encounter a bug, inconsistency, incorrect pattern, or technical debt while working on any task — you must either fix it in place (if it is small and low-risk) or add a concise item to `TODO.md` immediately. Silently passing over a known problem is not allowed.

---

## Completion Policy

- A task is complete only when all required checks for its scope pass.
- Frontend checks are defined once in `DESIGN.md` and must not be duplicated in other instruction files.
