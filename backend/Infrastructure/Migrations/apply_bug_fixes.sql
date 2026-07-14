-- ====================================================================
-- ViTale — manual apply script for bug 4 fixes (MSS/2026-07-14)
--
-- Use this when `dotnet ef database update` cannot reach Postgres
-- (e.g. when DB_CONNECTION_STRING points to a user / password that the
-- dev environment does not know about).
--
-- Steps:
--   1. Set PSQL env vars:
--        $env:PGPASSWORD = 'your_password'
--   2. Connect to the dev DB:
--        psql -h localhost -U postgres -d vitale_db -v ON_ERROR_STOP=1 -f apply_bug_fixes.sql
--   3. The script wraps everything in a single transaction so a failure
--      rolls back the whole set.
-- ====================================================================

BEGIN;

-- -- 1. Apply the EF migration (TightenRelationsAndFptHani) ---------------
-- This block is byte-for-byte equal to
-- `Infrastructure\Migrations/20260713192414_TightenRelationsAndFptHani.sql`
ALTER TABLE products ADD image_url text;

ALTER TABLE characters ADD "ProductId" uuid;

CREATE INDEX "IX_user_stamps_checkpoint_id" ON user_stamps (checkpoint_id);

CREATE INDEX "IX_user_badges_badge_id" ON user_badges (badge_id);

CREATE INDEX idx_products_type_region ON products (product_type, region);

CREATE INDEX "IX_checkin_records_doll_token_id" ON checkin_records (doll_token_id);

CREATE INDEX "IX_characters_ProductId" ON characters ("ProductId");

ALTER TABLE characters ADD CONSTRAINT "FK_characters_products_ProductId"
    FOREIGN KEY ("ProductId") REFERENCES products (id) ON DELETE SET NULL;

ALTER TABLE checkin_records ADD CONSTRAINT "FK_checkin_records_doll_tokens_doll_token_id"
    FOREIGN KEY (doll_token_id) REFERENCES doll_tokens (id) ON DELETE SET NULL;

ALTER TABLE doll_tokens ADD CONSTRAINT "FK_doll_tokens_products_doll_id"
    FOREIGN KEY (doll_id) REFERENCES products (id) ON DELETE RESTRICT;

ALTER TABLE user_badges ADD CONSTRAINT "FK_user_badges_badges_badge_id"
    FOREIGN KEY (badge_id) REFERENCES badges (id) ON DELETE CASCADE;

ALTER TABLE user_stamps ADD CONSTRAINT "FK_user_stamps_checkpoints_checkpoint_id"
    FOREIGN KEY (checkpoint_id) REFERENCES checkpoints (id) ON DELETE RESTRICT;

-- Mark migration as applied so subsequent `dotnet ef database update`
-- does not try to re-apply it.
INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260713192414_TightenRelationsAndFptHanoi', '9.0.6')
ON CONFLICT ("MigrationId") DO NOTHING;


-- -- 2. Apply bug 4 seed update -------------------------------------------
-- Remove the legacy "Home" and "School" regions — only Hà Nội remains,
-- plus the new "Trường ĐH FPT" checkpoint inside Hà Nội using the same
-- coordinates the FPT region used previously.

DELETE FROM checkpoints
 WHERE region IN ('Home', 'School')
    OR name = 'Nhà của bạn';

-- Drop the 10 "Trường học Test N" rows seeded by ID prefix 55555555-…
DELETE FROM checkpoints
 WHERE id::text LIKE '55555555-0000-0000-0000-%';

-- Migrate all 15 historical checkpoints to use the Vietnamese label
-- "Hà Nội" so the frontend PassportView shows a single, clean region tab.
UPDATE checkpoints
   SET region = 'Hà Nội'
 WHERE region = 'Ha Noi'
   AND id <> '44444444-0000-0000-0000-000000000002';

-- Insert the "Trường ĐH FPT" checkpoint (re-uses the old School ID so
-- any QR tokens that referenced it keep working).
INSERT INTO checkpoints
    (id, name, latitude, longitude, radius, story_chapter_id, region, is_active, created_at)
VALUES
    ('44444444-0000-0000-0000-000000000002',
     'Trường ĐH FPT',
     21.022320622035508,
     105.52057995771676,
     500,
     NULL,
     'Hà Nội',
     true,
     NOW())
ON CONFLICT (id) DO UPDATE SET
    name      = EXCLUDED.name,
    latitude  = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    radius    = EXCLUDED.radius,
    region    = EXCLUDED.region;

COMMIT;
