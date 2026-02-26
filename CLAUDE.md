- `DESIGN.md` — authoritative frontend/UI-UX specification
- `TODO.md` — stabilization backlog and known technical debt

---

## Project Context

- Backend: .NET (Clean Architecture/DDD)
- Frontend: Vue 3 + TypeScript + PrimeVue (styled, token-driven preset)
- Target audience: users with low financial literacy
- Product UX baseline: clarity and predictability over cleverness

---

## Global Guardrails

- Keep changes scoped to the task
- Do not introduce silent technical debt. If debt is unavoidable, add a concise item to `TODO.md` in the same task.
- Do not run `git commit` or `git add` under any circumstances unless the user explicitly asks
- Never create, edit, delete, or regenerate EF Migrations and never run `dotnet ef migrations`
- Never run `dotnet build`, `dotnet test`, `dotnet run`, or `dotnet publish`
- When you encounter a bug, inconsistency, incorrect pattern, or technical debt while working on any task — you must either fix it in place (if it is small and low-risk) or add a concise item to `TODO.md` immediately. Silently passing over a known problem is not allowed.