/*
Warnings:

- Added the required column `selfieUrl` to the `user_verifications` table without a default value. This is not possible if the table is not empty.

*/

-- Step 1: Add selfieUrl as nullable first
ALTER TABLE "user_verifications" ADD COLUMN "selfieUrl" TEXT;

-- Step 2: Set a default value for existing rows (use documentUrlFront as placeholder)
UPDATE "user_verifications"
SET
    "selfieUrl" = "documentUrlFront"
WHERE
    "selfieUrl" IS NULL;

-- Step 3: Make selfieUrl required (NOT NULL)
ALTER TABLE "user_verifications"
ALTER COLUMN "selfieUrl"
SET
    NOT NULL;
