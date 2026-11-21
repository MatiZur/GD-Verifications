-- Esquema completo e idempotente. La API lo aplica al iniciar sin borrar datos.
-- Las columnas incrementales se agregan con IF NOT EXISTS; no se usa una cadena de migraciones.

BEGIN;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username VARCHAR(30) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  avatar_url TEXT,
  role VARCHAR(20) NOT NULL DEFAULT 'USER'
    CHECK (role IN ('USER', 'ADMIN', 'OWNER')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  display_name VARCHAR(50),
  gd_username VARCHAR(50),
  hardest_classic_aredl_id VARCHAR(50),
  hardest_classic_aredl_name VARCHAR(150),
  hardest_platformer_aredl_id VARCHAR(50),
  hardest_platformer_aredl_name VARCHAR(150),
  bio VARCHAR(500),
  youtube_url TEXT,
  discord_username VARCHAR(32),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pronouns VARCHAR(40),
  country VARCHAR(80),
  banned_at TIMESTAMPTZ,
  ban_until TIMESTAMPTZ,
  ban_reason TEXT
);

CREATE TABLE IF NOT EXISTS levels (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  creator_id BIGINT NOT NULL REFERENCES users(id),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  gd_level_id VARCHAR(30),
  difficulty VARCHAR(30),
  showcase_url TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING_REVIEW'
    CHECK (status IN (
      'PENDING_REVIEW', 'AVAILABLE', 'IN_PROGRESS',
      'VERIFIED', 'REJECTED', 'CANCELLED'
    )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  game_mode VARCHAR(12) NOT NULL DEFAULT 'CLASSIC'
    CHECK (game_mode IN ('CLASSIC', 'PLATFORMER')),
  difficulty_estimate INTEGER
    CHECK (difficulty_estimate IS NULL OR difficulty_estimate BETWEEN 1 AND 10000),
  minimum_hardest_aredl_id VARCHAR(50),
  minimum_hardest_aredl_name VARCHAR(150),
  image_data BYTEA,
  image_mime_type VARCHAR(20)
    CHECK (image_mime_type IS NULL OR image_mime_type IN ('image/jpeg', 'image/webp')),
  applications_open BOOLEAN NOT NULL DEFAULT FALSE,
  open_verification BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS applications (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  level_id BIGINT NOT NULL REFERENCES levels(id),
  verifier_id BIGINT NOT NULL REFERENCES users(id),
  message TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (level_id, verifier_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  title VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(30) NOT NULL,
  related_level_id BIGINT REFERENCES levels(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS verification_submissions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  level_id BIGINT NOT NULL REFERENCES levels(id),
  verifier_id BIGINT NOT NULL REFERENCES users(id),
  video_url TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  admin_comment TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  public_level_id VARCHAR(30)
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_until TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason TEXT;
ALTER TABLE levels ADD COLUMN IF NOT EXISTS open_verification BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE verification_submissions ADD COLUMN IF NOT EXISTS public_level_id VARCHAR(30);

CREATE TABLE IF NOT EXISTS temporary_level_ban_snapshots (
  level_id BIGINT PRIMARY KEY REFERENCES levels(id) ON DELETE CASCADE,
  previous_status VARCHAR(30) NOT NULL,
  previous_applications_open BOOLEAN NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_reports (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  level_id BIGINT NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
  reporter_id BIGINT NOT NULL REFERENCES users(id),
  reported_user_id BIGINT NOT NULL REFERENCES users(id),
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'DISMISSED', 'ACTIONED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_by BIGINT REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  ban_until TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS admin_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  admin_id BIGINT NOT NULL REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(30) NOT NULL,
  target_id BIGINT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS level_messages (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  level_id BIGINT NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
  sender_id BIGINT NOT NULL REFERENCES users(id),
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attachment_data BYTEA,
  attachment_mime_type TEXT,
  attachment_name TEXT,
  CONSTRAINT level_messages_message_check
    CHECK (message IS NULL OR char_length(message) <= 2000),
  CONSTRAINT level_messages_content_check
    CHECK (NULLIF(BTRIM(message), '') IS NOT NULL OR attachment_data IS NOT NULL),
  CONSTRAINT level_messages_attachment_check
    CHECK (
      (attachment_data IS NULL AND attachment_mime_type IS NULL AND attachment_name IS NULL)
      OR
      (attachment_data IS NOT NULL AND attachment_mime_type IN (
        'image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'
      ))
    )
);

CREATE INDEX IF NOT EXISTS idx_levels_status ON levels(status);
CREATE INDEX IF NOT EXISTS idx_levels_creator ON levels(creator_id);
CREATE INDEX IF NOT EXISTS idx_levels_public_catalog ON levels(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_level ON applications(level_id);
CREATE INDEX IF NOT EXISTS idx_applications_verifier ON applications(verifier_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_level_messages_level_created
  ON level_messages(level_id, created_at, id);
CREATE INDEX IF NOT EXISTS idx_verification_submissions_pending
  ON verification_submissions(status, submitted_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_verification_one_pending_per_level
  ON verification_submissions(level_id) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_chat_reports_status_created
  ON chat_reports(status, created_at DESC);

INSERT INTO users (username, email, password_hash, role)
VALUES (
  'owner',
  'owner@gd-verifications.local',
  '$2b$12$mxrmBO3Cyc70jcz6SYcMuelV16Ahtc.pTkxbiLd58yoE1XFhW.YJq',
  'OWNER'
)
ON CONFLICT (username) DO NOTHING;

COMMIT;
