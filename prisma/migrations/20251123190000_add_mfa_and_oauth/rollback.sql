-- Rollback SQL for migration: 20251123190000_add_mfa_and_oauth
-- Generated: 2025-12-17T07:28:45.271Z
--
-- This rollback was generated with schema catalog awareness.
-- Dropped columns/indexes/constraints are restored with their original definitions.
--
-- To execute: yarn migrate:rollback 20251123190000_add_mfa_and_oauth

ALTER TABLE "oauth_accounts" DROP CONSTRAINT IF EXISTS "oauth_accounts_userId_fkey";

ALTER TABLE "mfa_secrets" DROP CONSTRAINT IF EXISTS "mfa_secrets_userId_fkey";

DROP INDEX IF EXISTS "oauth_accounts_provider_providerId_key";

DROP INDEX IF EXISTS "oauth_accounts_provider_idx";

DROP INDEX IF EXISTS "oauth_accounts_userId_idx";

DROP INDEX IF EXISTS "mfa_secrets_userId_idx";

DROP INDEX IF EXISTS "mfa_secrets_userId_key";

DROP TABLE IF EXISTS "oauth_accounts" CASCADE;

DROP TABLE IF EXISTS "mfa_secrets" CASCADE;

ALTER TABLE "users" DROP COLUMN IF EXISTS "mfaEnabled";

DROP TYPE IF EXISTS "OAuthProvider";