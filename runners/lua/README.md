# Lua Runner

The bot SDK exposes a `loadLuaBot(...)` entry point, but the local development environment does not yet include a Lua runtime.

Planned shape:

- a subprocess-based Lua runner script mirroring `runners/python/runner.py`
- JSON snapshot via stdin
- JSON action via stdout
- execution inside the future containerized runner image
