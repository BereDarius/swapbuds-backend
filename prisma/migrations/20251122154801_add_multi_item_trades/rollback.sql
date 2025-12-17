-- Rollback SQL for migration: 20251122154801_add_multi_item_trades
-- Generated: 2025-12-17T07:28:45.259Z
--
-- This rollback was generated with schema catalog awareness.
-- Dropped columns/indexes/constraints are restored with their original definitions.
--
-- To execute: yarn migrate:rollback 20251122154801_add_multi_item_trades

ALTER TABLE "trade_items" DROP CONSTRAINT IF EXISTS "trade_items_itemId_fkey";

ALTER TABLE "trade_items" DROP CONSTRAINT IF EXISTS "trade_items_tradeId_fkey";

DROP INDEX IF EXISTS "trade_items_tradeId_itemId_key";

DROP INDEX IF EXISTS "trade_items_itemId_idx";

DROP INDEX IF EXISTS "trade_items_tradeId_idx";

DROP TABLE IF EXISTS "trade_items" CASCADE;

ALTER TABLE "trades" ALTER COLUMN "itemOfferedId" SET NOT NULL;

ALTER TABLE "trades" ALTER COLUMN "itemRequestedId" SET NOT NULL;

DROP TYPE IF EXISTS "TradeItemSide";