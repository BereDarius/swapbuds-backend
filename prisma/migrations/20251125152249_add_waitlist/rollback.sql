-- Rollback SQL for migration: 20251125152249_add_waitlist
-- Generated: 2025-12-17T07:28:45.273Z
--
-- This rollback was generated with schema catalog awareness.
-- Dropped columns/indexes/constraints are restored with their original definitions.
--
-- To execute: yarn migrate:rollback 20251125152249_add_waitlist

DROP INDEX IF EXISTS "waitlist_notified_idx";

DROP INDEX IF EXISTS "waitlist_createdAt_idx";

DROP INDEX IF EXISTS "waitlist_email_idx";

DROP INDEX IF EXISTS "waitlist_email_key";

DROP TABLE IF EXISTS "waitlist" CASCADE;