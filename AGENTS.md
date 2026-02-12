# Repository Guidelines

## Project Structure & Module Organization
This repository is a Node.js + TypeScript backend API for interview practice.

- `src/main.ts`: application entrypoint and dependency wiring.
- `src/domain/`: core entities and interfaces.
- `src/application/`: use-cases and application errors.
- `src/infrastructure/`: OpenAI adapters and in-memory persistence.
- `src/presentation/`: HTTP layer (Fastify routes and schemas).
- `scripts/generate-openapi.ts`: generates `openapi.json` from route schemas.
- `kulala.http`: ready-to-run request collection for local testing.
- `openapi.json`: generated OpenAPI spec artifact.

Keep runtime backend logic inside `src/`.

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run dev`: run API in development mode.
- `npm run build`: compile TypeScript to `dist/`.
- `npm run start`: run compiled server from `dist/main.js`.
- `npm run check`: run TypeScript checks without emit.
- `npm run openapi`: regenerate `openapi.json`.

Typical local flow:
```bash
cp .env.example .env
# set OPENAI_API_KEY in .env
npm run dev
```

## Coding Style & Naming Conventions
- Use modern ESM (`import`/`export`) and Node 18+ APIs.
- Indentation: 2 spaces; semicolons required.
- Naming: `camelCase` for variables/functions, `UPPER_SNAKE_CASE` for constants.
- Keep use-cases focused and explicit.
- Prefer clear, actionable error messages for API clients.

No formatter/linter is configured; follow existing style in `src/`.

## Testing Guidelines
There is no automated test suite yet. Until one is added:
- Run `npm run check`.
- Run `npm run openapi`.
- Smoke-test endpoints with `kulala.http` or curl.

When adding tests, place them under `tests/` with names like `sessions.create.test.ts`.

## Commit & Pull Request Guidelines
Git history is not available in this workspace, so use Conventional Commits:
- `feat: add session persistence adapter`
- `fix: enforce follow-up toggle in answer flow`

PRs should include:
- summary and rationale,
- verification steps,
- environment assumptions,
- sample request/response when behavior changes.

## Security & Configuration Tips
- Never commit `.env` or API keys.
- Add new config keys to `.env.example`.
- Validate API auth at startup and fail fast on invalid credentials.
