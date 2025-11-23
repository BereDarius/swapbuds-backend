-- CreateEnum
CREATE TYPE "FlagReason" AS ENUM ('INAPPROPRIATE', 'SPAM', 'SCAM', 'DUPLICATE', 'PROHIBITED', 'MISLEADING', 'COPYRIGHT', 'OTHER');

-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REMOVED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'MODERATION_APPROVE';
ALTER TYPE "AuditAction" ADD VALUE 'MODERATION_REMOVE';

-- CreateTable
CREATE TABLE "flagged_items" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "reportedById" TEXT NOT NULL,
    "reason" "FlagReason" NOT NULL,
    "description" TEXT,
    "status" "ModerationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flagged_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "flagged_items_itemId_idx" ON "flagged_items"("itemId");

-- CreateIndex
CREATE INDEX "flagged_items_reportedById_idx" ON "flagged_items"("reportedById");

-- CreateIndex
CREATE INDEX "flagged_items_status_idx" ON "flagged_items"("status");

-- CreateIndex
CREATE INDEX "flagged_items_reason_idx" ON "flagged_items"("reason");

-- CreateIndex
CREATE INDEX "flagged_items_createdAt_idx" ON "flagged_items"("createdAt");

-- AddForeignKey
ALTER TABLE "flagged_items" ADD CONSTRAINT "flagged_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flagged_items" ADD CONSTRAINT "flagged_items_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flagged_items" ADD CONSTRAINT "flagged_items_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
