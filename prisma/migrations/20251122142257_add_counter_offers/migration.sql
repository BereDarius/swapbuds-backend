-- CreateEnum
CREATE TYPE "CounterOfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "counter_offers" (
    "id" TEXT NOT NULL,
    "status" "CounterOfferStatus" NOT NULL DEFAULT 'PENDING',
    "tradeId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "alternativeItemId" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "counter_offers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "counter_offers_tradeId_idx" ON "counter_offers"("tradeId");

-- CreateIndex
CREATE INDEX "counter_offers_createdById_idx" ON "counter_offers"("createdById");

-- CreateIndex
CREATE INDEX "counter_offers_status_idx" ON "counter_offers"("status");

-- CreateIndex
CREATE INDEX "counter_offers_createdAt_idx" ON "counter_offers"("createdAt");

-- AddForeignKey
ALTER TABLE "counter_offers" ADD CONSTRAINT "counter_offers_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "trades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "counter_offers" ADD CONSTRAINT "counter_offers_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "counter_offers" ADD CONSTRAINT "counter_offers_alternativeItemId_fkey" FOREIGN KEY ("alternativeItemId") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
