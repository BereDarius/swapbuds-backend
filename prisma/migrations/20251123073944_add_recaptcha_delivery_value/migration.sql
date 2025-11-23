/*
  Warnings:

  - The values [ES,FR,DE,PT] on the enum `Language` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `deliveryMethod` to the `trades` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DeliveryMethod" AS ENUM ('PHYSICAL', 'MAIL');

-- CreateEnum
CREATE TYPE "DeliveryScope" AS ENUM ('NATIONAL', 'INTERNATIONAL');

-- AlterEnum
BEGIN;
CREATE TYPE "Language_new" AS ENUM ('EN', 'RO');
ALTER TABLE "user_settings" ALTER COLUMN "language" DROP DEFAULT;
ALTER TABLE "user_settings" ALTER COLUMN "language" TYPE "Language_new" USING ("language"::text::"Language_new");
ALTER TYPE "Language" RENAME TO "Language_old";
ALTER TYPE "Language_new" RENAME TO "Language";
DROP TYPE "Language_old";
ALTER TABLE "user_settings" ALTER COLUMN "language" SET DEFAULT 'EN';
COMMIT;

-- AlterTable
ALTER TABLE "items" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'EUR',
ADD COLUMN     "deliveryMethods" "DeliveryMethod"[] DEFAULT ARRAY['PHYSICAL', 'MAIL']::"DeliveryMethod"[],
ADD COLUMN     "deliveryScope" "DeliveryScope" NOT NULL DEFAULT 'NATIONAL',
ADD COLUMN     "estimatedValue" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "trades" ADD COLUMN     "deliveryMethod" "DeliveryMethod" NOT NULL;

-- CreateTable
CREATE TABLE "recaptcha_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "ip" TEXT,
    "success" BOOLEAN NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recaptcha_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recaptcha_logs_action_idx" ON "recaptcha_logs"("action");

-- CreateIndex
CREATE INDEX "recaptcha_logs_score_idx" ON "recaptcha_logs"("score");

-- CreateIndex
CREATE INDEX "recaptcha_logs_timestamp_idx" ON "recaptcha_logs"("timestamp");
