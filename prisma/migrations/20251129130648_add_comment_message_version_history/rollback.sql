-- Rollback SQL for migration: 20251129130648_add_comment_message_version_history
-- Generated: 2025-12-17T07:28:45.280Z
--
-- This rollback was generated with schema catalog awareness.
-- Dropped columns/indexes/constraints are restored with their original definitions.
--
-- To execute: yarn migrate:rollback 20251129130648_add_comment_message_version_history

ALTER TABLE "flagged_comments" DROP CONSTRAINT IF EXISTS "flagged_comments_reviewedById_fkey";

ALTER TABLE "flagged_comments" DROP CONSTRAINT IF EXISTS "flagged_comments_reportedById_fkey";

ALTER TABLE "flagged_comments" DROP CONSTRAINT IF EXISTS "flagged_comments_commentId_fkey";

ALTER TABLE "comment_likes" DROP CONSTRAINT IF EXISTS "comment_likes_commentId_fkey";

ALTER TABLE "comment_likes" DROP CONSTRAINT IF EXISTS "comment_likes_userId_fkey";

ALTER TABLE "comment_versions" DROP CONSTRAINT IF EXISTS "comment_versions_commentId_fkey";

ALTER TABLE "comments" DROP CONSTRAINT IF EXISTS "comments_deletedBy_fkey";

ALTER TABLE "comments" DROP CONSTRAINT IF EXISTS "comments_parentId_fkey";

ALTER TABLE "message_versions" DROP CONSTRAINT IF EXISTS "message_versions_messageId_fkey";

ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "messages_deletedBy_fkey";

DROP INDEX IF EXISTS "messages_isDeleted_idx";

DROP INDEX IF EXISTS "comments_isDeleted_idx";

DROP INDEX IF EXISTS "comments_parentId_idx";

DROP INDEX IF EXISTS "flagged_comments_createdAt_idx";

DROP INDEX IF EXISTS "flagged_comments_reason_idx";

DROP INDEX IF EXISTS "flagged_comments_status_idx";

DROP INDEX IF EXISTS "flagged_comments_reportedById_idx";

DROP INDEX IF EXISTS "flagged_comments_commentId_idx";

DROP INDEX IF EXISTS "comment_likes_userId_commentId_key";

DROP INDEX IF EXISTS "comment_likes_userId_idx";

DROP INDEX IF EXISTS "comment_likes_commentId_idx";

DROP INDEX IF EXISTS "comment_versions_createdAt_idx";

DROP INDEX IF EXISTS "comment_versions_commentId_idx";

DROP INDEX IF EXISTS "message_versions_createdAt_idx";

DROP INDEX IF EXISTS "message_versions_messageId_idx";

DROP TABLE IF EXISTS "flagged_comments" CASCADE;

DROP TABLE IF EXISTS "comment_likes" CASCADE;

DROP TABLE IF EXISTS "comment_versions" CASCADE;

DROP TABLE IF EXISTS "message_versions" CASCADE;

ALTER TABLE "messages" DROP COLUMN IF EXISTS "deleteReason";
ALTER TABLE "messages" DROP COLUMN IF EXISTS "deletedAt";
ALTER TABLE "messages" DROP COLUMN IF EXISTS "deletedBy";
ALTER TABLE "messages" DROP COLUMN IF EXISTS "editedAt";
ALTER TABLE "messages" DROP COLUMN IF EXISTS "isEdited";

ALTER TABLE "comments" DROP COLUMN IF EXISTS "deleteReason";
ALTER TABLE "comments" DROP COLUMN IF EXISTS "deletedAt";
ALTER TABLE "comments" DROP COLUMN IF EXISTS "deletedBy";
ALTER TABLE "comments" DROP COLUMN IF EXISTS "editedAt";
ALTER TABLE "comments" DROP COLUMN IF EXISTS "isDeleted";
ALTER TABLE "comments" DROP COLUMN IF EXISTS "isEdited";
ALTER TABLE "comments" DROP COLUMN IF EXISTS "parentId";