BEGIN;

ALTER TABLE levels
  ADD COLUMN IF NOT EXISTS image_data BYTEA,
  ADD COLUMN IF NOT EXISTS image_mime_type VARCHAR(20);

ALTER TABLE levels
  ADD CONSTRAINT levels_image_mime_valid
    CHECK (image_mime_type IS NULL OR image_mime_type IN ('image/jpeg', 'image/webp'));

COMMIT;
