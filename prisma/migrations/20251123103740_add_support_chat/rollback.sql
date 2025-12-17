-- Rollback SQL for migration: 20251123103740_add_support_chat
-- Generated: 2025-12-17T07:28:45.267Z
--
-- This rollback was generated with schema catalog awareness.
-- Dropped columns/indexes/constraints are restored with their original definitions.
--
-- To execute: yarn migrate:rollback 20251123103740_add_support_chat

ALTER TABLE "support_messages" DROP CONSTRAINT IF EXISTS "support_messages_senderId_fkey";

ALTER TABLE "support_messages" DROP CONSTRAINT IF EXISTS "support_messages_chatId_fkey";

ALTER TABLE "support_chats" DROP CONSTRAINT IF EXISTS "support_chats_agentId_fkey";

ALTER TABLE "support_chats" DROP CONSTRAINT IF EXISTS "support_chats_userId_fkey";

DROP INDEX IF EXISTS "support_messages_createdAt_idx";

DROP INDEX IF EXISTS "support_messages_senderId_idx";

DROP INDEX IF EXISTS "support_messages_chatId_idx";

DROP INDEX IF EXISTS "support_chats_createdAt_idx";

DROP INDEX IF EXISTS "support_chats_queuePosition_idx";

DROP INDEX IF EXISTS "support_chats_priority_idx";

DROP INDEX IF EXISTS "support_chats_status_idx";

DROP INDEX IF EXISTS "support_chats_agentId_idx";

DROP INDEX IF EXISTS "support_chats_userId_idx";

DROP TABLE IF EXISTS "support_messages" CASCADE;

DROP TABLE IF EXISTS "support_chats" CASCADE;

DROP TYPE IF EXISTS "SupportPriority";

DROP TYPE IF EXISTS "SupportChatStatus";