-- Rollback SQL for migration: 20251123073944_add_recaptcha_delivery_value
-- Generated: 2025-12-17T07:28:45.262Z
--
-- This rollback was generated with schema catalog awareness.
-- Dropped columns/indexes/constraints are restored with their original definitions.
--
-- To execute: yarn migrate:rollback 20251123073944_add_recaptcha_delivery_value

DROP INDEX IF EXISTS "recaptcha_logs_timestamp_idx";

DROP INDEX IF EXISTS "recaptcha_logs_score_idx";

DROP INDEX IF EXISTS "recaptcha_logs_action_idx";

DROP TABLE IF EXISTS "recaptcha_logs" CASCADE;

ALTER TABLE "trades" DROP COLUMN IF EXISTS "deliveryMethod";

ALTER TABLE "items" DROP COLUMN IF EXISTS "currency";
ALTER TABLE "items" DROP COLUMN IF EXISTS "deliveryMethods";
ALTER TABLE "items" DROP COLUMN IF EXISTS "deliveryScope";
ALTER TABLE "items" DROP COLUMN IF EXISTS "estimatedValue";

ALTER TABLE "user_settings" ALTER COLUMN "language" SET DEFAULT 'EN';

-- ⚠️  MANUAL ROLLBACK REQUIRED: Cannot automatically recreate dropped enum "undefined"

ALTER TYPE "Language" RENAME TO "Language_new";

ALTER TYPE "Language_old" RENAME TO "Language";

-- Restore previous column type
ALTER TABLE "user_settings" ALTER COLUMN "language" TYPE "Language" NOT NULL DEFAULT 'EN';

ALTER TABLE "user_settings" ALTER COLUMN "language" SET DEFAULT 'EN';

DROP TYPE IF EXISTS "Language_new";

DROP TYPE IF EXISTS "DeliveryScope";

DROP TYPE IF EXISTS "DeliveryMethod";