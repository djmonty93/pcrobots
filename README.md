# PCRobots

This repository is a modern web rebuild of the original DOS PCRobots game in [`original/`](./original), keeping the original match mechanics while moving authoring, execution, replay, ladders, and tournaments onto a web platform.

## Current Shape

- faithful deterministic simulation core in TypeScript
- web UI with bot editing, arena editing, replay playback, ladders, and tournaments
- interpreted bot languages plus uploaded Linux x64 bot binaries: JavaScript, TypeScript, Python, Lua 5.4, and Linux-native executables
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

Default seeded admin credentials:

- email: `admin@pcrobots.local`
- password: `change-me-admin-password`

Override them with `PCROBOTS_ADMIN_EMAIL` and `PCROBOTS_ADMIN_PASSWORD` before starting the API/worker stack.

Tear the stack down:

```bash
npm run compose:down
```

## Smoke Test

Run the browser UI smoke suite:

```bash
npm run browser:smoke
```

That path builds the app and runs Playwright against a deterministic mock API. It covers registration, login, bot and arena authoring, live match creation, and admin account-management flows without depending on a live Postgres/Redis stack.

If you have the full backend stack healthy and want the browser suite against the real API instead, use:

```bash
npm run browser:smoke:real
```

Once the compose stack is healthy, run the local smoke flow:

```bash
npm run local:smoke
```

The smoke script waits for the API, creates JavaScript, Lua, and Python bots plus an arena, proves synchronous API-side sandbox execution with a mixed-language live match, then creates a single-elimination tournament, enqueues it through the API, and polls until the worker finishes the tournament through the queued sandbox path.

Uploaded Linux x64 bot binaries are also supported through the main bot registry. Those bots are stored as immutable revision artifacts and executed inside the same isolated sandbox model as the interpreted runtimes.

The current smoke flow also verifies:

- admin login
- self-registration for normal users
- user-vs-user resource isolation
- admin ownership transfer
- admin deletion of a transferred account

## Current Gaps

- per-match execution now runs inside short-lived Docker runner containers with no network, read-only rootfs, dropped capabilities, no-new-privileges, pid limits, CPU limits, memory limits, and tmpfs-only scratch space
- Lua now runs through the same isolated interpreted-bot path as Python, using Lua 5.4 plus vendored `rxi/json.lua`
- uploaded Linux x64 bot binaries now run through the same isolated per-match sandbox path using the stdin/stdout JSON turn contract
- the Monaco bundle is still large and needs chunking/performance work

