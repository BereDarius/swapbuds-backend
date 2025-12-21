/*
Warnings:

- You are about to drop the column `senderId` on the `support_messages` table. All the data in the column will be lost.

*/

-- Step 1: Create AdminRole enum
CREATE TYPE "AdminRole" AS ENUM ('SUPPORT', 'MODERATOR', 'ADMIN');

-- Step 2: Create admin_users table
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "role" "AdminRole" NOT NULL DEFAULT 'SUPPORT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- Step 3: Create admin_mfa_secrets table
CREATE TABLE "admin_mfa_secrets" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admin_mfa_secrets_pkey" PRIMARY KEY ("id")
);

-- Step 4: Migrate admin users from users table to admin_users table
INSERT INTO "admin_users" ("id", "email", "username", "password", "avatarUrl", "role", "createdAt", "updatedAt", "lastLoginAt", "isActive")
SELECT
    "id",
    "email",
    "username",
    "password",
    "avatarUrl",
    CASE
        WHEN "role" = 'ADMIN' THEN 'ADMIN'::"AdminRole"
        WHEN "role" = 'MODERATOR' THEN 'MODERATOR'::"AdminRole"
        WHEN "role" = 'SUPPORT' THEN 'SUPPORT'::"AdminRole"
    END as "role",
    "createdAt",
    "updatedAt",
    "lastLoginAt",
    "isActive"
FROM "users"
WHERE "role" IN ('ADMIN', 'MODERATOR', 'SUPPORT');

-- Step 5: Drop foreign key constraints that will be modified
ALTER TABLE "audit_logs"
DROP CONSTRAINT "audit_logs_performedById_fkey";

ALTER TABLE "disputes" DROP CONSTRAINT "disputes_adminId_fkey";

ALTER TABLE "flagged_comments"
DROP CONSTRAINT "flagged_comments_reviewedById_fkey";

ALTER TABLE "flagged_items"
DROP CONSTRAINT "flagged_items_reviewedById_fkey";

ALTER TABLE "support_chats"
DROP CONSTRAINT "support_chats_agentId_fkey";

ALTER TABLE "support_messages"
DROP CONSTRAINT "support_messages_senderId_fkey";

-- Step 6: Update SupportMessage to use new sender fields
ALTER TABLE "support_messages" ADD COLUMN "adminSenderId" TEXT;

ALTER TABLE "support_messages" ADD COLUMN "userSenderId" TEXT;

-- Migrate support messages: if sender is admin, use adminSenderId, else userSenderId
UPDATE "support_messages" sm
SET "adminSenderId" = sm."senderId"
FROM "users" u
WHERE sm."senderId" = u."id" AND u."role" IN ('ADMIN', 'MODERATOR', 'SUPPORT');

UPDATE "support_messages" sm
SET "userSenderId" = sm."senderId"
FROM "users" u
WHERE sm."senderId" = u."id" AND u."role" = 'USER' AND sm."adminSenderId" IS NULL;

-- Drop old senderId column and index
DROP INDEX IF EXISTS "support_messages_senderId_idx";

ALTER TABLE "support_messages" DROP COLUMN "senderId";

-- Step 7: Delete admin users from users table (data already migrated to admin_users)
DELETE FROM "users"
WHERE
    "role" IN (
        'ADMIN',
        'MODERATOR',
        'SUPPORT'
    );

-- Step 8: Create indexes for admin_users
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users" ("email");

CREATE UNIQUE INDEX "admin_users_username_key" ON "admin_users" ("username");

CREATE INDEX "admin_users_email_idx" ON "admin_users" ("email");

CREATE INDEX "admin_users_username_idx" ON "admin_users" ("username");

CREATE INDEX "admin_users_role_idx" ON "admin_users" ("role");

-- Step 9: Create indexes for admin_mfa_secrets
CREATE UNIQUE INDEX "admin_mfa_secrets_adminUserId_key" ON "admin_mfa_secrets" ("adminUserId");

-- Step 10: Create indexes for support_messages new columns
CREATE INDEX "support_messages_userSenderId_idx" ON "support_messages" ("userSenderId");

CREATE INDEX "support_messages_adminSenderId_idx" ON "support_messages" ("adminSenderId");

-- Step 11: Add foreign key constraints
ALTER TABLE "admin_mfa_secrets"
ADD CONSTRAINT "admin_mfa_secrets_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "admin_users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "disputes"
ADD CONSTRAINT "disputes_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admin_users" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "audit_logs"
ADD CONSTRAINT "audit_logs_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "admin_users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "flagged_items"
ADD CONSTRAINT "flagged_items_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "admin_users" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "flagged_comments"
ADD CONSTRAINT "flagged_comments_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "admin_users" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "support_chats"
ADD CONSTRAINT "support_chats_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "admin_users" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "support_messages"
ADD CONSTRAINT "support_messages_userSenderId_fkey" FOREIGN KEY ("userSenderId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "support_messages"
ADD CONSTRAINT "support_messages_adminSenderId_fkey" FOREIGN KEY ("adminSenderId") REFERENCES "admin_users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
