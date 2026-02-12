# Interview Coach Backend API

Backend service for interview-practice sessions (question flow, optional follow-ups, answer submission, and final feedback JSON).

## Tech

- Node.js 18+
- TypeScript
- Fastify
- OpenAI API

## Project Structure

- `src/domain`: entities and interfaces
- `src/application`: use-cases
- `src/infrastructure`: OpenAI adapters and in-memory repository
- `src/presentation`: HTTP server/routes
- `openapi.json`: generated OpenAPI spec
- `kulala.http`: request collection for Kulala
- `scripts/generate-openapi.ts`: OpenAPI generator

## Setup

```bash
npm install
cp .env.example .env
# set OPENAI_API_KEY in .env
```

## Environment

- `OPENAI_API_KEY` (required)
- `BACKEND_HOST` (default: `0.0.0.0`)
- `BACKEND_PORT` (default: `3000`)
- `COACH_MODEL` (default: `gpt-4.1-mini`)
- `COACH_STT_MODEL` (default: `gpt-4o-mini-transcribe`)

## Run

```bash
npm run dev
```

## Build

```bash
npm run build
npm run start
```

## Validation

```bash
npm run check
npm run openapi
```

## API Docs

- Swagger UI: `GET /docs`
- OpenAPI JSON: `GET /openapi.json`
- Generated file: `openapi.json`

## Main Endpoints

- `POST /sessions`
- `GET /sessions/:sessionId/question`
- `POST /sessions/:sessionId/answer`
- `GET /sessions/:sessionId/result`
- `GET /health`

## Example

Start session without follow-ups (stops at exact question count):

```bash
curl -X POST http://localhost:3000/sessions \
  -H 'content-type: application/json' \
  -d '{"questionCount":2,"allowFollowUps":false}'
```
