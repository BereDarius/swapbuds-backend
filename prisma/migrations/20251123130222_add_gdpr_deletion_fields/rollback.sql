-- Rollback SQL for migration: 20251123130222_add_gdpr_deletion_fields
-- Generated: 2025-12-17T07:28:45.268Z
--
-- This rollback was generated with schema catalog awareness.
-- Dropped columns/indexes/constraints are restored with their original definitions.
--
-- To execute: yarn migrate:rollback 20251123130222_add_gdpr_deletion_fields

ALTER TABLE "users" DROP COLUMN IF EXISTS "deletionRequestedAt";
ALTER TABLE "users" DROP COLUMN IF EXISTS "scheduledDeletionAt";