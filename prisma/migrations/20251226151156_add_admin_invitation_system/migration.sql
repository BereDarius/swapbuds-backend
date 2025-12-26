-- CreateEnum
CREATE TYPE "AdminStatus" AS ENUM ('PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'REVOKED');

-- CreateEnum
CREATE TYPE "AdminInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'APPROVED', 'REJECTED', 'REVOKED', 'EXPIRED');

-- AlterTable
ALTER TABLE "admin_users" ADD COLUMN     "status" "AdminStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "admin_invites" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'SUPPORT',
    "token" TEXT NOT NULL,
    "status" "AdminInviteStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "sentBy" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "recipientId" TEXT,

    CONSTRAINT "admin_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_invites_token_key" ON "admin_invites"("token");

-- CreateIndex
CREATE UNIQUE INDEX "admin_invites_recipientId_key" ON "admin_invites"("recipientId");

-- CreateIndex
CREATE INDEX "admin_invites_email_idx" ON "admin_invites"("email");

-- CreateIndex
CREATE INDEX "admin_invites_token_idx" ON "admin_invites"("token");

-- CreateIndex
CREATE INDEX "admin_invites_status_idx" ON "admin_invites"("status");

-- CreateIndex
CREATE INDEX "admin_invites_sentBy_idx" ON "admin_invites"("sentBy");

-- AddForeignKey
ALTER TABLE "admin_invites" ADD CONSTRAINT "admin_invites_sentBy_fkey" FOREIGN KEY ("sentBy") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_invites" ADD CONSTRAINT "admin_invites_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_invites" ADD CONSTRAINT "admin_invites_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
