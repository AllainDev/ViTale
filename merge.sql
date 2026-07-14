UPDATE characters SET "ProductId" = product_id WHERE "ProductId" IS NULL;
ALTER TABLE characters DROP COLUMN product_id CASCADE;
