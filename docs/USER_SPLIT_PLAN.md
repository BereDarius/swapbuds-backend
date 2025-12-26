# User Split Implementation Plan

## Overview

Split the single `User` model into two separate tables:

- **`User`** - Regular users (trading, items, messages)
- **`AdminUser`** - Administrative users (ADMIN, MODERATOR, SUPPORT)

## Goals

1. Separate authentication systems
2. Isolate admin data from user data
3. Simplify permissions and security
4. Enable separate frontend apps

## Current State Analysis

### User Model Relations (28 relations)

**Regular User Relations** (Keep with User):

- `items` - Item ownership
- `tradesProposed` / `tradesReceived` - Trading
- `reviewsGiven` / `reviewsReceived` - Reviews
- `messages` / `conversationsAsUser1` / `conversationsAsUser2` - Messaging
- `likes` - Item likes
- `comments` - Comments on items
- `commentLikes` - Comment likes
- `counterOffers` - Trade counter offers
- `verification` - ID verification
- `notifications` - User notifications
- `notificationPreferences` - Notification settings
- `settings` - User settings
- `oauthAccounts` - OAuth logins
- `mfaSecret` - MFA for users
- `legalConsents` - GDPR consents

**Admin-Only Relations** (Move to AdminUser):

- `auditLogs` - Admin actions
- `flaggedItemsReviewed` / `flaggedCommentsReviewed` - Moderation reviews
- `disputesAdministered` - Dispute resolution
- `supportChatsAsAgent` - Support agent
- `supportMessages` (when sender is admin)

**Shared Relations** (Keep in both):

- `flaggedItemsReported` / `flaggedCommentsReported` - Regular users can report
- `disputesReported` / `disputesAgainst` - Regular users can dispute
- `supportChatsAsUser` - Regular users need support
- `messagesDeleted` / `commentsDeleted` - Anyone can delete

## Implementation Strategy

### Phase 1: Schema Design

#### New AdminUser Model

```prisma
model AdminUser {
  id        String    @id @default(cuid())
  email     String    @unique
  username  String    @unique
  password  String    // Hashed
  avatarUrl String?

  // Role (no USER role)
  role AdminRole @default(SUPPORT)

  // Timestamps
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  lastLoginAt DateTime?

  // Status
  isActive Boolean @default(true)

  // MFA (admins should have MFA)
  mfaEnabled Boolean      @default(false)
  mfaSecret  AdminMFASecret?

  // Relations - Admin-only
  auditLogsPerformed      AuditLog[]       @relation("AdminAuditLogs")
  flaggedItemsReviewed    FlaggedItem[]    @relation("AdminFlagReviewer")
  flaggedCommentsReviewed FlaggedComment[] @relation("AdminCommentReviewer")
  disputesAdministered    Dispute[]        @relation("AdminDisputes")
  supportChatsAsAgent     SupportChat[]    @relation("AdminSupportAgent")
  supportMessagesAsSender SupportMessage[] @relation("AdminSupportMessage")

  @@index([email])
  @@index([username])
  @@index([role])
  @@map("admin_users")
}

enum AdminRole {
  SUPPORT    // Can handle support tickets
  MODERATOR  // Can moderate content
  ADMIN      // Full admin access
}

model AdminMFASecret {
  id          String    @id @default(cuid())
  adminUserId String    @unique
  secret      String    // Encrypted
  createdAt   DateTime  @default(now())

  adminUser AdminUser @relation(fields: [adminUserId], references: [id], onDelete: Cascade)

  @@map("admin_mfa_secrets")
}
```

#### Updated User Model

Remove admin-related fields and relations:

```prisma
model User {
  // Remove: role field (no more ADMIN/MODERATOR/SUPPORT)
  // Keep: all trading/social features
  // Remove: auditLogs, flaggedItemsReviewed, flaggedCommentsReviewed, disputesAdministered
}
```

### Phase 2: Migration Strategy

#### Step 1: Create AdminUser table

- Create new `admin_users` table
- Create `admin_mfa_secrets` table
- Add `AdminRole` enum

#### Step 2: Data Migration

- Copy existing ADMIN/MODERATOR/SUPPORT users to `admin_users`
- Update foreign keys in related tables
- Delete admin users from `users` table

