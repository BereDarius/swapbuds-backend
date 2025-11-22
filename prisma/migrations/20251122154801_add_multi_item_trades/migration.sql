-- CreateEnum
CREATE TYPE "TradeItemSide" AS ENUM ('OFFERED', 'REQUESTED');

-- AlterTable
ALTER TABLE "trades" ALTER COLUMN "itemOfferedId" DROP NOT NULL,
ALTER COLUMN "itemRequestedId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "trade_items" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "side" "TradeItemSide" NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trade_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trade_items_tradeId_idx" ON "trade_items"("tradeId");

-- CreateIndex
CREATE INDEX "trade_items_itemId_idx" ON "trade_items"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "trade_items_tradeId_itemId_key" ON "trade_items"("tradeId", "itemId");

-- AddForeignKey
ALTER TABLE "trade_items" ADD CONSTRAINT "trade_items_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "trades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_items" ADD CONSTRAINT "trade_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
