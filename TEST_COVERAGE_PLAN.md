# Comprehensive Test Coverage Plan

**Target: 100% Code Coverage**
**Current Status: 97.18% (829 tests passing)**
**Date: November 23, 2025**

---

## 🎯 Priority 1: Zero Coverage Modules (CRITICAL)

### 1. Health Module

**Files:** `health.controller.ts`, `redis.health.ts`
**Coverage:** 0% (93 lines + 32 lines = 125 lines)
**Priority:** HIGH - Production health monitoring

#### Test Requirements:

- [ ] **health.controller.spec.ts** (NEW FILE)
  - `GET /health` - Overall health check
  - `GET /health/database` - Prisma health check
  - `GET /health/redis` - Redis health check
  - `GET /health/memory` - Memory health check
  - `GET /health/disk` - Disk health check
  - Mock all health indicators
  - Test healthy and unhealthy states

- [ ] **redis.health.spec.ts** (NEW FILE)
  - Test Redis connection check
  - Test successful ping response
  - Test Redis connection failure
  - Test timeout scenarios
  - Mock Redis client

**Implementation Steps:**

```typescript
// health.controller.spec.ts template
describe('HealthController', () => {
  let controller: HealthController;
  let mockHealthCheckService;
  let mockPrismaHealth;
  let mockRedisHealth;
  let mockMemoryHealth;
  let mockDiskHealth;

  beforeEach(() => {
    // Setup mocks for all health indicators
    mockHealthCheckService = { check: jest.fn() };
    mockPrismaHealth = { pingCheck: jest.fn() };
    mockRedisHealth = { isHealthy: jest.fn() };
    mockMemoryHealth = { checkHeap: jest.fn(), checkRSS: jest.fn() };
    mockDiskHealth = { checkStorage: jest.fn() };
  });

  it('should return overall health status', async () => {
    // Test implementation
  });
});
```

---

### 2. Monitoring Module

**Files:** `monitoring.controller.ts`, `monitoring.interceptor.ts`, `monitoring.service.ts`
**Coverage:** 0% (~200 lines)
**Priority:** HIGH - Production metrics tracking

#### Test Requirements:

- [ ] **monitoring.controller.spec.ts** (NEW FILE)
  - `GET /monitoring/metrics` - Get aggregated metrics
  - `GET /monitoring/errors` - Get error logs (with limit)
  - `GET /monitoring/performance` - Get performance stats
  - Verify AdminGuard is applied
  - Test query parameter handling

- [ ] **monitoring.interceptor.spec.ts** (NEW FILE)
  - Test request/response tracking
  - Test metric recording (status codes, response times)
  - Test error capture
  - Test performance timing
  - Mock MonitoringService

- [ ] **monitoring.service.spec.ts** (NEW FILE)
  - Test metric aggregation
  - Test error log storage (max 10,000 entries)
  - Test performance calculation (avg, p95, p99)
  - Test metric cleanup (24-hour retention)
  - Test active user tracking

**Implementation Priority:**

1. Service tests (core logic)
2. Interceptor tests (data collection)
3. Controller tests (API endpoints)

---

## 🔧 Priority 2: Partial Coverage - Critical Paths

### 3. Admin Module

**Files:** `admin.controller.ts` (lines 224, 242, 259), `admin.service.ts` (lines 321-500)
**Current Coverage:** ~85%
**Missing:** Error handling branches, edge cases

#### Test Requirements:

- [ ] **admin.controller.spec.ts** (ENHANCE)
  - Line 224: Test error handling in ban user endpoint
  - Line 242: Test error handling in unban user endpoint
  - Line 259: Test error handling in change role endpoint
  - Add tests for invalid user IDs
  - Add tests for permission denied scenarios

- [ ] **admin.service.spec.ts** (ENHANCE)
  - Lines 321-500: Test audit log complex queries
  - Test pagination edge cases (page 0, negative page)
  - Test filtering with multiple criteria
  - Test date range queries
  - Test performance with large datasets

**Code to Cover:**

```typescript
// admin.controller.ts:224 (ban user error handling)
try {
  await this.adminService.banUser(userId, req.user.userId, reason);
} catch (error) {
  throw new BadRequestException('Failed to ban user');
}
```

---

### 4. Cache Module

**Files:** Multiple decorators and interceptors
**Current Coverage:** ~90%
**Missing:** Edge cases and error paths

#### Test Requirements:

- [ ] **cache-monitoring.service.spec.ts** (ENHANCE)
  - Lines 111-112: Test cache miss scenarios
  - Test concurrent access patterns
  - Test cache invalidation edge cases

- [ ] **cache-warming.service.spec.ts** (ENHANCE)
  - Line 75: Test warming failure recovery
  - Test warming on cold start
  - Test warming with empty database

- [ ] **cacheable.decorator.spec.ts** (ENHANCE)
  - Lines 57-60: Test key generation edge cases
  - Line 140: Test TTL override scenarios
  - Test cache key collisions
  - Test circular reference handling

