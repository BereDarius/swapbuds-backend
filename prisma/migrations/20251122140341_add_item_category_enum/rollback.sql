-- Rollback SQL for migration: 20251122140341_add_item_category_enum
-- Generated: 2025-12-17T07:28:45.255Z
--
-- This rollback was generated with schema catalog awareness.
-- Dropped columns/indexes/constraints are restored with their original definitions.
--
-- To execute: yarn migrate:rollback 20251122140341_add_item_category_enum

-- Restore previous column type
ALTER TABLE "items" ALTER COLUMN "category" TYPE TEXT NOT NULL;

DROP TYPE IF EXISTS "ItemCategory";