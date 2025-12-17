-- Rollback SQL for migration: 20251123101916_add_content_moderation
-- Generated: 2025-12-17T07:28:45.266Z
--
-- This rollback was generated with schema catalog awareness.
-- Dropped columns/indexes/constraints are restored with their original definitions.
--
-- To execute: yarn migrate:rollback 20251123101916_add_content_moderation

ALTER TABLE "flagged_items" DROP CONSTRAINT IF EXISTS "flagged_items_reviewedById_fkey";

ALTER TABLE "flagged_items" DROP CONSTRAINT IF EXISTS "flagged_items_reportedById_fkey";

ALTER TABLE "flagged_items" DROP CONSTRAINT IF EXISTS "flagged_items_itemId_fkey";

DROP INDEX IF EXISTS "flagged_items_createdAt_idx";

DROP INDEX IF EXISTS "flagged_items_reason_idx";

DROP INDEX IF EXISTS "flagged_items_status_idx";

DROP INDEX IF EXISTS "flagged_items_reportedById_idx";

DROP INDEX IF EXISTS "flagged_items_itemId_idx";

DROP TABLE IF EXISTS "flagged_items" CASCADE;

-- ⚠️  MANUAL ROLLBACK REQUIRED: PostgreSQL doesn't easily support removing enum values
-- You may need to recreate the enum type "AuditAction" without value 'MODERATION_REMOVE'

-- ⚠️  MANUAL ROLLBACK REQUIRED: PostgreSQL doesn't easily support removing enum values
-- You may need to recreate the enum type "AuditAction" without value 'MODERATION_APPROVE'

DROP TYPE IF EXISTS "ModerationStatus";

DROP TYPE IF EXISTS "FlagReason";