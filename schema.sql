-- ============================================================
--  Discord Buddy Rotation Bot — Supabase Schema
--  Run this in your Supabase SQL Editor.
-- ============================================================

-- ── Guild Settings ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guild_settings (
  guild_id            TEXT PRIMARY KEY,
  manager_role_id     TEXT NOT NULL,
  display_channel_id  TEXT NOT NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── Rotations ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rotations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id          TEXT NOT NULL REFERENCES guild_settings(guild_id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  current_index     INTEGER NOT NULL DEFAULT 0,
  status_message_id TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rotations_guild_id_idx ON rotations(guild_id);

-- ── Buddy Pairs ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS buddy_pairs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rotation_id  UUID NOT NULL REFERENCES rotations(id) ON DELETE CASCADE,
  user1_id     TEXT NOT NULL,
  user2_id     TEXT NOT NULL,
  position     INTEGER NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (rotation_id, position)
);

CREATE INDEX IF NOT EXISTS buddy_pairs_rotation_id_idx ON buddy_pairs(rotation_id);

-- ── Completion Logs ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS completion_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rotation_id   UUID NOT NULL REFERENCES rotations(id) ON DELETE CASCADE,
  pair_position INTEGER NOT NULL,
  completed_by  TEXT,
  completed_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS completion_logs_rotation_id_idx ON completion_logs(rotation_id);

-- ── Auto-update updated_at ────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_guild_settings_updated_at
  BEFORE UPDATE ON guild_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rotations_updated_at
  BEFORE UPDATE ON rotations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();