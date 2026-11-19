BEGIN;

ALTER TABLE users
    RENAME COLUMN hardest_aredl_id TO hardest_classic_aredl_id;

ALTER TABLE users
    RENAME COLUMN hardest_aredl_name TO hardest_classic_aredl_name;

ALTER TABLE users
    ADD COLUMN hardest_platformer_aredl_id VARCHAR(50),
    ADD COLUMN hardest_platformer_aredl_name VARCHAR(150);

COMMIT;
