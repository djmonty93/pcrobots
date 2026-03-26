export const bootstrapSql = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'user'));

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id, expires_at DESC);

CREATE TABLE IF NOT EXISTS bots (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE bots ADD COLUMN IF NOT EXISTS owner_user_id TEXT REFERENCES users(id);
CREATE INDEX IF NOT EXISTS bots_owner_user_id_idx ON bots(owner_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS bot_revisions (
  id TEXT PRIMARY KEY,
  bot_id TEXT NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  language TEXT NOT NULL CHECK (language IN ('javascript', 'typescript', 'python')),
  source TEXT NOT NULL,
  version INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (bot_id, version)
);

CREATE INDEX IF NOT EXISTS bot_revisions_bot_id_idx ON bot_revisions(bot_id, version DESC);

CREATE TABLE IF NOT EXISTS arenas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE arenas ADD COLUMN IF NOT EXISTS owner_user_id TEXT REFERENCES users(id);
CREATE INDEX IF NOT EXISTS arenas_owner_user_id_idx ON arenas(owner_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS arena_revisions (
  id TEXT PRIMARY KEY,
  arena_id TEXT NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  version INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (arena_id, version)
);

CREATE INDEX IF NOT EXISTS arena_revisions_arena_id_idx ON arena_revisions(arena_id, version DESC);

CREATE TABLE IF NOT EXISTS ladders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  arena_revision_id TEXT NOT NULL REFERENCES arena_revisions(id),
  max_ticks INTEGER NOT NULL DEFAULT 200,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ladders ADD COLUMN IF NOT EXISTS owner_user_id TEXT REFERENCES users(id);
CREATE INDEX IF NOT EXISTS ladders_owner_user_id_idx ON ladders(owner_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ladder_entries (
  id TEXT PRIMARY KEY,
  ladder_id TEXT NOT NULL REFERENCES ladders(id) ON DELETE CASCADE,
  bot_revision_id TEXT NOT NULL REFERENCES bot_revisions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (ladder_id, bot_revision_id)
);

CREATE INDEX IF NOT EXISTS ladder_entries_ladder_id_idx ON ladder_entries(ladder_id, created_at ASC);

CREATE TABLE IF NOT EXISTS tournaments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  format TEXT NOT NULL,
  arena_revision_id TEXT NOT NULL REFERENCES arena_revisions(id),
  max_ticks INTEGER NOT NULL DEFAULT 200,
  seed_base INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS owner_user_id TEXT REFERENCES users(id);
CREATE INDEX IF NOT EXISTS tournaments_owner_user_id_idx ON tournaments(owner_user_id, created_at DESC);

ALTER TABLE tournaments DROP CONSTRAINT IF EXISTS tournaments_format_check;
ALTER TABLE tournaments ADD CONSTRAINT tournaments_format_check CHECK (format IN ('round-robin', 'single-elimination', 'double-elimination'));

CREATE TABLE IF NOT EXISTS tournament_entries (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  bot_revision_id TEXT NOT NULL REFERENCES bot_revisions(id),
  seed INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tournament_id, seed)
);

CREATE INDEX IF NOT EXISTS tournament_entries_tournament_id_idx ON tournament_entries(tournament_id, seed ASC);

CREATE TABLE IF NOT EXISTS tournament_rounds (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  bracket TEXT NOT NULL,
  round_number INTEGER NOT NULL,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tournament_id, bracket, round_number)
);

ALTER TABLE tournament_rounds DROP CONSTRAINT IF EXISTS tournament_rounds_bracket_check;
ALTER TABLE tournament_rounds ADD CONSTRAINT tournament_rounds_bracket_check CHECK (bracket IN ('round-robin', 'winners', 'losers', 'finals'));

CREATE INDEX IF NOT EXISTS tournament_rounds_tournament_id_idx ON tournament_rounds(tournament_id, bracket, round_number);

CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  mode TEXT NOT NULL,
  status TEXT NOT NULL,
  arena_revision_id TEXT NOT NULL REFERENCES arena_revisions(id),
  seed INTEGER NOT NULL,
  max_ticks INTEGER NOT NULL DEFAULT 200,
  error_message TEXT,
  result_json JSONB,
  events_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE matches ADD COLUMN IF NOT EXISTS owner_user_id TEXT REFERENCES users(id);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS ladder_id TEXT REFERENCES ladders(id) ON DELETE SET NULL;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS tournament_id TEXT REFERENCES tournaments(id) ON DELETE SET NULL;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS tournament_round_id TEXT REFERENCES tournament_rounds(id) ON DELETE SET NULL;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS round_slot INTEGER;
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_mode_check;
ALTER TABLE matches ADD CONSTRAINT matches_mode_check CHECK (mode IN ('live', 'queued', 'ladder', 'round-robin', 'single-elimination', 'double-elimination'));
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_status_check;
ALTER TABLE matches ADD CONSTRAINT matches_status_check CHECK (status IN ('pending', 'queued', 'running', 'completed', 'failed'));

CREATE INDEX IF NOT EXISTS matches_status_idx ON matches(status, created_at DESC);
CREATE INDEX IF NOT EXISTS matches_owner_user_id_idx ON matches(owner_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS matches_ladder_id_idx ON matches(ladder_id, created_at DESC);
CREATE INDEX IF NOT EXISTS matches_tournament_id_idx ON matches(tournament_id, created_at DESC);
CREATE INDEX IF NOT EXISTS matches_tournament_round_id_idx ON matches(tournament_round_id, created_at DESC);
CREATE INDEX IF NOT EXISTS matches_tournament_round_slot_idx ON matches(tournament_round_id, round_slot);
CREATE UNIQUE INDEX IF NOT EXISTS matches_tournament_round_slot_unique_idx ON matches(tournament_round_id, round_slot) WHERE tournament_round_id IS NOT NULL AND round_slot IS NOT NULL;

CREATE TABLE IF NOT EXISTS match_participants (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  bot_revision_id TEXT NOT NULL REFERENCES bot_revisions(id),
  team_id TEXT NOT NULL,
  slot INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (match_id, slot)
);

CREATE INDEX IF NOT EXISTS match_participants_match_id_idx ON match_participants(match_id, slot);
`;


