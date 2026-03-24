# Bot Runtime Contract

This document defines the host-to-bot contract for interpreted languages in v1.

## Supported Languages In V1

- JavaScript
- TypeScript
- Python


TypeScript is transpiled to JavaScript before execution. Lua remains future work and is not part of the current runtime surface.

## Host Model

The worker owns the authoritative simulation clock. Bots do not run freely; they receive a turn snapshot and must return an action before the timeout.

## Runner Shape

Each bot runs inside a language-specific runner image that exposes the same logical contract:

1. receive match initialization
2. receive per-turn state snapshots
3. respond with one action
4. terminate cleanly at match end

## Proposed JSON Messages

### Init

```json
{
  "type": "init",
  "matchId": "match_123",
  "botId": "bot_alpha",
  "language": "javascript",
  "seed": 42,
  "arena": {},
  "rules": {}
}
```

### Turn

```json
{
  "type": "turn",
  "tick": 17,
  "self": {},
  "visibleState": {},
  "memory": {}
}
```

### Action

```json
{
  "type": "action",
  "action": {
    "kind": "movement",
    "targetSpeed": 50,
    "heading": 90
  }
}
```

## Security Rules

- no network
- no shelling out
- no unrestricted filesystem writes
- bounded CPU time
- bounded memory
- bounded process count
- bounded stdout/stderr

The API that bots see is a modern language-level SDK that maps back to the faithful engine actions.
