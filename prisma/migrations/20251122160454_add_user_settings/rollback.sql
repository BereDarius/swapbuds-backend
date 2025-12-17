-- Rollback SQL for migration: 20251122160454_add_user_settings
-- Generated: 2025-12-17T07:28:45.260Z
--
-- This rollback was generated with schema catalog awareness.
-- Dropped columns/indexes/constraints are restored with their original definitions.
--
-- To execute: yarn migrate:rollback 20251122160454_add_user_settings

ALTER TABLE "user_settings" DROP CONSTRAINT IF EXISTS "user_settings_userId_fkey";

DROP INDEX IF EXISTS "user_settings_userId_idx";

DROP INDEX IF EXISTS "user_settings_userId_key";

DROP TABLE IF EXISTS "user_settings" CASCADE;

DROP TYPE IF EXISTS "Language";

DROP TYPE IF EXISTS "Theme";