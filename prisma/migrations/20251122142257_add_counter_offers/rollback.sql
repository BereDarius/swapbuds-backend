-- Rollback SQL for migration: 20251122142257_add_counter_offers
-- Generated: 2025-12-17T07:28:45.256Z
--
-- This rollback was generated with schema catalog awareness.
-- Dropped columns/indexes/constraints are restored with their original definitions.
--
-- To execute: yarn migrate:rollback 20251122142257_add_counter_offers

ALTER TABLE "counter_offers" DROP CONSTRAINT IF EXISTS "counter_offers_alternativeItemId_fkey";

ALTER TABLE "counter_offers" DROP CONSTRAINT IF EXISTS "counter_offers_createdById_fkey";

ALTER TABLE "counter_offers" DROP CONSTRAINT IF EXISTS "counter_offers_tradeId_fkey";

DROP INDEX IF EXISTS "counter_offers_createdAt_idx";

DROP INDEX IF EXISTS "counter_offers_status_idx";

DROP INDEX IF EXISTS "counter_offers_createdById_idx";

DROP INDEX IF EXISTS "counter_offers_tradeId_idx";

DROP TABLE IF EXISTS "counter_offers" CASCADE;

DROP TYPE IF EXISTS "CounterOfferStatus";