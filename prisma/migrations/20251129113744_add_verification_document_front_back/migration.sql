/*
Warnings:

- You are about to drop the column `documentUrl` on the `user_verifications` table. All the data in the column will be lost.
- Added the required column `documentUrlFront` to the `user_verifications` table without a default value. This is not possible if the table is not empty.

*/

-- Step 1: Add new columns as nullable first
ALTER TABLE "user_verifications"
ADD COLUMN "documentUrlFront" TEXT,
ADD COLUMN "documentUrlBack" TEXT;

-- Step 2: Migrate existing data (copy documentUrl to documentUrlFront)
UPDATE "user_verifications"
SET
    "documentUrlFront" = "documentUrl"
WHERE
    "documentUrl" IS NOT NULL;

-- Step 3: Make documentUrlFront required (NOT NULL)
ALTER TABLE "user_verifications"
ALTER COLUMN "documentUrlFront"
SET
    NOT NULL;

-- Step 4: Drop old column
ALTER TABLE "user_verifications" DROP COLUMN "documentUrl";
