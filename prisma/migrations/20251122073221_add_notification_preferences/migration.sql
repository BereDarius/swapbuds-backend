-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailTradeProposal" BOOLEAN NOT NULL DEFAULT true,
    "emailTradeAccepted" BOOLEAN NOT NULL DEFAULT true,
    "emailTradeRejected" BOOLEAN NOT NULL DEFAULT true,
    "emailTradeCancelled" BOOLEAN NOT NULL DEFAULT true,
    "emailNewMessage" BOOLEAN NOT NULL DEFAULT true,
    "emailNewComment" BOOLEAN NOT NULL DEFAULT true,
    "emailNewLike" BOOLEAN NOT NULL DEFAULT false,
    "emailNewReview" BOOLEAN NOT NULL DEFAULT true,
    "pushTradeProposal" BOOLEAN NOT NULL DEFAULT true,
    "pushTradeAccepted" BOOLEAN NOT NULL DEFAULT true,
    "pushTradeRejected" BOOLEAN NOT NULL DEFAULT true,
    "pushTradeCancelled" BOOLEAN NOT NULL DEFAULT true,
    "pushNewMessage" BOOLEAN NOT NULL DEFAULT true,
    "pushNewComment" BOOLEAN NOT NULL DEFAULT true,
    "pushNewLike" BOOLEAN NOT NULL DEFAULT true,
    "pushNewReview" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_userId_key" ON "notification_preferences"("userId");

-- CreateIndex
CREATE INDEX "notification_preferences_userId_idx" ON "notification_preferences"("userId");

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
