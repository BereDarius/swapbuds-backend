-- Rollback SQL for migration: 20251122151635_add_dispute_resolution_system
-- Generated: 2025-12-17T07:28:45.258Z
--
-- This rollback was generated with schema catalog awareness.
-- Dropped columns/indexes/constraints are restored with their original definitions.
--
-- To execute: yarn migrate:rollback 20251122151635_add_dispute_resolution_system

ALTER TABLE "disputes" DROP CONSTRAINT IF EXISTS "disputes_adminId_fkey";

ALTER TABLE "disputes" DROP CONSTRAINT IF EXISTS "disputes_reportedUserId_fkey";

ALTER TABLE "disputes" DROP CONSTRAINT IF EXISTS "disputes_reporterId_fkey";

ALTER TABLE "disputes" DROP CONSTRAINT IF EXISTS "disputes_tradeId_fkey";

DROP INDEX IF EXISTS "disputes_createdAt_idx";

DROP INDEX IF EXISTS "disputes_status_idx";

DROP INDEX IF EXISTS "disputes_reportedUserId_idx";

DROP INDEX IF EXISTS "disputes_reporterId_idx";

DROP INDEX IF EXISTS "disputes_tradeId_idx";

DROP TABLE IF EXISTS "disputes" CASCADE;

ALTER TABLE "users" DROP COLUMN IF EXISTS "isAdmin";

DROP TYPE IF EXISTS "DisputeReason";

DROP TYPE IF EXISTS "DisputeStatus";