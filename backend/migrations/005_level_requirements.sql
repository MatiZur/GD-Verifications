BEGIN;

ALTER TABLE levels
  ADD COLUMN IF NOT EXISTS game_mode VARCHAR(12) NOT NULL DEFAULT 'CLASSIC',
  ADD COLUMN IF NOT EXISTS difficulty_estimate INTEGER,
  ADD COLUMN IF NOT EXISTS minimum_hardest_aredl_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS minimum_hardest_aredl_name VARCHAR(150);

ALTER TABLE levels
  ADD CONSTRAINT levels_game_mode_valid
    CHECK (game_mode IN ('CLASSIC', 'PLATFORMER')),
  ADD CONSTRAINT levels_difficulty_estimate_valid
    CHECK (difficulty_estimate IS NULL OR difficulty_estimate BETWEEN 1 AND 10000);

CREATE INDEX IF NOT EXISTS idx_levels_public_catalog
  ON levels(status, created_at DESC);

COMMIT;
