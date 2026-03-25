# Engine Spec

This is the working specification for the modern engine. The goal is fidelity to the original rules in [`original/`](../original), with modernization limited to presentation and platform concerns.

## Mechanical Fidelity

The engine should preserve:

- 100x100 arena grid
- internal movement coordinates using 1000 units per cell
- original tick-based progression
- original terrain semantics
- original robot stat configuration budget
- team starts, HQ support, communications, obstacles, shells, invisibility, and scoring

## Modernization Boundaries

Allowed modernization:

- JSON/event based replay format
- browser UI and richer visuals
- named APIs instead of DOS interrupts at the platform boundary
- sandboxed interpreted runtimes instead of direct DOS task loading
- durable persistence and job orchestration

Not allowed:

- changing win conditions casually
- changing arena semantics
- changing the stat budget without an explicit game-mode switch
- changing movement units or timing because it is more convenient for the UI

## Arena Semantics

Based on the original source:

- `.` free
- `X` wall
- `S` slow square
- `D` damage square
- `R` refuel square
- `*` movable obstacle
- `A`, `B`, `C` team starts

Team start markers identify placement squares but otherwise behave like free cells.

## Core Constants To Preserve

- arena size: `100 x 100`
- internal units per cell: `1000`
- shells per robot in flight: `7`
- reload time: `50 ticks`
- scan max resolution: `45`
- battery start: `1000 * battery_realunit`
- battery charge per tick: `4 * battery_realunit`

## Implementation Notes

The engine package is responsible for:

- deterministic state transitions
- seeded random placement where required
- event generation for replay
- zero knowledge of browsers, databases, or queues

The engine package is not responsible for:

- sandboxing
- persistence
- HTTP
- frontend rendering

## Validation Strategy

- encode source-derived constants in tests
- build fixture arenas and robot placements from the original source
- compare event and state outcomes for targeted scenarios while porting mechanics
