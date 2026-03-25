# Architecture

## Goals

- keep gameplay mechanics faithful to the original PCRobots engine
- modernize everything around the engine: UI, deployment, persistence, replay, editing, and operations
- execute untrusted bot code under strict isolation
- support both synchronous and queued match execution
- include ladders and tournament workflows in v1

## Services

### Web

- React + TypeScript frontend
- Monaco-based bot editor
- arena editor
- replay viewer
- ladder and tournament screens

### API

- bot and revision CRUD
- arena and revision CRUD
- match creation and query APIs
- ladder and tournament APIs
- synchronous short-match execution endpoint
- replay retrieval

### Worker

- consumes queued match and tournament jobs
- launches isolated runner containers
- stores results and replay streams
- updates ladder/tournament standings

### Postgres

- durable source of truth for all user-generated state

### Redis

- queue backend
- transient job state and locks

## Execution Model

1. a bot revision is stored with source code and language metadata
2. a match request binds bot revisions, arena revision, engine version, seed, and mode
3. the API either:
   - executes immediately for short "run now" matches, or
   - enqueues a background job
4. the worker starts a simulation and one isolated runtime per bot
5. the engine advances tick-by-tick and records replay events
6. results, standings changes, and replay data are persisted

## Isolation Model

- no outbound network access from bot runners
- resource limits per bot and per match
- temporary writable directory only
- read-only root filesystem where practical
- dropped Linux capabilities
- hard timeouts and process-count limits

The initial code in this repository documents the intended contract. Enforcement is implemented in later slices.
