# SwapBuds Backend - Launch Roadmap (16 Weeks)

**Target Public Launch:** March 17, 2026
**Current Status:** v1.1.0 Content Moderation Complete (756 tests passing, 98.44% coverage)

- ✅ v1.0.4 Complete (Security & Privacy)
- ✅ Core admin features implemented (user management, audit logs, role-based access)
- ✅ Content moderation system (flag/approve/remove items)
- ✅ Comprehensive test coverage for admin, verification, and moderation modules (>88%)
- ⏳ Live support chat system pending

This roadmap is aligned with the [LAUNCH_ROADMAP.md](../plans/LAUNCH_ROADMAP.md) and organized by implementation timeline.

---

## 📅 Implementation Timeline

### PHASE 1: Core Backend Enhancements (Weeks 1-6)

**Focus:** Legal compliance, age verification, and essential features for MVP launch

---

## Week 1-2: Legal Compliance & Age Verification (HIGH PRIORITY)

**Version 1.0.1 - GDPR Compliance & Age Verification**

**Timeline:** Week 1-2 (Dec 2-15, 2025)
**Priority:** CRITICAL - Required before any public launch

### Features

- [x] **Google reCAPTCHA v3 (Invisible) Integration**
- [x] **Bot protection for registration and login**
- [x] **Score-based verification (0.0-1.0 scale)**
- [x] **Token verification with Google API**
- [x] **Configurable score thresholds per action**
- [x] Support for multiple trade delivery methods
- [x] Users can specify preferred delivery method for items
- [x] Delivery method filtering in search and matching
- [x] Trade agreements include delivery method confirmation
- [x] User preferences for default delivery method
- [x] **Estimated price/value field for items**
- [x] **Value range filtering in search**
- [x] **Similar value matching suggestions**

### Technical Implementation

**reCAPTCHA v3 Implementation:**

- [x] Create `RecaptchaModule` and `RecaptchaService`
- [x] Install `axios` for Google API verification
- [x] Add environment variables: `RECAPTCHA_SECRET_KEY`, `RECAPTCHA_MIN_SCORE`
- [x] Implement token verification with Google reCAPTCHA API
- [x] Add score-based validation logic (configurable thresholds)
- [x] Update `RegisterDto` to include optional `recaptchaToken` field
- [x] Update `LoginDto` to include optional `recaptchaToken` field
- [x] Update `AuthService.register()` to verify reCAPTCHA token
- [x] Update `AuthService.login()` to verify reCAPTCHA token
- [x] Add IP tracking for verification requests
- [x] Create `RecaptchaLog` model for score tracking (optional)
- [x] Add logging for failed verifications (score too low, action mismatch)
- [x] Write unit tests for `RecaptchaService`
- [x] Document score thresholds and strategy

**Delivery Methods & Value Fields:**

- [x] Add `deliveryMethods` enum field to Item model (array: PHYSICAL, MAIL, BOTH)
- [x] Add `preferredDeliveryMethod` field to User preferences
- [x] **Add `estimatedValue` field to Item model (decimal, optional)**
- [x] **Add `currency` field to Item model (default: RON)**
- [x] Update ItemsService to filter by delivery method
- [x] **Update ItemsService to filter by value range**
- [x] Modify Trade model to include agreed delivery method
- [x] Update search/filter endpoints to support delivery method
- [x] **Update search/filter endpoints to support value range**
- [x] Add delivery method validation in trade creation
- [x] **Add value validation (must be positive, reasonable limits)**

### API Endpoints

**reCAPTCHA Integration:**

- `POST /auth/register` - Updated to accept optional `recaptchaToken` field
- `POST /auth/login` - Updated to accept optional `recaptchaToken` field

**Delivery Methods & Value:**

- `PATCH /items/:id/delivery-methods` - Update item delivery methods
- `GET /items?deliveryMethod=PHYSICAL|MAIL|BOTH` - Filter items by delivery method
- **`GET /items?minValue=100&maxValue=500&currency=RON` - Filter items by value range**
- `PATCH /users/me/preferences` - Update user delivery preferences (extend existing)
- `POST /trades` - Include deliveryMethod in trade creation (extend existing)

### Database Schema

**reCAPTCHA Logging (Optional - for analytics):**

```prisma
model RecaptchaLog {
  id        String   @id @default(cuid())
  action    String   // register, login, etc.
  score     Float    // 0.0 - 1.0
  ip        String?
  success   Boolean  // true if score >= threshold
  timestamp DateTime @default(now())

  @@index([action])
  @@index([score])
  @@index([timestamp])
}
```

**Delivery Methods & Value:**

```prisma
model Item {
  // ... existing fields
  deliveryMethods DeliveryMethod[] @default([PHYSICAL, MAIL]) // Default to both options
  estimatedValue  Decimal?         // Optional estimated value
  currency        String @default("RON") // RON, EUR, USD
}

model Trade {
  // ... existing fields
  deliveryMethod  DeliveryMethod // Agreed delivery method for this trade
}

model UserPreferences {
  // ... existing fields
  preferredDeliveryMethod DeliveryMethod @default(PHYSICAL)
}

enum DeliveryMethod {
  PHYSICAL  // In-person exchange only
  MAIL      // Ship through mail only
  BOTH      // Flexible, either method works
}
```

### Value Field Guidelines

- **Optional field** - users can choose to provide estimated value
- **Purpose:** Help match items of similar value for fair trades
- **Display:** Show approximate value (e.g., "~500 RON") not exact price
- **Not a selling price** - emphasize this is for matching purposes only
- **Validation:**
  - Min: 1 RON
  - Max: 100,000 RON (adjust based on platform needs)
  - Only positive numbers
- **Privacy:** Users can hide value from public view (show only to potential traders)

### Migration Notes

- Default existing items to support both delivery methods (PHYSICAL, MAIL)
- Add delivery method selection to item creation/edit flow
- Update trade creation to require delivery method agreement
- Add tooltips/help text explaining each delivery method

### Testing

- [ ] Unit tests for delivery method filtering
- [ ] Integration tests for trade creation with delivery methods
- [ ] E2E tests for item creation with delivery preferences
- [ ] Test delivery method mismatch scenarios

---

## Week 3-6: Enhanced Features for MVP (MEDIUM PRIORITY)

**Version 1.0.2 - Additional Features & Smart Matching**

**Timeline:** Week 3-6 (Dec 16-29, 2025)
**Priority:** MEDIUM - Enhanced features for better user experience

### Features Completed in v1.0.1 ✅

- [x] Support for multiple trade delivery methods
- [x] Users can specify preferred delivery method for items
- [x] Delivery method filtering in search and matching
- [x] Trade agreements include delivery method confirmation
- [x] **Estimated price/value field for items**
- [x] **Value range filtering in search**
- [x] Add `deliveryMethods` enum field to Item model (array: PHYSICAL, MAIL)
- [x] **Add `estimatedValue` field to Item model (decimal, optional)**
- [x] **Add `currency` field to Item model (default: EUR)**
- [x] Update ItemsService to filter by delivery method
- [x] **Update ItemsService to filter by value range**
- [x] Modify Trade model to include agreed delivery method
- [x] Update search/filter endpoints to support delivery method
- [x] **Update search/filter endpoints to support value range**
- [x] Add delivery method validation in trade creation
- [x] **Add value validation (must be positive, reasonable limits)**

