# Database Schema Outline

## Bots

- `bots`
- `bot_revisions`

Each revision stores:

- source code
- language
- revision hash
- created timestamp
- optional metadata for compile/runtime diagnostics

## Arenas

- `arenas`
- `arena_revisions`

Each revision stores:

- arena text
- parsed metadata
- validation result

## Matches

- `matches`
- `match_participants`
- `match_events`
- `replays`
- `jobs`

Important fields:

- engine version
- seed
- run mode: sync or queued
- status
- winner
- replay reference

## Ladders

- `ladders`
- `ladder_entries`
- `ladder_matches`
- `ladder_ratings`

Store both:

- win/loss metrics
- Elo-style rating

## Tournaments

- `tournaments`
- `tournament_entries`
- `tournament_rounds`
- `tournament_matches`
- `tournament_standings`

Formats in scope:

- round-robin
- single elimination
- double elimination
