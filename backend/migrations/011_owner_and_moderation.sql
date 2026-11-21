BEGIN;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
  ADD CONSTRAINT users_role_check CHECK (role IN ('USER', 'ADMIN', 'OWNER'));

INSERT INTO users (username, email, password_hash, role)
VALUES (
  'owner',
  'owner@gd-verifications.local',
  '$2b$12$mxrmBO3Cyc70jcz6SYcMuelV16Ahtc.pTkxbiLd58yoE1XFhW.YJq',
  'OWNER'
)
ON CONFLICT (username) DO UPDATE
SET role = 'OWNER';

COMMIT;
