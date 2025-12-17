-- Rollback SQL for migration: 20251123084154_add_preferred_delivery_method
-- Generated: 2025-12-17T07:28:45.263Z
--
-- This rollback was generated with schema catalog awareness.
-- Dropped columns/indexes/constraints are restored with their original definitions.
--
-- To execute: yarn migrate:rollback 20251123084154_add_preferred_delivery_method

ALTER TABLE "user_settings" DROP COLUMN IF EXISTS "preferredDeliveryMethod";