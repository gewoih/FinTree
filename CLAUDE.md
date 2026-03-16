- `DESIGN.md` — authoritative frontend/UI-UX specification
- `TODO.md` — stabilization backlog and known technical debt

## Project Context

- Backend: C# Web Api
- Frontend: React + Shadcn + Tailwind
- Target audience: users with low financial literacy
- Product UX baseline: clarity and predictability over cleverness

## Global Guardrails

- Do not introduce silent technical debt
- Do not run `git commit` or `git add` under any circumstances unless the user explicitly asks
- Never create, edit, delete, or regenerate EF Migrations and never run `dotnet ef migrations`
- Never run `dotnet build`, `dotnet test`, `dotnet run`, or `dotnet publish`
- When you encounter a bug, inconsistency, incorrect pattern, or technical debt while working on any task — you must either fix it in place or add a concise item to `TODO.md` immediately
- Do not write or run any tests in backend/frontend unless the user explicitly asks