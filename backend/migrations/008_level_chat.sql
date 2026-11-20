BEGIN;

CREATE TABLE IF NOT EXISTS level_messages (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  level_id BIGINT NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
  sender_id BIGINT NOT NULL REFERENCES users(id),
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_level_messages_level_created
  ON level_messages(level_id, created_at, id);

COMMIT;
