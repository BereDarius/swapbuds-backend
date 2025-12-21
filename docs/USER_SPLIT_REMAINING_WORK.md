# Remaining Work for User/Admin Split

## Critical Issues (Must Fix Before PR)

### 1. UserRole References in Services

**Files affected:**

- `src/support/support-chat.service.ts` - Lines 150, 251, 360 (checking UserRole.ADMIN/SUPPORT for access)
- `src/disputes/disputes.service.ts` - Line 146 (checking UserRole.ADMIN for access)
- `src/notifications/notifications.service.ts` - Line 480 (querying users with UserRole.ADMIN)
- `src/admin/admin.service.ts` - Line 219 (checking UserRole.ADMIN)

**Issue:** These services are checking `UserRole.ADMIN` but admins are now in a separate table with `AdminRole`.

**Solution:** Remove these checks or refactor to use AdminUser queries.

### 2. Verification Service

**File:** `src/verification/verification.service.ts`
**Issue:** Uses `adminId` and `reviewedBy` but reviewedBy is a string, not a relation to AdminUser.

**Solution:** Verify that `reviewedBy` field is being used correctly as adminId reference.

### 3. Support Chat Access Control

**Files:**

- `src/support/support-chat.service.ts`
- `src/support/support-queue.service.ts`

**Issue:** Access control logic checks if user has UserRole.ADMIN/SUPPORT but admins are now separate.

**Solution:**

- Remove UserRole checks for admins
- Assume if agentId matches, it's an admin (from admin_users table)
- Update access control to not check user roles for admin operations

### 4. Notifications Service

**File:** `src/notifications/notifications.service.ts` - Line 480
**Code:** `where: { role: UserRole.ADMIN, isActive: true }`

**Issue:** Trying to find admins in users table.

**Solution:** Change to query `adminUser` table with AdminRole.ADMIN.

## Non-Critical Issues (Can defer to later PR)

### 1. Test Files

**Files affected:**

- All `*.spec.ts` files referencing UserRole.ADMIN/MODERATOR/SUPPORT
- Frontend test files (swapbuds-frontend)

**Solution:** Update in separate PR after services are fixed.

### 2. DTOs and Examples

**Files:**

- `src/admin/dto/admin.dto.ts` - API documentation examples

**Solution:** Update examples to use AdminRole enum.

### 3. Controllers

**Files:** All admin controllers need to use `AdminJwtAuthGuard` instead of `JwtAuthGuard`

**Solution:** Systematic controller update in next commit.

## Recommended Fix Order

1. ✅ Support services (DONE)
2. **Remove UserRole.ADMIN checks from support-chat.service.ts**
3. **Fix notifications.service.ts admin query**
4. **Remove UserRole.ADMIN check from disputes.service.ts**
5. **Fix admin.service.ts UserRole check**
6. Update controllers to use AdminJwtAuthGuard
7. Run migration on dev database
8. Write/update tests
9. Create PR

## Current Status

### Completed

- ✅ Prisma schema split
- ✅ Migration created with data migration
- ✅ AdminAuthModule with JWT strategy
- ✅ Support services updated for userSenderId/adminSenderId
- ✅ SupportQueueService updated to query admin_users

### In Progress

- 🔄 Removing UserRole.ADMIN/MODERATOR/SUPPORT checks
- 🔄 Updating service access control logic

### Not Started

- ❌ Controller updates for AdminJwtAuthGuard
- ❌ Test updates
- ❌ Running migration
- ❌ Frontend updates
