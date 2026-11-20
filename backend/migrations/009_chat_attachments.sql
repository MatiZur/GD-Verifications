BEGIN;

ALTER TABLE level_messages
  ALTER COLUMN message DROP NOT NULL,
  DROP CONSTRAINT IF EXISTS level_messages_message_check;

ALTER TABLE level_messages
  ADD CONSTRAINT level_messages_message_check
    CHECK (message IS NULL OR char_length(message) <= 2000),
  ADD COLUMN IF NOT EXISTS attachment_data BYTEA,
  ADD COLUMN IF NOT EXISTS attachment_mime_type TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT,
  ADD CONSTRAINT level_messages_content_check
    CHECK (NULLIF(BTRIM(message), '') IS NOT NULL OR attachment_data IS NOT NULL),
  ADD CONSTRAINT level_messages_attachment_check
    CHECK (
      (attachment_data IS NULL AND attachment_mime_type IS NULL AND attachment_name IS NULL)
      OR
      (attachment_data IS NOT NULL AND attachment_mime_type IN ('image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'))
    );

COMMIT;
