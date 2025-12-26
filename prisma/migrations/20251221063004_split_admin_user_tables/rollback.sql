-- Rollback SQL for migration: 20251221063004_split_admin_user_tables
-- Reverts the split of admin users into separate AdminUser table
--
-- ⚠️  WARNING: This rollback involves complex data migration
-- - Admin users will be restored to the main users table
-- - Support messages sender references will be consolidated
-- - All foreign keys will be updated to point back to users table
--
-- To execute: yarn migrate:rollback 20251221063004_split_admin_user_tables

-- Step 1: Drop foreign key constraints (admin_users references)
ALTER TABLE "support_messages"
DROP CONSTRAINT IF EXISTS "support_messages_adminSenderId_fkey";

ALTER TABLE "support_messages"
DROP CONSTRAINT IF EXISTS "support_messages_userSenderId_fkey";

ALTER TABLE "support_chats"
DROP CONSTRAINT IF EXISTS "support_chats_agentId_fkey";

ALTER TABLE "flagged_comments"
DROP CONSTRAINT IF EXISTS "flagged_comments_reviewedById_fkey";

ALTER TABLE "flagged_items"
DROP CONSTRAINT IF EXISTS "flagged_items_reviewedById_fkey";

ALTER TABLE "audit_logs"
DROP CONSTRAINT IF EXISTS "audit_logs_performedById_fkey";

ALTER TABLE "disputes"
DROP CONSTRAINT IF EXISTS "disputes_adminId_fkey";

ALTER TABLE "admin_mfa_secrets"
DROP CONSTRAINT IF EXISTS "admin_mfa_secrets_adminUserId_fkey";

-- Step 2: Drop indexes
DROP INDEX IF EXISTS "support_messages_adminSenderId_idx";

DROP INDEX IF EXISTS "support_messages_userSenderId_idx";

DROP INDEX IF EXISTS "admin_mfa_secrets_adminUserId_key";

DROP INDEX IF EXISTS "admin_users_role_idx";

DROP INDEX IF EXISTS "admin_users_username_idx";

DROP INDEX IF EXISTS "admin_users_email_idx";

DROP INDEX IF EXISTS "admin_users_username_key";

DROP INDEX IF EXISTS "admin_users_email_key";

-- Step 3: Restore admin users to users table
-- First add back the ADMIN, MODERATOR, SUPPORT values to UserRole enum if missing
-- (This assumes UserRole still has USER value)
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'ADMIN';

ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'MODERATOR';

ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPPORT';

-- Migrate admin users back to users table
INSERT INTO "users" ("id", "email", "username", "password", "avatarUrl", "role", "createdAt", "updatedAt", "lastLoginAt", "isActive", "emailVerified")
SELECT
    "id",
    "email",
    "username",
    "password",
    "avatarUrl",
    CASE
        WHEN "role" = 'ADMIN' THEN 'ADMIN'::"UserRole"
        WHEN "role" = 'MODERATOR' THEN 'MODERATOR'::"UserRole"
        WHEN "role" = 'SUPPORT' THEN 'SUPPORT'::"UserRole"
    END as "role",
    "createdAt",
    "updatedAt",
    "lastLoginAt",
    "isActive",
    true as "emailVerified" -- Admin users are always email verified
FROM "admin_users"
ON CONFLICT ("id") DO NOTHING;

-- Step 4: Restore senderId column to support_messages
ALTER TABLE "support_messages" ADD COLUMN "senderId" TEXT;

-- Consolidate sender references: Use adminSenderId if present, else userSenderId
UPDATE "support_messages"
SET
    "senderId" = COALESCE(
        "adminSenderId",
        "userSenderId"
    );

-- Make senderId NOT NULL now that data is migrated
ALTER TABLE "support_messages" ALTER COLUMN "senderId" SET NOT NULL;

-- Restore senderId index
CREATE INDEX "support_messages_senderId_idx" ON "support_messages" ("senderId");

-- Drop the split sender columns
ALTER TABLE "support_messages" DROP COLUMN IF EXISTS "userSenderId";

ALTER TABLE "support_messages" DROP COLUMN IF EXISTS "adminSenderId";

-- Step 5: Restore foreign key constraints (users references)
ALTER TABLE "support_messages"
ADD CONSTRAINT "support_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "support_chats"
ADD CONSTRAINT "support_chats_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "flagged_items"
ADD CONSTRAINT "flagged_items_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "flagged_comments"
ADD CONSTRAINT "flagged_comments_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "disputes"
ADD CONSTRAINT "disputes_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "audit_logs"
ADD CONSTRAINT "audit_logs_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 6: Drop admin tables and type
DROP TABLE IF EXISTS "admin_mfa_secrets" CASCADE;

DROP TABLE IF EXISTS "admin_users" CASCADE;

DROP TYPE IF EXISTS "AdminRole";
