# Repository Guidelines

## Project Structure & Module Organization
FinTree.sln ties together the backend. `FinTree.Api/` runs the ASP.NET Core host (controllers, Serilog). `FinTree.Application/` exposes use-case services over domain types in `FinTree.Domain/`. `FinTree.Infrastructure/` wires EF Core, Identity, and Telegram adapters. `FinTree.Parser/` is a CLI for bank-statement ingestion. The client sits in `vue-app/` (feature code in `src/`, static assets in `public/`, build output in `dist/`).

## Build, Test, and Development Commands
Run `dotnet restore` then `dotnet build FinTree.sln` to compile the backend. Start the API via `dotnet run --project FinTree.Api` (Swagger enabled in development). Trigger statement imports with `dotnet run --project FinTree.Parser -- <args>`. In `vue-app/`, install once with `npm install`, use `npm run dev` for hot reload, `npm run build` for production, and `npm run preview` to smoke-test the bundle.

## Coding Style & Naming Conventions
Follow standard .NET style: 4-space indentation, PascalCase for public APIs, camelCase for locals, and `Async` suffixes on awaitable methods. Keep application folders aligned to bounded contexts under `FinTree.Application`. Vue components use PascalCase filenames (e.g., `AccountSummaryCard.vue`) with `<script setup lang="ts">`, composables in `src/composables`, and services in `src/services`. Enforce formatting before commits via `npm run lint` and `npm run lint:style`.

## Testing Guidelines
Add backend tests with xUnit or NUnit beside the owning project (e.g., `FinTree.Application.Tests`). Prioritize behavioural coverage over narrow mocks. Frontend tests rely on Vitest and Vue Testing Library, bootstrapped by `src/tests/setupTests.ts`. Use `npm run test` for CI runs and `npm run test:watch` while iterating; document coverage shortfalls when they fall below roughly 80% statements.

## Commit & Pull Request Guidelines
Recent commits are the placeholder `dev`; switch to concise, imperative summaries such as `Add transaction categorization rules` and reference issue IDs when available. Pull requests should explain scope and risk, note schema changes or parser impacts, and attach UI screenshots or sample API calls. Verify `dotnet build`, `npm run build`, lint, and relevant tests before requesting review.