- [ ] **http-cache.interceptor.spec.ts** (ENHANCE)
  - Line 54: Test cache bypass conditions
  - Line 105: Test cache serialization failures
  - Line 139: Test cache eviction scenarios

---

### 5. Disputes Module

**File:** `disputes.service.ts` (line 192)
**Current Coverage:** ~95%
**Missing:** Edge case in resolution logic

#### Test Requirements:

- [ ] **disputes.service.spec.ts** (ENHANCE)
  - Line 192: Test dispute resolution with invalid evidence
  - Test resolution with missing trade
  - Test concurrent resolution attempts
  - Test resolution notification failures

---

### 6. Items Module

**Files:** `items.controller.ts`, `items.service.ts`, `recommendations.service.ts`
**Current Coverage:** ~92%
**Missing:** Complex query paths and error handling

#### Test Requirements:

- [ ] **items.controller.spec.ts** (ENHANCE)
  - Lines 283-284: Test upload image error handling
  - Lines 314-315: Test delete image error handling
  - Test concurrent image upload
  - Test image size limits

- [ ] **items.service.spec.ts** (ENHANCE)
  - Lines 89-137: Test complex search queries
  - Test search with multiple filters
  - Test search pagination edge cases
  - Line 411: Test item deletion with active trades

- [ ] **recommendations.service.spec.ts** (ENHANCE)
  - Line 164: Test recommendation with no user history
  - Line 182: Test recommendation with cold start problem
  - Test recommendation algorithm accuracy

---

### 7. Moderation Module

**Files:** `moderation.controller.ts`, `moderation.service.ts`
**Current Coverage:** ~88%
**Missing:** Bulk operation edge cases

#### Test Requirements:

- [ ] **moderation.controller.spec.ts** (ENHANCE)
  - Lines 241-242: Test bulk approve error handling
  - Lines 264-265: Test bulk reject error handling
  - Lines 288-289: Test bulk remove error handling
  - Test partial failure in bulk operations
  - Test transaction rollback scenarios

- [ ] **moderation.service.spec.ts** (ENHANCE)
  - Lines 508-717: Test moderation queue complex logic
  - Test priority queue ordering
  - Test concurrent moderation actions
  - Test moderation history tracking
  - Test flag aggregation logic

---

### 8. Notifications Module

**Files:** `notifications.controller.ts`, `notifications.service.ts`
**Current Coverage:** ~93%
**Missing:** Notification delivery edge cases

#### Test Requirements:

- [ ] **notifications.controller.spec.ts** (ENHANCE)
  - Line 168: Test mark as read error handling
  - Line 188: Test mark all as read error handling
  - Test notification pagination edge cases

- [ ] **notifications.service.spec.ts** (ENHANCE)
  - Line 56: Test notification creation failure recovery
  - Test notification batching
  - Test notification delivery retries
  - Test notification expiration

---

### 9. Support Module

**Files:** `support-chat.gateway.ts`, `support-chat.service.ts`, `support-queue.service.ts`
**Current Coverage:** ~94%
**Missing:** WebSocket edge cases

#### Test Requirements:

- [ ] **support-chat.gateway.spec.ts** (ENHANCE)
  - Line 18: Test WebSocket connection error handling
  - Test connection timeout scenarios
  - Test disconnection handling
  - Test reconnection logic

- [ ] **support-chat.service.spec.ts** (ENHANCE)
  - Line 244: Test chat creation with invalid user
  - Line 299: Test message send failure
  - Line 307: Test chat resolution edge cases
  - Line 353: Test chat assignment conflicts

- [ ] **support-queue.service.spec.ts** (ENHANCE)
  - Line 219: Test queue overflow handling
  - Test queue priority calculation
  - Test agent availability edge cases

---

### 10. Trades Module

**Files:** `trade-expiration.service.ts`, `trades.service.ts`
**Current Coverage:** ~91%
**Missing:** Complex trade lifecycle edge cases

#### Test Requirements:

- [ ] **trade-expiration.service.spec.ts** (ENHANCE)
  - Lines 27-31: Test expiration job error handling
  - Test expiration with timezone edge cases
  - Test bulk expiration scenarios

- [ ] **trades.service.spec.ts** (ENHANCE)
  - Line 136: Test trade creation with invalid items
  - Line 208: Test trade acceptance conflicts
  - Line 363: Test trade completion edge cases
  - Line 733: Test counter-offer edge cases
  - Line 737: Test counter-offer validation
  - Line 835: Test trade dispute scenarios
  - Line 845: Test trade cancellation conflicts
  - Line 922: Test trade history complex queries

---

### 11. Users Module

**Files:** `users.controller.ts`, `users.service.ts`
**Current Coverage:** ~94%
**Missing:** Profile update edge cases

#### Test Requirements:

- [ ] **users.controller.spec.ts** (ENHANCE)
  - Line 217: Test profile update error handling
  - Line 246: Test settings update error handling
  - Line 270: Test avatar upload error handling
  - Test concurrent profile updates

