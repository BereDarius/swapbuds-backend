-- Rollback SQL for migration: 20251123092842_add_admin_roles_and_audit_logs
-- Generated: 2025-12-17T07:28:45.265Z
--
-- This rollback was generated with schema catalog awareness.
-- Dropped columns/indexes/constraints are restored with their original definitions.
--
-- To execute: yarn migrate:rollback 20251123092842_add_admin_roles_and_audit_logs

ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "audit_logs_performedById_fkey";

DROP INDEX IF EXISTS "users_role_idx";

DROP INDEX IF EXISTS "audit_logs_createdAt_idx";

DROP INDEX IF EXISTS "audit_logs_targetType_targetId_idx";

DROP INDEX IF EXISTS "audit_logs_action_idx";

DROP INDEX IF EXISTS "audit_logs_performedById_idx";

DROP TABLE IF EXISTS "audit_logs" CASCADE;

ALTER TABLE "users" DROP COLUMN IF EXISTS "role";

DROP TYPE IF EXISTS "AuditAction";

DROP TYPE IF EXISTS "UserRole";