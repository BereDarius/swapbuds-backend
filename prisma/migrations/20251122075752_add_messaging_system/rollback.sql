-- Rollback SQL for migration: 20251122075752_add_messaging_system
-- Generated: 2025-12-17T07:28:45.253Z
--
-- This rollback was generated with schema catalog awareness.
-- Dropped columns/indexes/constraints are restored with their original definitions.
--
-- To execute: yarn migrate:rollback 20251122075752_add_messaging_system

ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "messages_conversationId_fkey";

ALTER TABLE "conversations" DROP CONSTRAINT IF EXISTS "conversations_tradeId_fkey";

ALTER TABLE "conversations" DROP CONSTRAINT IF EXISTS "conversations_user2Id_fkey";

ALTER TABLE "conversations" DROP CONSTRAINT IF EXISTS "conversations_user1Id_fkey";

DROP INDEX IF EXISTS "messages_isRead_idx";

DROP INDEX IF EXISTS "messages_conversationId_idx";

DROP INDEX IF EXISTS "conversations_user1Id_user2Id_key";

DROP INDEX IF EXISTS "conversations_lastMessageAt_idx";

DROP INDEX IF EXISTS "conversations_tradeId_idx";

DROP INDEX IF EXISTS "conversations_user2Id_idx";

DROP INDEX IF EXISTS "conversations_user1Id_idx";

DROP INDEX IF EXISTS "conversations_tradeId_key";

DROP TABLE IF EXISTS "conversations" CASCADE;

-- Restore dropped column (originally defined in 20251120190311_init)
ALTER TABLE "messages" ADD COLUMN "tradeId" TEXT NOT NULL;

-- Restore dropped index (originally defined in 20251120190311_init)
CREATE INDEX "messages_tradeId_idx" ON "messages"("tradeId");

-- Restore dropped foreign key (originally defined in 20251120190311_init)
ALTER TABLE "messages" ADD CONSTRAINT "messages_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "trades"("id") ON DELETE CASCADE ON UPDATE CASCADE;