- [ ] **users.service.spec.ts** (ENHANCE)
  - Line 484: Test user deletion with dependencies
  - Test cascading deletion scenarios
  - Test user anonymization

---

### 12. Verification Module

**Files:** `document-security.service.ts`, `verification-audit.service.ts`, `verification-cleanup.service.ts`, `verification.service.ts`
**Current Coverage:** ~96%
**Missing:** Security and cleanup edge cases

#### Test Requirements:

- [ ] **document-security.service.spec.ts** (ENHANCE)
  - Lines 49-50: Test encryption key rotation
  - Lines 116-117: Test decryption failure recovery
  - Test signed URL expiration edge cases

- [ ] **verification-audit.service.spec.ts** (ENHANCE)
  - Line 64: Test audit log write failure
  - Test audit log retention policy
  - Test audit log query performance

- [ ] **verification-cleanup.service.spec.ts** (ENHANCE)
  - Line 104: Test cleanup job error handling
  - Test cleanup with locked resources
  - Test cleanup transaction rollback

- [ ] **verification.service.spec.ts** (ENHANCE)
  - Line 253: Test verification approval edge cases
  - Test verification rejection with invalid reason
  - Test verification state transitions

---

## 📋 Implementation Strategy

### Phase 1: Zero Coverage (Week 1)

**Goal:** Add tests for Health and Monitoring modules

- Day 1-2: Health module tests
- Day 3-5: Monitoring module tests
- **Expected coverage increase:** +2.5% → 99.68%

### Phase 2: Critical Paths (Week 2)

**Goal:** Cover all error handling branches

- Day 1-2: Admin and Cache modules
- Day 3-4: Items and Moderation modules
- Day 5: Disputes and Notifications modules
- **Expected coverage increase:** +0.8% → 100%

### Phase 3: Edge Cases (Week 3)

**Goal:** Cover all remaining edge cases

- Day 1-2: Support and Trades modules
- Day 3-4: Users and Verification modules
- Day 5: Final cleanup and validation
- **Expected coverage increase:** Maintain 100%

---

## 🧪 Testing Best Practices

### 1. **Mock Strategy**

```typescript
// Always mock external dependencies
const mockPrismaService = {
  user: { findUnique: jest.fn(), update: jest.fn() },
  // ... other methods
};

// Use factory functions for reusable mocks
function createMockUser(overrides = {}) {
  return { id: 'user-1', email: 'test@example.com', ...overrides };
}
```

### 2. **Test Structure**

```typescript
describe('ServiceName', () => {
  describe('methodName', () => {
    it('should handle success case', () => {});
    it('should handle error case', () => {});
    it('should handle edge case', () => {});
  });
});
```

### 3. **Coverage Verification**

```bash
# Run with coverage
yarn test:cov

# Check specific file
yarn test:cov -- users.service.spec.ts

# Generate HTML report
yarn test:cov --coverageDirectory=coverage
```

### 4. **Common Patterns to Test**

- ✅ Success paths
- ✅ Error handling (try/catch blocks)
- ✅ Validation failures
- ✅ Permission checks
- ✅ Not found scenarios
- ✅ Concurrent operations
- ✅ Transaction rollbacks
- ✅ Rate limiting
- ✅ Timeouts
- ✅ Null/undefined inputs

---

## 📊 Success Metrics

### Coverage Targets

- **Overall:** 100%
- **Statements:** 100%
- **Branches:** 100%
- **Functions:** 100%
- **Lines:** 100%

### Quality Metrics

- **Test Count:** 1000+ tests
- **Test Speed:** < 15 seconds total
- **Flaky Tests:** 0
- **Skipped Tests:** 0

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd swapbuds-backend
yarn install
```

### 2. Run Tests

```bash
# All tests
yarn test

# With coverage
yarn test:cov

# Watch mode
yarn test:watch

# Specific file
yarn test health.controller.spec.ts
```

### 3. Create New Test File

```bash
# Use existing tests as templates
cp src/auth/auth.service.spec.ts src/health/health.controller.spec.ts
```

### 4. Verify Coverage

```bash
# Generate coverage report
yarn test:cov

# Open HTML report
open coverage/lcov-report/index.html
```

---

## 📝 Notes

- **Priority:** Focus on zero-coverage modules first
- **Quality:** Ensure tests are meaningful, not just coverage-chasing
- **Maintenance:** Keep tests up-to-date with code changes
- **Documentation:** Document complex test scenarios
- **CI/CD:** Ensure tests run in CI pipeline before merge

---

## ✅ Definition of Done

- [ ] All files have 100% coverage
- [ ] All tests pass consistently
- [ ] No flaky tests
- [ ] Test execution time < 15s
- [ ] Coverage report generated
- [ ] Documentation updated
- [ ] CI/CD pipeline passing

---

**Last Updated:** November 23, 2025
**Next Review:** December 1, 2025