#### Step 3: Update Relations

- Update `AuditLog.performedById` to reference `AdminUser`
- Update `FlaggedItem.reviewedById` to reference `AdminUser`
- Update `FlaggedComment.reviewedById` to reference `AdminUser`
- Update `Dispute.adminId` to reference `AdminUser`
- Update `SupportChat.agentId` to reference `AdminUser`

### Phase 3: Backend Updates

#### Authentication

- Create separate `AdminAuthModule`
- Separate JWT strategies: `JwtStrategy` (users) + `AdminJwtStrategy` (admins)
- Separate guards: `JwtAuthGuard` + `AdminJwtAuthGuard`
- Separate endpoints: `/auth/*` (users) + `/admin/auth/*` (admins)

#### Services

- `UsersService` - Remove admin operations
- Create `AdminUsersService` - Admin CRUD
- Update `AuditLogService` - Use AdminUser
- Update `ModerationService` - Use AdminUser
- Update `DisputeService` - Use AdminUser
- Update `SupportService` - Use AdminUser

#### Controllers

- Update `AdminController` - Use AdminUser authentication
- Update `ModerationController` - Use AdminUser
- Update `DisputeController` - Use AdminUser
- Update `SupportController` - Use AdminUser

### Phase 4: Testing

- Unit tests for `AdminUsersService`
- Unit tests for `AdminAuthService`
- Integration tests for admin authentication
- Integration tests for admin operations
- E2E tests for admin workflows

### Phase 5: Documentation

- Update API docs
- Update architecture docs
- Create admin authentication guide
- Update deployment guide

## Breaking Changes

### API Changes

**Before:**

```
POST /auth/register (role: USER|ADMIN|MODERATOR|SUPPORT)
POST /auth/login
```

**After:**

```
# Regular users
POST /auth/register (no role param)
POST /auth/login

# Admin users
POST /admin/auth/login
GET /admin/auth/me
```

### Database Schema Changes

- New table: `admin_users`
- New table: `admin_mfa_secrets`
- Updated foreign keys in:
  - `audit_logs.performed_by_id` → `admin_users.id`
  - `flagged_items.reviewed_by_id` → `admin_users.id`
  - `flagged_comments.reviewed_by_id` → `admin_users.id`
  - `disputes.admin_id` → `admin_users.id`
  - `support_chats.agent_id` → `admin_users.id`

## Rollout Plan

### Phase 1: Development (1-2 days)

1. Create feature branch
2. Update Prisma schema
3. Create migration
4. Update authentication
5. Update services
6. Write tests

### Phase 2: Testing (1 day)

1. Run all tests
2. Manual testing
3. Performance testing

### Phase 3: Deployment (Careful!)

1. Backup database
2. Run migration
3. Deploy backend
4. Verify admin access
5. Monitor errors

## Risks & Mitigation

### Risk 1: Data Loss During Migration

**Mitigation:**

- Comprehensive backup before migration
- Dry-run migration in staging
- Rollback plan ready

### Risk 2: Breaking Existing Admin Access

**Mitigation:**

- Create admin users BEFORE deleting from users table
- Test admin login extensively
- Keep fallback authentication

### Risk 3: Foreign Key Cascades

**Mitigation:**

- Use transactions for migration
- Validate all foreign keys
- Test cascade deletes

## ✅ Design Decisions (Approved)

1. **Existing admin user data**: DELETE
   - Admins shouldn't trade
   - All items/trades/messages by current admin users will be deleted during migration

2. **Dual accounts**: ALLOWED (same email OK)
   - Admins must create separate regular user accounts to trade
   - Same email address can be used for both admin and user accounts
   - Completely separate authentications

3. **OAuth for admins**: NO
   - Admins restricted to email/password only
   - No Google/Facebook/Apple OAuth for admin accounts

4. **MFA enforcement**: REQUIRED for admins, OPTIONAL for users
   - All admin users MUST have MFA enabled
   - Regular users can optionally enable MFA

## Next Steps

1. ✅ Review this plan
2. Create feature branch
3. Start with schema changes
4. Build incrementally with tests

---

**Status:** Awaiting approval to proceed
**Created:** December 21, 2025
**Author:** AI Assistant
