-- Rollback SQL for migration: 20251120190311_init
-- Generated: 2025-12-17T07:28:45.248Z
--
-- This rollback was generated with schema catalog awareness.
-- Dropped columns/indexes/constraints are restored with their original definitions.
--
-- To execute: yarn migrate:rollback 20251120190311_init

ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "notifications_userId_fkey";

ALTER TABLE "comments" DROP CONSTRAINT IF EXISTS "comments_itemId_fkey";

ALTER TABLE "comments" DROP CONSTRAINT IF EXISTS "comments_userId_fkey";

ALTER TABLE "likes" DROP CONSTRAINT IF EXISTS "likes_itemId_fkey";

ALTER TABLE "likes" DROP CONSTRAINT IF EXISTS "likes_userId_fkey";

ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "reviews_tradeId_fkey";

ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "reviews_targetId_fkey";

ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "reviews_authorId_fkey";

ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "messages_tradeId_fkey";

ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "messages_senderId_fkey";

ALTER TABLE "trades" DROP CONSTRAINT IF EXISTS "trades_itemRequestedId_fkey";

ALTER TABLE "trades" DROP CONSTRAINT IF EXISTS "trades_itemOfferedId_fkey";

ALTER TABLE "trades" DROP CONSTRAINT IF EXISTS "trades_responderId_fkey";

ALTER TABLE "trades" DROP CONSTRAINT IF EXISTS "trades_proposerId_fkey";

ALTER TABLE "item_images" DROP CONSTRAINT IF EXISTS "item_images_itemId_fkey";

ALTER TABLE "items" DROP CONSTRAINT IF EXISTS "items_userId_fkey";

DROP INDEX IF EXISTS "notifications_createdAt_idx";

DROP INDEX IF EXISTS "notifications_isRead_idx";

DROP INDEX IF EXISTS "notifications_userId_idx";

DROP INDEX IF EXISTS "comments_createdAt_idx";

DROP INDEX IF EXISTS "comments_userId_idx";

DROP INDEX IF EXISTS "comments_itemId_idx";

DROP INDEX IF EXISTS "likes_userId_itemId_key";

DROP INDEX IF EXISTS "likes_userId_idx";

DROP INDEX IF EXISTS "likes_itemId_idx";

DROP INDEX IF EXISTS "reviews_authorId_tradeId_key";

DROP INDEX IF EXISTS "reviews_authorId_idx";

DROP INDEX IF EXISTS "reviews_targetId_idx";

DROP INDEX IF EXISTS "messages_createdAt_idx";

DROP INDEX IF EXISTS "messages_senderId_idx";

DROP INDEX IF EXISTS "messages_tradeId_idx";

DROP INDEX IF EXISTS "trades_createdAt_idx";

DROP INDEX IF EXISTS "trades_status_idx";

DROP INDEX IF EXISTS "trades_responderId_idx";

DROP INDEX IF EXISTS "trades_proposerId_idx";

DROP INDEX IF EXISTS "item_images_itemId_idx";

DROP INDEX IF EXISTS "items_createdAt_idx";

DROP INDEX IF EXISTS "items_status_idx";

DROP INDEX IF EXISTS "items_category_idx";

DROP INDEX IF EXISTS "items_userId_idx";

DROP INDEX IF EXISTS "users_createdAt_idx";

DROP INDEX IF EXISTS "users_username_idx";

DROP INDEX IF EXISTS "users_email_idx";

DROP INDEX IF EXISTS "users_username_key";

DROP INDEX IF EXISTS "users_email_key";

DROP TABLE IF EXISTS "notifications" CASCADE;

DROP TABLE IF EXISTS "comments" CASCADE;

DROP TABLE IF EXISTS "likes" CASCADE;

DROP TABLE IF EXISTS "reviews" CASCADE;

DROP TABLE IF EXISTS "messages" CASCADE;

DROP TABLE IF EXISTS "trades" CASCADE;

DROP TABLE IF EXISTS "item_images" CASCADE;

DROP TABLE IF EXISTS "items" CASCADE;

DROP TABLE IF EXISTS "users" CASCADE;

DROP TYPE IF EXISTS "NotificationType";

DROP TYPE IF EXISTS "TradeStatus";

DROP TYPE IF EXISTS "ItemStatus";

DROP TYPE IF EXISTS "ItemCondition";