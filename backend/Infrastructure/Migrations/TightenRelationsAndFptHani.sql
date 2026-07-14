START TRANSACTION;
ALTER TABLE products ADD image_url text;

ALTER TABLE characters ADD "ProductId" uuid;

CREATE INDEX "IX_user_stamps_checkpoint_id" ON user_stamps (checkpoint_id);

CREATE INDEX "IX_user_badges_badge_id" ON user_badges (badge_id);

CREATE INDEX idx_products_type_region ON products (product_type, region);

CREATE INDEX "IX_checkin_records_doll_token_id" ON checkin_records (doll_token_id);

CREATE INDEX "IX_characters_ProductId" ON characters ("ProductId");

ALTER TABLE characters ADD CONSTRAINT "FK_characters_products_ProductId" FOREIGN KEY ("ProductId") REFERENCES products (id) ON DELETE SET NULL;

ALTER TABLE checkin_records ADD CONSTRAINT "FK_checkin_records_doll_tokens_doll_token_id" FOREIGN KEY (doll_token_id) REFERENCES doll_tokens (id) ON DELETE SET NULL;

ALTER TABLE doll_tokens ADD CONSTRAINT "FK_doll_tokens_products_doll_id" FOREIGN KEY (doll_id) REFERENCES products (id) ON DELETE RESTRICT;

ALTER TABLE user_badges ADD CONSTRAINT "FK_user_badges_badges_badge_id" FOREIGN KEY (badge_id) REFERENCES badges (id) ON DELETE CASCADE;

ALTER TABLE user_stamps ADD CONSTRAINT "FK_user_stamps_checkpoints_checkpoint_id" FOREIGN KEY (checkpoint_id) REFERENCES checkpoints (id) ON DELETE RESTRICT;

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260713192414_TightenRelationsAndFptHanoi', '9.0.6');

COMMIT;

