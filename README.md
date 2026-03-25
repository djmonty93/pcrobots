# PCRobots

This repository is a modern web rebuild of the original DOS PCRobots game in [`original/`](./original), keeping the original match mechanics while moving authoring, execution, replay, ladders, and tournaments onto a web platform.

## Current Shape

- faithful deterministic simulation core in TypeScript
- web UI with bot editing, arena editing, replay playback, ladders, and tournaments
- interpreted bot languages first: JavaScript, TypeScript, Python
- API + worker + Postgres + Redis backend
- local deployment with Docker Compose

## Workspace Layout

- `apps/web`: React/Vite frontend
- `apps/api`: HTTP API
- `apps/worker`: BullMQ worker and match orchestration
- `packages/engine`: deterministic simulation core
- `packages/bot-sdk`: bot language/runtime contracts
- `packages/platform`: persistence, queue, competitions, and shared backend logic
- `packages/replay-format`: replay types
- `packages/ui`: shared UI package
- `docs/`: architecture and specifications
- `docker/`: service Dockerfiles
- `runners/`: per-language runner implementations
- `scripts/`: local smoke tooling
- `original/`: original DOS source snapshot

## Local Development

Install dependencies:

```bash
npm ci
```

Validate the monorepo:

```bash
npm run check
npm run build
npm test
```

Run individual services outside Docker:

```bash
npm run dev:api
npm run dev:worker
npm run dev:web
```

## Docker Compose

Bring the local stack up:

```bash
npm run compose:up
```

Services:

- web: `http://localhost:3000`
- api: `http://localhost:3001`
- postgres: `localhost:5432`
- redis: `localhost:6379`

Tear the stack down:

```bash
npm run compose:down
```

## Smoke Test

Once the compose stack is healthy, run the local smoke flow:

```bash
npm run local:smoke
```

The smoke script waits for the API, creates JavaScript and Python bots plus an arena, proves synchronous API-side sandbox execution with a mixed-language live match, then creates a single-elimination tournament, enqueues it through the API, and polls until the worker finishes the tournament through the queued sandbox path.

## Current Gaps

- per-match execution now runs inside short-lived Docker runner containers with no network, read-only rootfs, dropped capabilities, no-new-privileges, pid limits, CPU limits, memory limits, and tmpfs-only scratch space
- Lua remains future work and is not exposed in the current UI/API surface
- the Monaco bundle is still large and needs chunking/performance work

