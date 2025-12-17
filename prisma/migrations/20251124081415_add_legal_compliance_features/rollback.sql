-- Rollback SQL for migration: 20251124081415_add_legal_compliance_features
-- Generated: 2025-12-17T07:28:45.272Z
--
-- This rollback was generated with schema catalog awareness.
-- Dropped columns/indexes/constraints are restored with their original definitions.
--
-- To execute: yarn migrate:rollback 20251124081415_add_legal_compliance_features

ALTER TABLE "legal_consents" DROP CONSTRAINT IF EXISTS "legal_consents_userId_fkey";

DROP INDEX IF EXISTS "legal_consents_userId_documentType_idx";

DROP INDEX IF EXISTS "legal_consents_documentType_idx";

DROP INDEX IF EXISTS "legal_consents_userId_idx";

DROP INDEX IF EXISTS "legal_documents_type_version_key";

DROP INDEX IF EXISTS "legal_documents_type_isActive_idx";

DROP TABLE IF EXISTS "legal_consents" CASCADE;

DROP TABLE IF EXISTS "legal_documents" CASCADE;

ALTER TABLE "users" DROP COLUMN IF EXISTS "ageVerifiedAt";
ALTER TABLE "users" DROP COLUMN IF EXISTS "cookieConsent";
ALTER TABLE "users" DROP COLUMN IF EXISTS "dateOfBirth";
ALTER TABLE "users" DROP COLUMN IF EXISTS "privacyAcceptedAt";
ALTER TABLE "users" DROP COLUMN IF EXISTS "privacyVersion";
ALTER TABLE "users" DROP COLUMN IF EXISTS "selfDeclaredAge18";
ALTER TABLE "users" DROP COLUMN IF EXISTS "tosAcceptedAt";
ALTER TABLE "users" DROP COLUMN IF EXISTS "tosVersion";

DROP TYPE IF EXISTS "LegalDocumentType";