### Completed Features in v1.0.2 ✅

- [x] User preferences for default delivery method (in UserSettings)
- [x] **Similar value matching suggestions algorithm**
- [x] Smart item recommendations based on user preferences
- [x] RecommendationsService with scoring algorithm
- [x] GET /items/recommendations endpoint
- [x] GET /items/:id/similar endpoint
- [x] 9 comprehensive tests for recommendations (591 total passing)

### Technical Implementation (Remaining)

**User Delivery Preferences:** ✅

- [x] Add `preferredDeliveryMethod` field to UserSettings model
- [x] Update UpdateSettingsDto to include preferredDeliveryMethod
- [x] API endpoint: `PATCH /users/settings` (extend existing)

**Smart Matching Algorithm:** ✅

- [x] Create RecommendationsService
- [x] Implement value-based matching (±20% tolerance)
- [x] Implement category-based recommendations
- [x] Consider user's liked items for recommendations
- [x] Factor in delivery method compatibility
- [x] API endpoint: `GET /items/recommendations` - Get personalized item suggestions
- [x] API endpoint: `GET /items/:id/similar` - Get similar items (±30% tolerance)

**Smart Matching Logic Implemented:** ✅

- ✅ Match items with similar estimated values (±20% tolerance)
- ✅ Prioritize items in user's preferred categories (top 3 from liked items)
- ✅ Filter by preferred delivery method from settings
- ✅ Factor in item freshness (newer = higher score)
- ✅ Boost items from users with good reputation (0.1x multiplier)
- ✅ Consider popularity (likes and comments)

### API Endpoints

**Completed in v1.0.1:**

- [x] `GET /items?deliveryMethod=PHYSICAL|MAIL` - Filter items by delivery method
- [x] **`GET /items?minValue=100&maxValue=500` - Filter items by value range**
- [x] `POST /trades` - Include deliveryMethod in trade creation

**Completed in v1.0.2:**

- [x] `PATCH /users/settings` - Add preferredDeliveryMethod field
- [x] `GET /items/recommendations?limit=10` - Get personalized recommendations
- [x] `GET /items/:id/similar?limit=5` - Get similar items

### Testing Completed ✅

- [x] Unit tests for delivery method filtering (8 tests)
- [x] Integration tests for trade creation with delivery methods (6 tests)
- [x] Test delivery method mismatch scenarios
- [x] Test value range filtering

### Additional Testing Completed in v1.0.2 ✅

- [x] Unit tests for RecommendationsService (9 new tests)
- [x] Test recommendations with user preferences
- [x] Test value similarity matching (±20% and ±30% tolerance)
- [x] Test category preference extraction from liked items
- [x] Test delivery method filtering in recommendations
- [x] Test similar items algorithm
- [x] **Total: 591 tests passing** (up from 582)

---

## Week 7-8: ID Verification System ✅ COMPLETED

**Version 1.0.3 - User ID Verification System**
**Version 1.0.4 - Security & Privacy Features**

**Timeline:** Completed Nov 23, 2025
**Priority:** ✅ COMPLETED - Production ready with enterprise security

### Features - All Completed ✅

