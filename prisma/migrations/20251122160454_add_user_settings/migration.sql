-- CreateEnum
CREATE TYPE "Theme" AS ENUM ('LIGHT', 'DARK', 'AUTO');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('EN', 'ES', 'FR', 'DE', 'PT');

-- CreateTable
CREATE TABLE "user_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayEmail" BOOLEAN NOT NULL DEFAULT false,
    "displayLocation" BOOLEAN NOT NULL DEFAULT true,
    "allowMessages" BOOLEAN NOT NULL DEFAULT true,
    "profileVisibility" TEXT NOT NULL DEFAULT 'PUBLIC',
    "showTradeHistory" BOOLEAN NOT NULL DEFAULT true,
    "showReviews" BOOLEAN NOT NULL DEFAULT true,
    "showStatistics" BOOLEAN NOT NULL DEFAULT true,
    "autoDeclineExpiredTrades" BOOLEAN NOT NULL DEFAULT true,
    "allowCounterOffers" BOOLEAN NOT NULL DEFAULT true,
    "requireTradeMessage" BOOLEAN NOT NULL DEFAULT false,
    "emailDigestFrequency" TEXT NOT NULL DEFAULT 'DAILY',
    "pushDigestFrequency" TEXT NOT NULL DEFAULT 'REALTIME',
    "theme" "Theme" NOT NULL DEFAULT 'AUTO',
    "language" "Language" NOT NULL DEFAULT 'EN',
    "itemsPerPage" INTEGER NOT NULL DEFAULT 12,
    "defaultSortBy" TEXT NOT NULL DEFAULT 'RECENT',
    "compactView" BOOLEAN NOT NULL DEFAULT false,
    "saveSearchHistory" BOOLEAN NOT NULL DEFAULT true,
    "showSimilarItems" BOOLEAN NOT NULL DEFAULT true,
    "enableRecommendations" BOOLEAN NOT NULL DEFAULT true,
    "highContrast" BOOLEAN NOT NULL DEFAULT false,
    "largeText" BOOLEAN NOT NULL DEFAULT false,
    "reduceMotion" BOOLEAN NOT NULL DEFAULT false,
    "screenReaderMode" BOOLEAN NOT NULL DEFAULT false,
    "marketingEmails" BOOLEAN NOT NULL DEFAULT false,
    "productUpdates" BOOLEAN NOT NULL DEFAULT true,
    "communityNewsletter" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "sessionTimeout" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_userId_key" ON "user_settings"("userId");

-- CreateIndex
CREATE INDEX "user_settings_userId_idx" ON "user_settings"("userId");

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
