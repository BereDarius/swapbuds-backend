-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'UNDERAGE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('ID_CARD', 'PASSPORT', 'DRIVERS_LICENSE');

-- CreateTable
CREATE TABLE "user_verifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "documentType" "DocumentType" NOT NULL,
    "documentUrl" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "isOver18" BOOLEAN,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "rejectionReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_verifications_userId_key" ON "user_verifications"("userId");

-- CreateIndex
CREATE INDEX "user_verifications_userId_idx" ON "user_verifications"("userId");

-- CreateIndex
CREATE INDEX "user_verifications_status_idx" ON "user_verifications"("status");

-- CreateIndex
CREATE INDEX "user_verifications_submittedAt_idx" ON "user_verifications"("submittedAt");

-- AddForeignKey
ALTER TABLE "user_verifications" ADD CONSTRAINT "user_verifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
