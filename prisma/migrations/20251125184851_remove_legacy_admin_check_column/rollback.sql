-- Rollback SQL for migration: 20251125184851_remove_legacy_admin_check_column
-- Generated: 2025-12-17T07:28:45.276Z
--
-- This rollback was generated with schema catalog awareness.
-- Dropped columns/indexes/constraints are restored with their original definitions.
--
-- To execute: yarn migrate:rollback 20251125184851_remove_legacy_admin_check_column

-- Restore dropped column (originally defined in 20251122151635_add_dispute_resolution_system)
ALTER TABLE "users" ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false;