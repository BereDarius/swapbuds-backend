-- Rollback SQL for migration: 20251129114316_add_verification_selfie
-- Generated: 2025-12-17T07:28:45.278Z
--
-- This rollback was generated with schema catalog awareness.
-- Dropped columns/indexes/constraints are restored with their original definitions.
--
-- To execute: yarn migrate:rollback 20251129114316_add_verification_selfie

-- ⚠️  MANUAL ROLLBACK REQUIRED for:
-- ALTER TABLE "user_verifications" ALTER COLUMN "selfieUrl" SET     NOT NULL...

-- ⚠️  DATA MIGRATION: Manual rollback may be needed
-- Original: UPDATE "user_verifications" SET     "selfieUrl" = "documentUrlFront" WHERE     "...

ALTER TABLE "user_verifications" DROP COLUMN IF EXISTS "selfieUrl";