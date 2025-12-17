-- Rollback SQL for migration: 20251129113744_add_verification_document_front_back
-- Generated: 2025-12-17T07:28:45.277Z
--
-- This rollback was generated with schema catalog awareness.
-- Dropped columns/indexes/constraints are restored with their original definitions.
--
-- To execute: yarn migrate:rollback 20251129113744_add_verification_document_front_back

-- Restore dropped column (originally defined in 20251123085312_add_user_verification_system)
ALTER TABLE "user_verifications" ADD COLUMN "documentUrl" TEXT NOT NULL;

-- ⚠️  MANUAL ROLLBACK REQUIRED for:
-- ALTER TABLE "user_verifications" ALTER COLUMN "documentUrlFront" SET     NOT NULL...

-- ⚠️  DATA MIGRATION: Manual rollback may be needed
-- Original: UPDATE "user_verifications" SET     "documentUrlFront" = "documentUrl" WHERE    ...

-- ⚠️  MANUAL ROLLBACK REQUIRED for:
-- ALTER TABLE "user_verifications" ADD COLUMN "documentUrlFront" TEXT, ADD COLUMN "documentUrlBack" TE...