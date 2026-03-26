# Lua Runner

This directory contains the Lua bot runner used by the platform runtime.

Runtime details:

- Lua version: `5.4`
- JSON library: vendored `rxi/json.lua`
- invocation shape: `lua runner.lua`
- input: JSON payload on stdin with `source` and `snapshot`
- output: one JSON action on stdout

Lua bot sources may either:

- `return function(snapshot) ... end`
- define `on_turn(snapshot)`
- define `onTurn(snapshot)`
