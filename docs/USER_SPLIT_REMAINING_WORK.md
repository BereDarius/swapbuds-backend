# Remaining Work for User/Admin Split

## Critical Issues (Must Fix Before PR)

### 1. ~~UserRole References in Services~~ ✅ FIXED

**Files fixed:**

- ✅ `src/support/support-chat.service.ts` - Removed UserRole parameters, updated access control
- ✅ `src/support/support-chat.controller.ts` - Removed UserRole parameters from service calls
- ✅ `src/disputes/disputes.service.ts` - Removed UserRole.ADMIN check, simplified access control
- ✅ `src/notifications/notifications.service.ts` - Changed to query admin_users with AdminRole.ADMIN

**Status:** COMPLETE

### 2. ~~Controllers Using Old Guards~~ ✅ FIXED

**Files fixed:**

- ✅ `src/admin/admin.controller.ts` - Using AdminJwtAuthGuard + AdminRoles
- ✅ `src/support/support-chat.controller.ts` - Replaced SupportGuard with AdminJwtAuthGuard
- ✅ `src/disputes/disputes.controller.ts` - Replaced 4 AdminGuard usages
- ✅ `sr~~Support Tests~~ ✅ FIXED

**Files fixed:**

- ✅ `src/support/support-chat.service.spec.ts` - Removed UserRole parameters
- ✅ `src/support/support-chat.controller.spec.ts` - Removed role from req.user mocks
- ✅ `src/support/support-queue.service.spec.ts` - Updated to query admin_users

**Status:** COMPLETE

**Issue:** Access control logic checks if user has UserRole.ADMIN/SUPPORT but admins are now separate.

**Solution:**

- Remove UserRole checks for admins
- Assume if agentId matches, it's an admin (from admin_users table)
- Update access control to not check user roles for admin operations

### 4. Notifications Service

**File:** `src/notifications/notifications.service.ts` - Line 480
**Code:** `where: { role: UserRole.ADMIN, isActive: true }`

\*\* Remaining Minor Issues

### 1. Admin Service UserRole Check

**File:** `src/admin/admin.service.ts` - Line 219
**Issue:** Still checks UserRole.ADMIN (but this is for checking if REGULAR users can be banned)
**Solution:** Review and potentially remove/refactor

### 2. Old Guard Files

**Files:**

- `src/auth/guards/admin.guard.ts`
- `src/auth/guards/moderator.guard.ts`
- `src/auth/guards/support.guard.ts`

**Status:** Deprecated but not yet removed (controllers now use AdminJwtAuthGuard)
**Solution:** Can be safely deleted in next PR

### 3. Test Files

**Files affected:**

- Admin tests (`src/admin/admin.controller.spec.ts`, etc.)
- Frontend test files (swapbuds-frontend)

**Status:** Tests reference UserRole.ADMIN/MODERATOR in examples
**Solution:** Update in separate PR or ignore (non-breaking)e.ts** 3. **Fix notifications.service.ts admin query** 4. **Remove UserRole.ADMIN check from disputes.service.ts** 5. **Fix admin.service.ts UserRole check\*\* 6. Update controllers to use AdminJwtAuthGuard 7. Run migration on dev database 8. Write/update tests 9. Create PRNext Steps

1. ✅ ~~Support services~~ (DONE)
2. ✅ ~~Remove UserRole checks from services~~ (DONE)
3. ✅ ~~Update controllers to use AdminJwtAuthGuard~~ (DONE)
4. ✅ ~~Update support tests~~ (DONE)
5. **Review admin.service.ts UserRole check (line 219)**
6. **Run migration on database**
7. **Test admin authentication flow**
8. **Delete deprecated guard files**
9. **Create PR**

## Current Status

### Completed ✅

- ✅ Prisma schema split
- ✅ Migration created with data migration
- ✅ AdminAuthModule with JWT strategy, guards, decorators
- ✅ Support services updated for userSenderId/adminSenderId
- ✅ SupportQueueService updated to query admin_users
- ✅ SupportChatService UserRole parameters removed
- ✅ NotificationsService admin query fixed
- ✅ DisputesService UserRole check removed
- ✅ ALL controllers updated to use AdminJwtAuthGuard
- ✅ Support tests updated

### In Progress 🔄

- 🔄 Reviewing remaining minor issues

### Not Started ❌

- ❌ Running migration on database
- ❌ Testing admin authentication flow
- ❌ Frontend updates (separate branch)
