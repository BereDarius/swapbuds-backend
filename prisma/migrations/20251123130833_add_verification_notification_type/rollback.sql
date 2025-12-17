-- Rollback SQL for migration: 20251123130833_add_verification_notification_type
-- Generated: 2025-12-17T07:28:45.269Z
--
-- This rollback was generated with schema catalog awareness.
-- Dropped columns/indexes/constraints are restored with their original definitions.
--
-- To execute: yarn migrate:rollback 20251123130833_add_verification_notification_type

-- ⚠️  MANUAL ROLLBACK REQUIRED: PostgreSQL doesn't easily support removing enum values
-- You may need to recreate the enum type "NotificationType" without value 'VERIFICATION_SUBMITTED'