-- Rollback SQL for migration: 20251221070443_add_admin_created_by_field
-- Generated: 2025-12-26T12:15:48.927Z
--
-- This rollback was generated with schema catalog awareness.
-- Dropped columns/indexes/constraints are restored with their original definitions.
--
-- To execute: yarn migrate:rollback 20251221070443_add_admin_created_by_field

ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "audit_logs_adminUserId_fkey";

ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "audit_logs_userId_fkey";

ALTER TABLE "disputes" DROP CONSTRAINT IF EXISTS "disputes_adminUserId_fkey";

ALTER TABLE "disputes" DROP CONSTRAINT IF EXISTS "disputes_userId_fkey";

ALTER TABLE "disputes" DROP COLUMN IF EXISTS "adminUserId";
ALTER TABLE "disputes" DROP COLUMN IF EXISTS "userId";

ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "adminUserId";
ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "userId";

ALTER TABLE "admin_users" DROP COLUMN IF EXISTS "createdBy";