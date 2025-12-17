-- Rollback SQL for migration: 20251122143909_add_trade_expiration
-- Generated: 2025-12-17T07:28:45.257Z
--
-- This rollback was generated with schema catalog awareness.
-- Dropped columns/indexes/constraints are restored with their original definitions.
--
-- To execute: yarn migrate:rollback 20251122143909_add_trade_expiration

ALTER TABLE "trades" DROP COLUMN IF EXISTS "expiresAt";

-- ⚠️  MANUAL ROLLBACK REQUIRED: PostgreSQL doesn't easily support removing enum values
-- You may need to recreate the enum type "TradeStatus" without value 'EXPIRED'