- [x] Free ID verification for all users
- [x] **Age verification (18+ requirement) - MANDATORY**
- [x] Secure ID document upload (ID card, passport, driver's license)
- [x] **Manual extraction of date of birth from ID document**
- [x] **Automatic rejection if user is under 18 years old**
- [x] Manual review by admin/support staff (Phase 1)
- [x] Verification status tracking (PENDING, APPROVED, REJECTED, UNDERAGE, CANCELLED)
- [x] Verified badge support (`isVerified` field on User model)
- [x] **Account suspension/deactivation for underage users**
- [x] Admin dashboard endpoints for reviewing verification requests
- [x] Verification statistics for admin dashboard
- [ ] Automatic verification using AI/OCR (Phase 2 - future enhancement)

### Technical Implementation - All Completed ✅

- [x] Create UserVerification model with comprehensive fields:
  - userId, status, documentType, documentUrl
  - dateOfBirth, isOver18 (age verification)
  - submittedAt, reviewedAt, reviewedBy
  - rejectionReason, notes (internal)
- [x] `isVerified` boolean field already exists on User model
- [x] Document upload uses existing `/upload` endpoint (Cloudinary)
- [x] Documents stored in Cloudinary (secure URLs, restricted access)
- [x] VerificationService with complete workflow:
  - Submit, cancel, get status
  - Admin: review, approve, reject
  - Automatic age calculation and validation
  - Account suspension for underage users
- [x] Complete admin endpoints for verification management
- [x] Verification statistics endpoint for dashboard
- [x] Comprehensive audit trail (who, when, notes)
- [ ] Notification system for verification status updates (future)
- [ ] Automatic document deletion after approval/rejection (future)
- [ ] Rate limiting on verification submissions (future)

### API Endpoints - All Implemented ✅

- [x] `POST /verification` - Submit ID verification request
- [x] `GET /verification/me` - Get user's verification status
- [x] `DELETE /verification/me` - Cancel pending verification request
- [x] `GET /verification/admin/pending?page=1&limit=20` - List pending verifications (paginated)
- [x] `GET /verification/admin/:id` - View specific verification with user details
- [x] `GET /verification/admin/stats` - Get verification statistics
- [x] `PATCH /verification/admin/:id/approve` - Approve verification (requires DOB)
- [x] `PATCH /verification/admin/:id/reject` - Reject verification with reason

### Database Schema

```prisma
model User {
  // ... existing fields
  isVerified       Boolean @default(false)
  verificationId   String? @unique
  verification     UserVerification?
}

model UserVerification {
  id              String   @id @default(uuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id])
  status          VerificationStatus @default(PENDING)
  documentType    String   // ID_CARD, PASSPORT, DRIVERS_LICENSE
  documentUrl     String   // Encrypted storage URL
  dateOfBirth     DateTime? // Extracted from ID document
  isOver18        Boolean? // Calculated from dateOfBirth
  submittedAt     DateTime @default(now())
  reviewedAt      DateTime?
  reviewedBy      String?  // Admin/Support user ID
  reviewer        User?    @relation("VerificationReviewer", fields: [reviewedBy], references: [id])
  rejectionReason String?
  notes           String?  // Internal notes for reviewers
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

enum VerificationStatus {
  PENDING
  APPROVED
  REJECTED
  UNDERAGE      // Rejected due to being under 18
  CANCELLED
}
```

### Security & Privacy - All Completed ✅

- [x] Encrypt ID documents at rest (AES-256-GCM encryption)
- [x] Use signed URLs with short expiration for document access (5 min expiry)
- [x] Only admins/support can view documents (AdminGuard on all admin endpoints)
- [x] Auto-delete documents 30 days after approval (cron job daily at 2 AM)
- [x] Auto-delete documents 90 days after rejection (cron job daily at 3 AM)
- [x] Log all document access for audit trail (comprehensive logging service)
- [x] Rate limit: Max 3 verification attempts per 30 days (enforced on submission)
- [x] GDPR compliant - users can request document deletion (manual deletion method)

### Age Verification Workflow

**Manual Review (Phase 1):**

1. User uploads ID document
2. Admin/Support manually extracts date of birth from document
3. System calculates age from date of birth
4. If under 18: Automatic REJECTION with status UNDERAGE
5. If 18+: Admin approves verification
6. Account automatically suspended if UNDERAGE status

**Automatic Review (Phase 2 - Future):**

1. User uploads ID document
2. OCR/AI extracts date of birth automatically
3. System calculates age
4. If under 18: Auto-reject with UNDERAGE status, account suspended
5. If 18+: Auto-approve or flag for manual review if confidence low
6. Face matching (selfie vs ID photo) for enhanced security

**Enforcement Implemented:** ✅

- [x] Suspend accounts with UNDERAGE verification status (auto-deactivated)
- [x] Age verification with accurate calculation (handles edge cases)
- [x] Comprehensive audit trail for compliance
- [ ] Ban users who repeatedly attempt to verify with fake/altered IDs (future)
- [ ] Report suspicious activity to authorities if needed (future)

### Notifications (Future Enhancement)

- [ ] Email notification when verification is submitted
- [ ] Email notification when verification is approved
- [ ] Email notification when verification is rejected (with reason)
- [ ] **Email notification for UNDERAGE rejection (account suspended)**
- [ ] Admin notification when new verification is submitted
- [ ] **Admin alert for suspicious verification attempts**
- [ ] In-app notifications for status updates

### Testing - All Completed ✅

- [x] Unit tests for VerificationService (17 comprehensive tests)
  - [x] Test submission with various states
  - [x] Test resubmission after rejection
  - [x] Test age calculation accuracy
  - [x] Test underage detection and account suspension
  - [x] Test edge cases (birthday today = 18 years old)
  - [x] Test approval workflow
  - [x] Test rejection workflow
  - [x] Test cancellation
  - [x] Test pagination for pending verifications
  - [x] Test verification statistics
- [x] **Total: 608 tests passing** (up from 591, +17 new tests)
- [ ] E2E tests for verification submission and review (future)
- [ ] Security tests for document access control (future)

### v1.0.4 Security & Privacy Implementation ✅

**Completed Nov 23, 2025**

**Services Implemented:**

- [x] **DocumentSecurityService** - AES-256-GCM encryption, signed URLs, document deletion
- [x] **VerificationAuditService** - Comprehensive audit logging for compliance
- [x] **VerificationRateLimitService** - Rate limiting (3 attempts/30 days)
- [x] **VerificationCleanupService** - Automated document deletion (cron jobs)

**Features Added:**

- [x] Document URL encryption at rest in database
- [x] Temporary signed URLs with 5-minute expiration
- [x] AdminGuard on all admin verification endpoints
- [x] Audit logging for all verification actions
- [x] Rate limit enforcement on submission
- [x] Automated cleanup: 30 days (approved), 90 days (rejected)
- [x] Manual document deletion for GDPR requests
- [x] GET /verification/admin/:id/document-url endpoint

**Environment Variables Added:**

- [x] DOCUMENT_ENCRYPTION_KEY - 64-character hex key for AES-256-GCM

**Test Coverage:**

- [x] All 608 tests passing with new security features
- [x] Mock services for security components in tests

### Future Enhancement (Phase 2)

- [ ] Integrate OCR/AI service (e.g., AWS Rekognition, Azure Computer Vision)
- [ ] Automatic identity verification
- [ ] Liveness detection (selfie with ID)
- [ ] Address verification
- [ ] Phone number verification

---

## PHASE 2: Post-Launch Enhancements (Week 12+)

### Version 1.1.0 - Basic Admin & Moderation Tools

**Timeline:** After beta testing (Week 12+)
**Priority:** Needed once you have 50+ users

### Features

- [ ] Basic admin dashboard with user count and platform stats
- [ ] User ban/suspend functionality
- [ ] Flag and remove inappropriate items
- [ ] Simple audit log for admin actions

---

## POST-LAUNCH ROADMAP (After March 2026)

These features are for Year 1 growth phase, after successful public launch.

---

## Version 1.2.0 - Advanced Moderation & Safety (Year 1, Q2)

**Timeline:** 3-6 months after launch
**Priority:** MEDIUM - needed for scaling to 500+ users

### Features

- [ ] Advanced content moderation (AI-powered flagging)
- [ ] Automated scam detection
- [ ] Report system with categories
- [ ] User reputation scoring
- [ ] Trusted trader program

---

## Version 1.3.0 - OAuth & Social Login (Year 1, Q3)

**Timeline:** 6-9 months after launch
**Priority:** LOW - convenience feature, not critical for MVP

### Features

- [ ] Google OAuth integration
- [ ] Apple Sign In integration
- [ ] Facebook OAuth integration
- [ ] Account linking (connect multiple providers)

---

## Version 1.4.0 - Organizations & Group Trading (Year 1, Q4)

**Timeline:** 9-12 months after launch
**Priority:** LOW - nice-to-have for community building

### Features

- [ ] Organization-type accounts for businesses/nonprofits
- [ ] Multiple members per organization
- [ ] Team collaboration on trades
- [ ] Bulk item management

---

## DETAILED POST-LAUNCH FEATURES (For Reference)

Below are detailed specifications for features that have been moved to the post-launch roadmap. These are not needed for the March 2026 launch but provide a blueprint for future development.

### API Endpoints (GDPR - Already implemented in Week 1-2)

- `GET /users/me/data-export` - Request full data export (GDPR Art. 15)
- `POST /users/me/data-export/download` - Download data export as JSON
- `DELETE /users/me/account` - Request account deletion (GDPR Art. 17)
- `GET /users/me/consents` - View consent history
- `POST /users/me/consents` - Update consent preferences
- `PATCH /users/me/data` - Rectify personal data (GDPR Art. 16)
- `GET /legal/privacy-policy` - Get current privacy policy with version
- `GET /legal/terms-of-service` - Get current TOS with version
- `POST /legal/accept` - Accept legal documents (TOS/Privacy)

### Database Schema

```prisma
model User {
  // ... existing fields
  dateOfBirth         DateTime? // Self-declared during signup
  selfDeclaredAge18   Boolean @default(false) // Checkbox: "I am 18 or older"
  ageVerifiedAt       DateTime? // When age was verified via ID
  privacyAcceptedAt   DateTime?
  privacyVersion      String?
  tosAcceptedAt       DateTime?
  tosVersion          String?
  cookieConsent       Boolean @default(false)
  marketingConsent    Boolean @default(false)
  dataExports         DataExport[]
  consents            UserConsent[]
  deletionRequestedAt DateTime?
  scheduledDeletionAt DateTime?
}

model UserConsent {
  id            String   @id @default(uuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  consentType   ConsentType
  version       String   // Document version
  accepted      Boolean
  acceptedAt    DateTime @default(now())
  ipAddress     String?
  userAgent     String?
  createdAt     DateTime @default(now())
}

model DataExport {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  status      ExportStatus @default(PENDING)
  fileUrl     String?
  requestedAt DateTime @default(now())
  completedAt DateTime?
  expiresAt   DateTime? // Export link expires after 7 days
}

model DataProcessingLog {
  id             String   @id @default(uuid())
  userId         String?
  action         String   // EXPORT, DELETE, UPDATE, etc.
  processingType String   // What data was processed
  legalBasis     String   // GDPR Art. 6 basis (consent, contract, etc.)
  performedBy    String?  // Admin user ID if applicable
  ipAddress      String?
  metadata       Json?
  createdAt      DateTime @default(now())
}

enum ConsentType {
  PRIVACY_POLICY
  TERMS_OF_SERVICE
  COOKIES
  MARKETING
  ANALYTICS
}

enum ExportStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  EXPIRED
}
```

### GDPR Compliance Features

**Right to Access (Art. 15):**

- [ ] Export all user data in JSON format
- [ ] Include: profile, items, trades, messages, reviews
- [ ] Processing time: Within 30 days (ideally 24-48 hours)

**Right to Erasure (Art. 17):**

- [ ] Soft delete user account (mark as deleted)
- [ ] Anonymize personal data after 30-day grace period
- [ ] Keep transaction records for legal/tax purposes (anonymized)
- [ ] Cascade delete: items, messages, notifications
- [ ] Preserve: trade history (anonymized), reviews (anonymized)

**Right to Rectification (Art. 16):**

- [ ] Allow users to update personal information
- [ ] Audit log for all data changes
- [ ] Verify email/phone on change

**Right to Data Portability (Art. 20):**

- [ ] Export in machine-readable format (JSON)
- [ ] Include all user-provided data
- [ ] Optional: Import to another service (future)

**Data Retention:**

- [ ] Active accounts: Retain indefinitely
- [ ] Deleted accounts: Anonymize after 30 days
- [ ] Trade records: 7 years (tax/legal requirements)
- [ ] Logs: 90 days
- [ ] Backups: Encrypted, 30 days retention

### Security & Privacy

- [ ] Encrypt sensitive data at rest (IDs, verification docs)
- [ ] Use signed URLs for data exports (expire in 7 days)
- [ ] Rate limit data export requests (1 per 24 hours)
- [ ] Log all data access for audit trail
- [ ] Implement data minimization (don't collect unnecessary data)
- [ ] Document legal basis for all data processing
- [ ] Create data processing agreements with vendors (Stripe, Cloudinary, etc.)

### Age Verification in Signup Flow

**Two-Layer Approach:**

**Layer 1: Self-Declaration (Required at Signup)**

- [ ] Add "Date of Birth" field to registration form
- [ ] Validate date of birth shows user is 18+
- [ ] Add checkbox: "I confirm I am at least 18 years old"
- [ ] Store `selfDeclaredAge18` boolean with timestamp
- [ ] Block registration if DOB indicates under 18
- [ ] Log IP address and timestamp for audit trail

**Layer 2: ID Verification (Optional, Encouraged)**

- [ ] Prompt users to verify ID for verified badge
- [ ] Free ID verification process
- [ ] Verify actual age from ID document
- [ ] If discrepancy found (user lied about age): Ban account
- [ ] If confirmed 18+: Set `ageVerifiedAt` timestamp

**Enforcement:**

- [ ] Periodic age checks (e.g., verify DOB is still 18+ on login)
- [ ] Random ID verification requests for high-activity accounts
- [ ] Immediate suspension if underage user detected
- [ ] Report suspicious activity (fake DOB, fake IDs)

### Legal Documents API

- [ ] Store TOS and Privacy Policy in database with versions
- [ ] Track version changes and acceptance
- [ ] API to fetch current legal documents
- [ ] Require acceptance on signup and after major updates
- [ ] **Include age restriction (18+) prominently in TOS**
- [ ] Romanian language versions (mandatory)
- [ ] English language versions (optional)

### Notifications

- [ ] Email notification when data export is ready
- [ ] Email confirmation for account deletion request
- [ ] Email notification 7 days before scheduled deletion
- [ ] Admin notification for GDPR requests
- [ ] Automatic ANSPDCP notification template for breaches

### Testing

- [ ] Unit tests for data export service
- [ ] Unit tests for data deletion service
- [ ] Integration tests for GDPR workflows
- [ ] Test data anonymization
- [ ] Test consent tracking
- [ ] Security tests for data access

---

## Version 1.5.0 - Follow System (Year 1, Later)

**Timeline:** After first few months of growth
**Priority:** LOW - social features for engaged users

### Features

- [ ] Follow/unfollow users
- [ ] Followers/following lists
- [ ] Follow notifications
- [ ] New item notifications from followed users

---

## Version 1.6.0 - Activity Feed (Year 1, Later)

**Timeline:** Once social features are established
**Priority:** LOW - engagement feature

### Features

- [ ] Personalized activity feed
- [ ] Feed showing followed users' new items
- [ ] Trending items section
- [ ] Real-time feed updates via WebSocket

---

## Version 1.7.0 - Premium Subscription System (Year 1, Later)

**Timeline:** Once you have 200+ active users
**Priority:** LOW - monetization can wait

### Features

- [ ] Subscription tiers (Basic - Free, Premium - $4.99-9.99/month)
- [ ] Stripe integration for payments
- [ ] Subscription management
- [ ] Premium features (unlimited items, analytics, priority support)

---

## Version 1.8.0 - Advanced Recommendations (Year 2)

**Timeline:** After you have substantial user data
**Priority:** LOW - nice-to-have ML feature

### Features

- [ ] Personalized item recommendations
- [ ] Smart trade matching algorithm
- [ ] "Similar items" suggestions
- [ ] Trade compatibility scoring

---

## APPENDIX: Detailed Feature Specifications

Below are the full technical specifications for features listed above. These serve as blueprints when you're ready to implement them.

### Admin & Moderation System (v1.1.0)

**Status:** ✅ Core Admin Features Complete (715 tests passing, 97% overall coverage)

**Coverage:**

- Admin Module: 100% coverage (AdminService, AdminController, AuditLogService)
- Verification Module: 88.72% coverage (all services tested)
- Overall Backend: 97.18% statement coverage

**Features:**

- [x] Admin dashboard with platform statistics
- [x] User management (view all users, ban/unban)
- [x] Role-based access control (Admin, Moderator, Support, User)
- [x] Audit logs for admin actions
- [x] User role management (change user roles)
- [x] Comprehensive unit tests (46 admin tests, 83 verification tests)
- [x] Content moderation (flag/approve/remove items)
- [ ] Platform monitoring and health checks
- [ ] Bulk actions for moderation tasks
- [ ] **Live support chat with queue system**
- [ ] Support ticket management
- [ ] Real-time support agent availability
- [ ] Support chat history and transcripts

**Technical Implementation:**

- [x] Extended User model with roles (ADMIN, MODERATOR, SUPPORT, USER)
- [x] Created AdminGuard, ModeratorGuard, SupportGuard
- [x] AdminModule with controller and services
- [x] AuditLog model for tracking admin actions
- [x] Admin dashboard API endpoints (stats, users, audit logs)
- [x] User management endpoints (ban, unban, role change)
- [x] Complete unit test suite for AdminService (14 tests, 100% coverage)
- [x] Complete unit test suite for AuditLogService (9 tests, 100% coverage)
- [x] Complete unit test suite for AdminController (16 tests, 100% coverage)
- [x] Complete unit test suite for VerificationRateLimitService (9 tests, 100% coverage)
- [x] Complete unit test suite for VerificationCleanupService (11 tests, 98.33% coverage)
- [x] Complete unit test suite for VerificationController (10 tests, 100% coverage)
- [x] FlaggedItem model with relations to Item and User
- [x] FlagReason enum (INAPPROPRIATE, SPAM, SCAM, DUPLICATE, PROHIBITED, MISLEADING, COPYRIGHT, OTHER)
- [x] ModerationStatus enum (PENDING, APPROVED, REMOVED)
- [x] ModerationModule with service and controller
- [x] Content moderation API endpoints (6 endpoints)
- [x] Complete unit test suite for ModerationService (20 tests, 100% coverage)
- [x] Complete unit test suite for ModerationController (8 tests, 100% coverage)
- [x] Integration with AuditLogService for moderation actions
- [ ] Moderation queue system
- [ ] **SupportChat model (userId, agentId, status, priority, queuePosition)**
- [ ] **SupportChatMessage model (chatId, senderId, message, timestamp)**
- [ ] **SupportQueue service with basic queue handling**
- [ ] **WebSocket gateway for live support chat**
- [ ] **Queue position tracking and notifications**
- [ ] **Agent assignment algorithm (round-robin with availability)**

### API Endpoints

**✅ Implemented:**

- `GET /admin/stats` - Platform statistics (users, items, trades, verifications)
- `GET /admin/users` - List all users with filters (search, role, status)
- `GET /admin/users/:id` - Get detailed user information
- `PATCH /admin/users/:id/ban` - Ban user (with audit logging)
- `PATCH /admin/users/:id/unban` - Unban user (with audit logging)
- `PATCH /admin/users/:id/role` - Change user role (with audit logging)
- `GET /admin/audit-logs` - View audit logs with filtering
- `GET /admin/audit-logs/stats` - Get audit log statistics
- `POST /moderation/items/:id/flag` - Flag item for moderation (authenticated users)
- `GET /moderation/items/flagged` - Get all flagged items with filters (moderators)
- `GET /moderation/items/flagged/:id` - Get single flagged item details (moderators)
- `PATCH /moderation/items/flagged/:id/approve` - Approve flagged item (moderators)
- `DELETE /moderation/items/flagged/:id` - Remove flagged item (moderators)
- `GET /moderation/stats` - Get moderation statistics (moderators)

**⏳ TODO:**

- `PATCH /admin/users/:id/suspend` - Suspend user
- **`POST /support/chat/start` - Start support chat session (enters queue)**
- **`GET /support/chat/:id` - Get support chat details**
- **`GET /support/chat/:id/messages` - Get chat messages**
- **`POST /support/chat/:id/messages` - Send message in support chat**
- **`PATCH /support/chat/:id/close` - Close support chat**
- **`GET /support/queue` - Get current queue position (user)**
- **`GET /support/agent/queue` - Get support queue (agents only)**
- **`PATCH /support/agent/available` - Toggle agent availability**
- **`GET /support/history` - Get user's support chat history**

### Database Schema

```prisma
model SupportChat {
  id            String   @id @default(uuid())
  userId        String
  user          User     @relation("UserSupportChats", fields: [userId], references: [id])
  agentId       String?
  agent         User?    @relation("AgentSupportChats", fields: [agentId], references: [id])
  status        SupportChatStatus @default(QUEUED)
  priority      Int      @default(0) // Priority level (can be enhanced later)
  queuePosition Int?
  subject       String?
  createdAt     DateTime @default(now())
  assignedAt    DateTime?
  closedAt      DateTime?
  messages      SupportChatMessage[]
}

model SupportChatMessage {
  id        String   @id @default(uuid())
  chatId    String
  chat      SupportChat @relation(fields: [chatId], references: [id])
  senderId  String
  sender    User     @relation(fields: [senderId], references: [id])
  message   String
  isInternal Boolean @default(false) // For agent-only notes
  createdAt DateTime @default(now())
}

enum SupportChatStatus {
  QUEUED
  ASSIGNED
  IN_PROGRESS
  RESOLVED
  CLOSED
}
```

### WebSocket Events

- `support:queue:joined` - User entered queue (with position)
- `support:queue:updated` - Queue position changed
- `support:chat:assigned` - Agent assigned to chat
- `support:chat:message` - New message in support chat
- `support:chat:typing` - Someone is typing
- `support:chat:closed` - Chat session closed
- `support:agent:available` - Agent became available
- `support:agent:unavailable` - Agent went offline

### Business Rules

- Maximum 3 active support chats per agent
- Inactive chats (no response for 10 minutes) get auto-reminder
- Chats with no agent response for 5 minutes get reassigned
- Support agents can't see messages marked as `isInternal`
- Queue position updates in real-time via WebSocket
- Default priority is 0 (can be modified by subscription tier)

---

### OAuth Integration (v1.3.0)

### Features

- [ ] Organization-type user accounts
- [ ] Multiple members per organization
- [ ] Organization roles (Owner, Admin, Member)
- [ ] Business profile with company details
- [ ] Bulk item management for organizations
- [ ] Team collaboration features
- [ ] Organization statistics and analytics

### Technical Implementation

- [ ] Organization model (name, type, verification status)
- [ ] OrganizationMember model (join table with roles)
- [ ] OrganizationType enum (BUSINESS, NONPROFIT, EDUCATIONAL, OTHER)
- [ ] OrganizationRole enum (OWNER, ADMIN, MEMBER)
- [ ] Update Item model with organizationId
- [ ] OrganizationsModule with full CRUD
- [ ] Member invitation system

### API Endpoints

- `POST /organizations` - Create organization
- `GET /organizations/:id` - Get organization details
- `POST /organizations/:id/members` - Invite member
- `PATCH /organizations/:id/members/:userId` - Update member role
- `DELETE /organizations/:id/members/:userId` - Remove member
- `GET /organizations/:id/items` - Get organization items
- `POST /organizations/:id/items/bulk` - Bulk create items

### Organizations & Group Trading (v1.4.0)

### Features

- [ ] Google OAuth integration
- [ ] Apple Sign In integration
- [ ] Facebook OAuth integration
- [ ] X (Twitter) OAuth integration
- [ ] GitHub OAuth integration
- [ ] Account linking (connect multiple OAuth providers)
- [ ] Unified user profile across providers
- [ ] OAuth token refresh handling

### Technical Implementation

- [ ] Install @nestjs/passport OAuth strategies
- [ ] GoogleStrategy, AppleStrategy, FacebookStrategy, XStrategy, GitHubStrategy
- [ ] OAuthProvider enum (GOOGLE, APPLE, FACEBOOK, X, GITHUB, LOCAL)
- [ ] UserOAuthProvider model (userId, provider, providerId, tokens)
- [ ] Account linking logic (merge or link existing accounts)
- [ ] OAuth callback handlers
- [ ] Token refresh service

### API Endpoints

- `GET /auth/google` - Initiate Google OAuth
- `GET /auth/google/callback` - Google OAuth callback
- `GET /auth/apple` - Initiate Apple Sign In
- `GET /auth/apple/callback` - Apple callback
- `GET /auth/facebook` - Initiate Facebook OAuth
- `GET /auth/facebook/callback` - Facebook callback
- `GET /auth/x` - Initiate X OAuth
- `GET /auth/x/callback` - X callback
- `GET /auth/github` - Initiate GitHub OAuth
- `GET /auth/github/callback` - GitHub callback
- `POST /auth/link/:provider` - Link OAuth provider to existing account
- `DELETE /auth/unlink/:provider` - Unlink OAuth provider

### Environment Variables

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
APPLE_CLIENT_ID=
APPLE_CLIENT_SECRET=
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=
X_CLIENT_ID=
X_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

### Follow System (v1.5.0)

### Features

- [ ] Daily email digest (configurable time)
- [ ] Weekly email digest (configurable day)
- [ ] Trade summaries (pending, completed)
- [ ] New items from followed users
- [ ] Personalized recommendations
- [ ] Activity highlights (messages, reviews)
- [ ] Digest preferences per user

### Technical Implementation

- [ ] DigestService with scheduled jobs
- [ ] User digest preferences (daily, weekly, none)
- [ ] Email templates: daily-digest.hbs, weekly-digest.hbs
- [ ] Recommendation algorithm for suggested items
- [ ] Cron jobs: daily (8 AM user timezone), weekly (Monday 8 AM)
- [ ] Digest content aggregation logic
- [ ] Unsubscribe functionality

### API Endpoints

- `GET /users/me/digest-preferences` - Get digest settings
- `PATCH /users/me/digest-preferences` - Update digest settings
- `POST /users/me/digest/preview` - Preview digest email

### Database Schema

```prisma
model User {
  digestFrequency DigestFrequency @default(WEEKLY)
  digestTime      Int             @default(8) // Hour in user timezone
  digestDay       Int             @default(1) // 1 = Monday for weekly
}

enum DigestFrequency {
  NONE
  DAILY
  WEEKLY
}
```

### Activity Feed (v1.6.0)

### Features

- [ ] Follow/unfollow users
- [ ] Followers/following lists
- [ ] Follow notifications
- [ ] New item notifications from followed users
- [ ] Follow suggestions (based on interests, location)
- [ ] Privacy settings (allow/block followers)
- [ ] Following activity in notifications

### Technical Implementation

- [ ] UserFollow model (followerId, followingId, createdAt)
- [ ] FollowsService with business logic
- [ ] Follow/unfollow endpoints
- [ ] Notification integration (NEW_FOLLOWER type)
- [ ] Privacy settings in UserSettings
- [ ] Follow count on user profiles
- [ ] Follow suggestion algorithm

### API Endpoints

- `POST /users/:id/follow` - Follow user
- `DELETE /users/:id/unfollow` - Unfollow user
- `GET /users/:id/followers` - Get user's followers
- `GET /users/:id/following` - Get users they follow
- `GET /users/me/follow-suggestions` - Get suggested users to follow
- `GET /users/:id/is-following` - Check if following user

### Database Schema

```prisma
model UserFollow {
  id          String   @id @default(cuid())
  followerId  String
  followingId String
  createdAt   DateTime @default(now())

  follower    User     @relation("Followers", fields: [followerId], references: [id], onDelete: Cascade)
  following   User     @relation("Following", fields: [followingId], references: [id], onDelete: Cascade)

  @@unique([followerId, followingId])
  @@index([followerId])
  @@index([followingId])
}

model User {
  followers     UserFollow[] @relation("Following")
  following     UserFollow[] @relation("Followers")
  followerCount Int          @default(0)
  followingCount Int         @default(0)
}
```

### Premium Subscription System (v1.7.0)

### Features

- [ ] Personalized activity feed
- [ ] Feed showing followed users' new items
- [ ] Feed showing followed users' completed trades
- [ ] Trending items section
- [ ] Community highlights
- [ ] Real-time feed updates via WebSocket
- [ ] Feed filters (items only, trades only, all activity)
- [ ] Infinite scroll pagination

### Technical Implementation

- [ ] ActivityFeed model (userId, activityType, metadata, createdAt)
- [ ] ActivityType enum (NEW_ITEM, COMPLETED_TRADE, NEW_REVIEW, MILESTONE)
- [ ] FeedService with aggregation logic
- [ ] Feed generation from followed users' activities
- [ ] Trending algorithm (likes + recency + trade activity)
- [ ] WebSocket feed updates
- [ ] Feed caching strategy (Redis)

### API Endpoints

- `GET /feed` - Get personalized activity feed
- `GET /feed/trending` - Get trending items
- `GET /feed/community` - Get community highlights
- `POST /feed/mark-seen` - Mark feed items as seen

### Database Schema

```prisma
model ActivityFeed {
  id           String       @id @default(cuid())
  userId       String
  activityType ActivityType
  actorId      String       // User who performed the action
  targetId     String       // Item/Trade/etc ID
  metadata     Json?
  createdAt    DateTime     @default(now())

  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  actor        User         @relation("ActivityActor", fields: [actorId], references: [id])

  @@index([userId, createdAt])
  @@index([actorId])
}

enum ActivityType {
  NEW_ITEM
  COMPLETED_TRADE
  NEW_REVIEW
  MILESTONE
}
```

---

## Version 1.7.0 - Premium Subscription System

### Features

- [ ] Subscription tiers (Basic - Free, Premium - Paid)
- [ ] Stripe integration for payments
- [ ] PayPal integration (alternative)
- [ ] Subscription management dashboard
- [ ] Billing history
- [ ] Automatic subscription renewal
- [ ] Subscription cancellation
- [ ] Grace period handling
- [ ] Proration for upgrades/downgrades
- [ ] Webhook handling for payment events

### Technical Implementation

- [ ] Subscription model (userId, tier, status, billingCycle)
- [ ] SubscriptionTier enum (BASIC, PREMIUM)
- [ ] SubscriptionStatus enum (ACTIVE, CANCELLED, PAST_DUE, EXPIRED)
- [ ] Payment model (subscriptionId, amount, status, provider)
- [ ] Stripe SDK integration
- [ ] PayPal SDK integration
- [ ] Webhook handlers for Stripe/PayPal events
- [ ] SubscriptionGuard for premium-only endpoints
- [ ] Billing cycle management service

### API Endpoints

- `GET /subscriptions/plans` - List available plans
- `POST /subscriptions/subscribe` - Create subscription
- `GET /subscriptions/me` - Get current subscription
- `PATCH /subscriptions/me/cancel` - Cancel subscription
- `POST /subscriptions/me/reactivate` - Reactivate subscription
- `GET /subscriptions/me/billing-history` - Get payment history
- `POST /subscriptions/webhooks/stripe` - Stripe webhook
- `POST /subscriptions/webhooks/paypal` - PayPal webhook

### Database Schema

```prisma
model Subscription {
  id              String             @id @default(cuid())
  userId          String             @unique
  tier            SubscriptionTier   @default(BASIC)
  status          SubscriptionStatus @default(ACTIVE)
  billingCycle    BillingCycle       @default(MONTHLY)
  currentPeriodStart DateTime
  currentPeriodEnd   DateTime
  cancelAtPeriodEnd  Boolean         @default(false)
  stripeCustomerId   String?
  stripeSubscriptionId String?
  paypalSubscriptionId String?
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt

  user            User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  payments        Payment[]
}

model Payment {
  id              String        @id @default(cuid())
  subscriptionId  String
  amount          Decimal       @db.Decimal(10, 2)
  currency        String        @default("USD")
  status          PaymentStatus
  provider        PaymentProvider
  providerPaymentId String?
  createdAt       DateTime      @default(now())

  subscription    Subscription  @relation(fields: [subscriptionId], references: [id])

  @@index([subscriptionId])
}

enum SubscriptionTier {
  BASIC
  PREMIUM
}

enum SubscriptionStatus {
  ACTIVE
  CANCELLED
  PAST_DUE
  EXPIRED
}

enum BillingCycle {
  MONTHLY
  YEARLY
}

enum PaymentStatus {
  PENDING
  SUCCEEDED
  FAILED
  REFUNDED
}

enum PaymentProvider {
  STRIPE
  PAYPAL
}
```

### Environment Variables

```
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_WEBHOOK_ID=
PREMIUM_MONTHLY_PRICE=9.99
PREMIUM_YEARLY_PRICE=99.99
```

### Item Recommendations & Matching (v1.8.0)

**Features:**

- [ ] Advanced search with more filters
- [ ] Unlimited items (Basic: 20 items limit)
- [ ] **Priority customer support (queue jumping)**
- [ ] Featured/promoted listings
- [ ] Analytics dashboard (views, likes, trade success rate)
- [ ] Ad-free experience
- [ ] Early access to new features
- [ ] Custom profile themes
- [ ] Verified badge

### Technical Implementation

- [ ] ItemLimit service (check user tier before creating items)
- [ ] FeaturedItem model (itemId, startDate, endDate)
- [ ] Analytics service (track views, clicks, conversions)
- [ ] ItemAnalytics model (itemId, views, likes, tradeAttempts)
- [ ] PremiumGuard decorator for premium-only endpoints
- [ ] **Priority queue system enhancement (Premium users get +10 priority)**
- [ ] **Update SupportQueue service to check subscription tier**
- [ ] Featured items in search results

### API Endpoints

- `POST /items/:id/feature` - Feature item (Premium only)
- `GET /analytics/items/:id` - Get item analytics (Premium only)
- `GET /analytics/dashboard` - User analytics dashboard (Premium only)
- `GET /support/tickets` - Priority support (Premium gets faster response)
- `POST /profile/theme` - Set custom theme (Premium only)

### Business Rules

- Basic users: Max 20 items
- Premium users: Unlimited items
- Featured listings: Premium only, max 3 concurrent
- Analytics: Premium gets detailed metrics, Basic gets basic stats
- **Support queue priority: Premium users get +10 priority (moved to front of queue)**
- **Premium support chats are assigned to agents first**
- **Premium users see "Priority Support" badge in queue**

### Database Schema

```prisma
model User {
  itemLimit       Int      @default(20)
  verifiedBadge   Boolean  @default(false)
}

model FeaturedItem {
  id        String   @id @default(cuid())
  itemId    String
  userId    String
  startDate DateTime @default(now())
  endDate   DateTime
  createdAt DateTime @default(now())

  item      Item     @relation(fields: [itemId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([itemId])
  @@index([startDate, endDate])
}

model ItemAnalytics {
  id             String   @id @default(cuid())
  itemId         String   @unique
  views          Int      @default(0)
  uniqueViews    Int      @default(0)
  likes          Int      @default(0)
  tradeAttempts  Int      @default(0)
  completedTrades Int     @default(0)
  updatedAt      DateTime @updatedAt

  item           Item     @relation(fields: [itemId], references: [id], onDelete: Cascade)
}
```

### E2E Testing (Continuous)

### Features

- [ ] One-time payments for featured listings
- [ ] Tip/donation functionality
- [ ] Payment method management
- [ ] Refund processing
- [ ] Payment dispute handling
- [ ] Multi-currency support
- [ ] Tax calculation (where applicable)
- [ ] Invoice generation

### Technical Implementation

- [ ] PaymentIntent service (Stripe/PayPal)
- [ ] Refund service with business logic
- [ ] Invoice model and generation
- [ ] Multi-currency conversion service
- [ ] Tax calculation service (based on location)
- [ ] Payment method storage (tokenized)
- [ ] Receipt email generation

### API Endpoints

- `POST /payments/feature-item` - Pay to feature item
- `POST /payments/tip/:userId` - Send tip to user
- `GET /payments/methods` - Get saved payment methods
- `POST /payments/methods` - Add payment method
- `DELETE /payments/methods/:id` - Remove payment method
- `POST /payments/:id/refund` - Process refund (Admin)
- `GET /payments/:id/invoice` - Get invoice/receipt

### Database Schema

```prisma
model Payment {
  id              String          @id @default(cuid())
  userId          String
  amount          Decimal         @db.Decimal(10, 2)
  currency        String          @default("USD")
  type            PaymentType
  status          PaymentStatus
  provider        PaymentProvider
  providerPaymentId String?
  metadata        Json?
  refundedAmount  Decimal?        @db.Decimal(10, 2)
  createdAt       DateTime        @default(now())

  user            User            @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([status])
}

enum PaymentType {
  SUBSCRIPTION
  FEATURED_ITEM
  TIP
  OTHER
}

model PaymentMethod {
  id              String          @id @default(cuid())
  userId          String
  type            String          // card, paypal, etc
  provider        PaymentProvider
  providerMethodId String
  last4           String?
  isDefault       Boolean         @default(false)
  createdAt       DateTime        @default(now())

  user            User            @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

---

## END OF BACKEND TODO

### Features

- [ ] Personalized item recommendations based on user preferences
- [ ] Smart trade matching (suggest compatible trades)
- [ ] Category-based recommendations
- [ ] Location-based item suggestions
- [ ] User behavior tracking (views, likes, searches)
- [ ] "Similar items" feature on item pages
- [ ] "You might also like" recommendations
- [ ] Trade compatibility scoring
- [ ] Trending items algorithm
- [ ] Recently viewed items tracking

### Technical Implementation

- [ ] RecommendationEngine service with ML-ready architecture
- [ ] UserBehavior model (track views, searches, interactions)
- [ ] ItemSimilarity calculation algorithm
- [ ] Collaborative filtering algorithm (user-based)
- [ ] Content-based filtering (category, condition, location)
- [ ] Hybrid recommendation system (combine multiple algorithms)
- [ ] Redis caching for recommendation results
- [ ] Scheduled job to pre-compute recommendations
- [ ] Recommendation scoring and ranking system
- [ ] A/B testing framework for algorithm improvements

### API Endpoints

- `GET /recommendations/items` - Get personalized item recommendations
- `GET /recommendations/items/:id/similar` - Get similar items
- `GET /recommendations/trades` - Get suggested trade matches
- `GET /recommendations/trending` - Get trending items
- `GET /items/:id/compatibility/:targetId` - Check trade compatibility score
- `POST /analytics/track` - Track user behavior (view, search, etc.)
- `GET /users/me/recently-viewed` - Get recently viewed items

### Database Schema

```prisma
model UserBehavior {
  id          String         @id @default(cuid())
  userId      String
  itemId      String?
  categoryId  String?
  action      BehaviorAction
  metadata    Json?          // Additional context (search query, duration, etc.)
  createdAt   DateTime       @default(now())

  user        User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  item        Item?          @relation(fields: [itemId], references: [id], onDelete: Cascade)

  @@index([userId, action])
  @@index([itemId])
  @@index([createdAt])
}

model ItemRecommendation {
  id              String   @id @default(cuid())
  userId          String
  itemId          String
  score           Float    // Recommendation confidence score (0-1)
  algorithm       String   // Which algorithm generated this
  expiresAt       DateTime // Cache expiration
  createdAt       DateTime @default(now())

  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  item            Item     @relation(fields: [itemId], references: [id], onDelete: Cascade)

  @@unique([userId, itemId])
  @@index([userId, score])
  @@index([expiresAt])
}

model TradeMatch {
  id              String   @id @default(cuid())
  userId          String
  userItemId      String
  matchUserId     String
  matchItemId     String
  compatibilityScore Float  // 0-100 score
  reasons         Json     // Why this is a good match
  status          MatchStatus @default(SUGGESTED)
  createdAt       DateTime @default(now())
  viewedAt        DateTime?
  dismissedAt     DateTime?

  user            User     @relation("UserMatches", fields: [userId], references: [id], onDelete: Cascade)
  matchUser       User     @relation("MatchUserMatches", fields: [matchUserId], references: [id], onDelete: Cascade)
  userItem        Item     @relation("UserMatchItems", fields: [userItemId], references: [id], onDelete: Cascade)
  matchItem       Item     @relation("MatchUserItems", fields: [matchItemId], references: [id], onDelete: Cascade)

  @@unique([userId, matchUserId, userItemId, matchItemId])
  @@index([userId, status])
  @@index([compatibilityScore])
}

enum BehaviorAction {
  VIEW
  SEARCH
  LIKE
  UNLIKE
  COMMENT
  TRADE_PROPOSE
  SHARE
}

enum MatchStatus {
  SUGGESTED
  VIEWED
  DISMISSED
  TRADE_INITIATED
}
```

### Recommendation Algorithms

#### 1. Content-Based Filtering

- Match based on item categories, condition, location
- User's past liked items and completed trades
- Price range preferences

#### 2. Collaborative Filtering

- "Users who liked X also liked Y"
- Similar user taste analysis
- Community behavior patterns

#### 3. Hybrid Approach

- Combine content + collaborative scores
- Weighted scoring: 60% content, 40% collaborative
- Adjust weights based on user activity level

#### 4. Trade Compatibility Scoring

Factors:

- Category match (40 points)
- Condition compatibility (20 points)
- Location proximity (20 points)
- User reputation compatibility (10 points)
- Historical trade patterns (10 points)

### Business Rules

- Recommendations refresh every 6 hours
- Minimum 20 user interactions before collaborative filtering
- New users get content-based recommendations only
- Track user behavior for 90 days (rolling window)
- Trending algorithm: engagement score over last 7 days
- Recently viewed: Last 50 items per user
- Similar items: Top 10 matches by similarity score
- Trade matches: Only suggest if compatibility > 60

### Performance Optimization

- Pre-compute recommendations nightly for all active users
- Cache recommendations in Redis (6 hour TTL)
- Use database indexes on userId, itemId, createdAt
- Lazy load recommendations (paginated)
- Background job for similarity calculations

### Environment Variables

```
RECOMMENDATION_CACHE_TTL=21600
RECOMMENDATION_REFRESH_CRON='0 */6 * * *'
TRENDING_WINDOW_DAYS=7
BEHAVIOR_RETENTION_DAYS=90
MIN_COLLABORATIVE_INTERACTIONS=20
```

---

## LEGACY CONTENT (Moved to Appendix Above)

The following sections have been consolidated into the APPENDIX above for reference.

---

## E2E Testing Details

### Test Coverage

- [ ] User registration and authentication flow
- [ ] Item creation, editing, and deletion
- [ ] Trade proposal, acceptance, and completion
- [ ] Messaging between users
- [ ] Review submission
- [ ] Dispute filing and resolution
- [ ] Notification delivery
- [ ] Search and filtering
- [ ] OAuth authentication flows
- [ ] Subscription payment flow
- [ ] Premium feature access control

### Technical Implementation

- [ ] Install Playwright or Cypress
- [ ] Test environment setup (separate DB)
- [ ] Seed data for E2E tests
- [ ] Page Object Model structure
- [ ] CI/CD integration (GitHub Actions)
- [ ] Visual regression testing
- [ ] API contract testing
- [ ] Load testing with k6

### Test Files Structure

```
test/e2e/
  ├── auth/
  │   ├── registration.spec.ts
  │   ├── login.spec.ts
  │   └── oauth.spec.ts
  ├── items/
  │   ├── create-item.spec.ts
  │   └── search-items.spec.ts
  ├── trades/
  │   ├── trade-flow.spec.ts
  │   └── counter-offers.spec.ts
  ├── messaging/
  │   └── send-message.spec.ts
  ├── subscriptions/
  │   └── upgrade-premium.spec.ts
  └── fixtures/
      └── test-data.ts
```

---

## Notes

- E2E tests should be implemented incrementally with each release
- Each version should include comprehensive unit and integration tests
- Database migrations must be backward compatible
- API versioning may be needed for breaking changes
- Security audits recommended before payment features
- Consider rate limiting and abuse prevention for all new features
- Monitor performance impact of social features on database
- Regular dependency updates and security patches
