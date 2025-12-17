-- Rollback SQL for migration: 20251130070905_add_email_verification
-- Generated: 2025-12-17T07:28:45.281Z
--
-- This rollback was generated with schema catalog awareness.
-- Dropped columns/indexes/constraints are restored with their original definitions.
--
-- To execute: yarn migrate:rollback 20251130070905_add_email_verification

DROP INDEX IF EXISTS "users_emailVerificationToken_key";

ALTER TABLE "users" DROP COLUMN IF EXISTS "emailVerificationExpires";
ALTER TABLE "users" DROP COLUMN IF EXISTS "emailVerificationSentAt";
ALTER TABLE "users" DROP COLUMN IF EXISTS "emailVerificationToken";
ALTER TABLE "users" DROP COLUMN IF EXISTS "emailVerified";