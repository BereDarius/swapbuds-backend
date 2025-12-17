-- Rollback SQL for migration: 20251123085312_add_user_verification_system
-- Generated: 2025-12-17T07:28:45.264Z
--
-- This rollback was generated with schema catalog awareness.
-- Dropped columns/indexes/constraints are restored with their original definitions.
--
-- To execute: yarn migrate:rollback 20251123085312_add_user_verification_system

ALTER TABLE "user_verifications" DROP CONSTRAINT IF EXISTS "user_verifications_userId_fkey";

DROP INDEX IF EXISTS "user_verifications_submittedAt_idx";

DROP INDEX IF EXISTS "user_verifications_status_idx";

DROP INDEX IF EXISTS "user_verifications_userId_idx";

DROP INDEX IF EXISTS "user_verifications_userId_key";

DROP TABLE IF EXISTS "user_verifications" CASCADE;

DROP TYPE IF EXISTS "DocumentType";

DROP TYPE IF EXISTS "VerificationStatus";