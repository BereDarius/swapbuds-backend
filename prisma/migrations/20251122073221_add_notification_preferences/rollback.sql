-- Rollback SQL for migration: 20251122073221_add_notification_preferences
-- Generated: 2025-12-17T07:28:45.251Z
--
-- This rollback was generated with schema catalog awareness.
-- Dropped columns/indexes/constraints are restored with their original definitions.
--
-- To execute: yarn migrate:rollback 20251122073221_add_notification_preferences

ALTER TABLE "notification_preferences" DROP CONSTRAINT IF EXISTS "notification_preferences_userId_fkey";

DROP INDEX IF EXISTS "notification_preferences_userId_idx";

DROP INDEX IF EXISTS "notification_preferences_userId_key";

DROP TABLE IF EXISTS "notification_preferences" CASCADE;