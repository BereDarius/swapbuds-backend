-- AlterEnum
ALTER TYPE "TradeStatus" ADD VALUE 'EXPIRED';

-- AlterTable
ALTER TABLE "trades" ADD COLUMN     "expiresAt" TIMESTAMP(3);
