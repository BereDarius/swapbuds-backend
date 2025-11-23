# 🔵 SWAPBUDS Backend

> **RESTful API for the SWAPBUDS Trading Platform**

A production-ready NestJS backend with PostgreSQL, Redis, JWT authentication, and comprehensive API documentation.

**Version 1.1.0-dev** (Admin & Moderation System)

[![NestJS](https://img.shields.io/badge/NestJS-10-red.svg)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748.svg)](https://www.prisma.io/)

---

## 📖 Overview

This is the production-ready backend API for SWAPBUDS, providing secure authentication, item management, trading functionality, reviews, disputes, real-time messaging, and comprehensive user features. Built with NestJS and following enterprise best practices.

## ✨ Features

### Implemented

- ✅ JWT Authentication (register, login, refresh tokens)
- ✅ Items CRUD API with ownership validation
- ✅ User management with profiles
- ✅ Image upload support (Cloudinary ready)
- ✅ Categories and conditions system
- ✅ Pagination and filtering
- ✅ Swagger/OpenAPI documentation
- ✅ Redis caching
- ✅ Winston logging
- ✅ Rate limiting and security (Helmet, CORS)
- ✅ Path aliases with `@/` prefix

### Completed

- ✅ Likes and comments (v0.5.0)
- ✅ Trading system (v0.6.0)
- ✅ Notifications system (v0.7.0)
- ✅ WebSocket real-time notifications (v0.8.0)
- ✅ Email notifications (v0.8.0)
- ✅ Messaging system (v0.9.0)
- ✅ Redis caching system with decorators (v0.10.0)
- ✅ Cache warming and monitoring (v0.10.0)
- ✅ Reviews and trade filtering (v0.10.1)
- ✅ Schema validation and type safety (v0.10.2)
- ✅ User filtering and search (v0.10.3)
- ✅ Trade counter-offers (v0.11.0)
- ✅ Trade expiration system (v0.11.1)
- ✅ Trade statistics (v0.11.2)
- ✅ Dispute resolution (v0.12.0)
- ✅ Multi-item trades (v0.13.0)
- ✅ User settings and preferences (v0.14.0)
- ✅ **Production Ready v1.0.0**
- ✅ Delivery method & value filtering (v1.0.1)
- ✅ Smart recommendations & matching (v1.0.2)
- ✅ ID verification & age verification + security & privacy (v1.0.3-v1.0.4)
- ✅ Admin & moderation system with role-based access (v1.1.0)

---

## 🛠️ Tech Stack

- **NestJS 10** - Progressive Node.js framework
- **Prisma 5.22** - Next-generation ORM
- **PostgreSQL 15** - Relational database
- **Redis 7** - Caching layer
- **JWT + Passport** - Authentication
- **Class Validator** - DTO validation
- **Winston** - Structured logging
- **Swagger** - API documentation
- **TypeScript** - Type safety with `@/` path aliases
- **@nestjs/schedule** - Cron jobs for trade expiration (v0.11.1)
- **Socket.IO** - WebSocket for real-time features
- **Nodemailer** - Email notifications

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Yarn 1.22+
- Docker (for local PostgreSQL & Redis)

### Installation

```bash
# Install dependencies
yarn install

# Generate Prisma Client
yarn prisma generate
```

### Environment Setup

Create a `.env` file in the root:

```env
# Database
DATABASE_URL="postgresql://swapbuds_dev:swapbuds_dev_password@localhost:5432/swapbuds_dev"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"

# Redis
REDIS_HOST="localhost"
REDIS_PORT=6379

# Cloudinary (optional for local dev)
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Email (optional - for notifications)
MAIL_HOST="smtp.gmail.com"
MAIL_PORT=587
MAIL_USER="your-email@gmail.com"
MAIL_PASSWORD="your-app-password"
MAIL_FROM="SwapBuds <noreply@swapbuds.com>"

# Frontend URL (for email links and WebSocket CORS)
FRONTEND_URL="http://localhost:3000"

# Server
PORT=3001
NODE_ENV=development
```

### Running the App

```bash
# Start Docker services (PostgreSQL + Redis)
docker-compose up -d

# Run migrations
yarn prisma migrate dev

# Development mode with hot reload
yarn dev
# or
yarn start:dev

# Production mode
yarn build
yarn start:prod
```

### Access Points

- **API:** http://localhost:3001/api
- **Swagger Docs:** http://localhost:3001/api/docs
- **Health Check:** http://localhost:3001/api/health
- **WebSocket:** ws://localhost:3001/notifications

---

## 📁 Project Structure

```
src/
├── auth/                   # Authentication module
│   ├── decorators/         # Custom decorators (@Public, @CurrentUser)
│   ├── guards/             # Auth guards (JWT)
│   ├── strategies/         # Passport strategies
│   └── dto/                # Auth DTOs
├── items/                  # Items management module
│   ├── dto/                # Item DTOs with enums
│   ├── items.controller.ts
│   └── items.service.ts
├── prisma/                 # Prisma module
│   └── prisma.service.ts
├── common/                 # Shared utilities
│   ├── decorators/
│   ├── filters/
│   └── interceptors/
├── config/                 # Configuration
│   └── config.service.ts
├── app.module.ts           # Root module
└── main.ts                 # Bootstrap

prisma/
├── schema.prisma           # Database schema
└── migrations/             # Migration history
```

---

## 📊 API Documentation

Interactive Swagger documentation available at:
**http://localhost:3001/api/docs**

### Main Endpoints

#### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT
- `GET /api/auth/me` - Get current user (protected)

#### Users

- `GET /api/users/:id` - Get user profile (public)
- `PATCH /api/users/:id` - Update user profile (owner only)
- `DELETE /api/users/:id` - Delete user account (owner only)

#### Items

- `POST /api/items` - Create item (protected)
- `GET /api/items` - List all items with filtering (public, paginated)
  - Filter by: status, category, condition, search, deliveryMethod, deliveryScope, minValue, maxValue
  - Supports: pagination (page, limit), sorting (sortBy, sortOrder)
- `GET /api/items/:id` - Get item details (public)
- `GET /api/items/user/:userId` - Get user's items (public)
- `PATCH /api/items/:id` - Update item (owner only)
- `DELETE /api/items/:id` - Delete item (owner only)

#### Likes

- `POST /api/items/:itemId/likes` - Like an item (protected)
- `DELETE /api/items/:itemId/likes` - Unlike an item (protected)
- `GET /api/items/:itemId/likes` - Get item likes (public)
- `GET /api/users/:userId/likes` - Get user's liked items (public)

#### Comments

- `POST /api/items/:itemId/comments` - Add comment to item (protected)
- `GET /api/items/:itemId/comments` - Get item comments (public)
- `PATCH /api/items/:itemId/comments/:commentId` - Update comment (owner only)
- `DELETE /api/items/:itemId/comments/:commentId` - Delete comment (owner only)

#### Trades

- `POST /api/trades` - Create trade proposal (protected)
- `GET /api/trades` - List user's trades (protected)
- `GET /api/trades/:id` - Get trade details (protected)
- `PATCH /api/trades/:id/accept` - Accept trade (protected)
- `PATCH /api/trades/:id/reject` - Reject trade (protected)
- `PATCH /api/trades/:id/cancel` - Cancel trade (protected)
- `PATCH /api/trades/:id/complete` - Mark trade as completed (protected)

#### Upload

- `POST /api/upload` - Upload image to Cloudinary (protected)

#### Notifications

- `GET /api/notifications` - List user notifications (protected)
- `GET /api/notifications/unread-count` - Get unread count (protected)
- `PATCH /api/notifications/:id/read` - Mark as read (protected)
- `PATCH /api/notifications/read-all` - Mark all as read (protected)
- `DELETE /api/notifications/:id` - Delete notification (protected)
- `GET /api/notifications/preferences` - Get preferences (protected)
- `PUT /api/notifications/preferences` - Update preferences (protected)

#### Messages (v0.9.0)

- `POST /api/messages` - Send a message (protected)
- `GET /api/messages/conversations` - List all conversations (protected)
- `GET /api/messages/conversations/:id` - Get messages in conversation (protected, paginated)
- `PATCH /api/messages/:id/read` - Mark message as read (protected)
- `PATCH /api/messages/conversations/:id/read` - Mark all messages in conversation as read (protected)
- `DELETE /api/messages/:id` - Delete message (protected, owner only)
- `GET /api/messages/unread/count` - Get total unread message count (protected)

#### Reviews (v0.10.1)

- `POST /api/reviews` - Create review for completed trade (protected)
- `GET /api/reviews/user/:userId` - Get reviews for user (public)
- `GET /api/reviews/trade/:tradeId` - Get reviews for trade (public)
- `PATCH /api/reviews/:id` - Update own review (protected, owner only)
- `DELETE /api/reviews/:id` - Delete own review (protected, owner only)
- `GET /api/users/:userId/reputation` - Get user reputation stats (public)

#### Trade Filtering (v0.10.1)

- `GET /api/trades/filter` - Filter trades (status, item, user, date range) (protected)

#### Trade Counter-Offers (v0.11.0)

- `POST /api/trades/:tradeId/counter-offers` - Create counter-offer (protected)
- `GET /api/trades/:tradeId/counter-offers` - List counter-offers (protected)
- `PATCH /api/counter-offers/:id/accept` - Accept counter-offer (protected)
- `PATCH /api/counter-offers/:id/reject` - Reject counter-offer (protected)

#### Trade Statistics (v0.11.2)

- `GET /api/users/:userId/stats` - Get user trade statistics (public)

#### Disputes (v0.12.0)

- `POST /api/disputes` - Create dispute for trade (protected)
- `GET /api/disputes` - List user's disputes (protected)
- `GET /api/disputes/:id` - Get dispute details (protected)
- `PATCH /api/disputes/:id` - Update dispute (admin only)
- `PATCH /api/disputes/:id/resolve` - Resolve dispute (admin only)
- `POST /api/disputes/:id/messages` - Add message to dispute (protected)

#### Admin & Moderation (v1.1.0)

- `GET /api/admin/stats` - Platform statistics (admin only)
- `GET /api/admin/users` - List all users with filtering (admin only)
- `GET /api/admin/users/:id` - Get user details (admin only)
- `PATCH /api/admin/users/:id/ban` - Ban user (admin only)
- `PATCH /api/admin/users/:id/unban` - Unban user (admin only)
- `PATCH /api/admin/users/:id/role` - Change user role (admin only)
- `GET /api/admin/audit-logs` - View audit logs (admin only)
- `GET /api/admin/audit-logs/stats` - Audit log statistics (admin only)
- `GET /api/disputes/:id/messages` - Get dispute messages (protected)

#### User Settings (v0.14.0)

- `GET /api/users/settings` - Get user settings (protected)
- `PATCH /api/users/settings` - Update user settings (protected)
- `DELETE /api/users/account` - Delete user account (protected)

---

## 🚚 Delivery Method & Value Filtering (v1.0.1)

### Enhanced Item Filtering

Items can now be filtered by delivery methods, delivery scope, and estimated value:

```bash
# Find items available for mail delivery
GET /api/items?deliveryMethod=MAIL

# Find items worth between 50-200 EUR
GET /api/items?minValue=50&maxValue=200

# Find national mail-deliverable electronics
GET /api/items?category=ELECTRONICS&deliveryMethod=MAIL&deliveryScope=NATIONAL

# Complex filter: high-value, international, good condition
GET /api/items?minValue=100&deliveryScope=INTERNATIONAL&condition=GOOD
```

#### Query Parameters

| Parameter        | Type   | Values                      | Description                                  |
| ---------------- | ------ | --------------------------- | -------------------------------------------- |
| `deliveryMethod` | enum   | `PHYSICAL`, `MAIL`          | Filter items supporting this delivery method |
| `deliveryScope`  | enum   | `NATIONAL`, `INTERNATIONAL` | Filter by delivery scope                     |
| `minValue`       | number | 0-∞                         | Minimum estimated value in EUR               |
| `maxValue`       | number | 0-∞                         | Maximum estimated value in EUR               |

### Trade Delivery Method Validation

**Breaking Change:** Trade creation now requires a `deliveryMethod` field:

```typescript
POST /api/trades
{
  "itemOfferedId": "cm123abc",
  "itemRequestedId": "cm456def",
  "deliveryMethod": "MAIL",  // Required - must be supported by both items
  "message": "Would love to trade!"
}
```

The system validates that:

- All offered items support the selected delivery method
- All requested items support the selected delivery method
- Returns `400 Bad Request` if any item doesn't support the delivery method

**Error Response Example:**

```json
{
  "statusCode": 400,
  "message": "Item 'Vintage Pokemon Cards' (cm789xyz) does not support the selected delivery method: MAIL",
  "error": "Bad Request"
}
```

### Item Schema Updates

Items now include delivery-related fields:

```typescript
{
  "deliveryMethods": ["PHYSICAL", "MAIL"],  // Array of supported methods
  "deliveryScope": "NATIONAL",              // NATIONAL or INTERNATIONAL
  "estimatedValue": 150,                     // Value in EUR
  "currency": "EUR"                          // Currency (default: EUR)
}
```

### Migration Guide

If you have existing code creating trades, update it to include `deliveryMethod`:

**Before:**

```typescript
const trade = await fetch('/api/trades', {
  method: 'POST',
  body: JSON.stringify({
    itemOfferedId: offeredId,
    itemRequestedId: requestedId,
  }),
});
```

**After:**

```typescript
const trade = await fetch('/api/trades', {
  method: 'POST',
  body: JSON.stringify({
    itemOfferedId: offeredId,
    itemRequestedId: requestedId,
    deliveryMethod: 'PHYSICAL', // or 'MAIL'
  }),
});
```

---

## 🤖 Smart Recommendations & Matching (v1.0.2)

### Personalized Item Recommendations

Get personalized item recommendations based on user preferences, liked items, and smart matching algorithms:

```bash
# Get personalized recommendations (requires authentication)
GET /items/recommendations?limit=10
```

**Recommendation Algorithm:**

The system uses a sophisticated scoring algorithm that considers multiple factors:

1. **Value Similarity** (±20% tolerance)
   - Matches items with similar estimated values to user's items
   - Example: If user has items worth €100, recommends items worth €80-120

2. **Category Preferences**
   - Analyzes user's liked items to extract top 3 preferred categories
   - Prioritizes items in these categories

3. **Delivery Method Compatibility**
   - Filters by user's preferred delivery method from settings
   - Only shows items compatible with user's preferences

4. **Reputation Scoring**
   - Boosts items from users with high reputation scores
   - Helps users discover reliable traders

5. **Item Freshness**
   - Prioritizes recently listed items
   - Ensures recommendations stay current

6. **Popularity**
   - Considers likes and comments
   - Highlights items the community finds interesting

### Similar Items

Find items similar to a specific item:

```bash
# Get similar items (public endpoint)
GET /items/:id/similar?limit=5
```

**Similarity Criteria:**

- Same category
- Similar value (±30% tolerance)
- Compatible delivery methods
- Same delivery scope (national/international)
- Recent listings

**Example Usage:**

```typescript
// Get personalized recommendations
const recommendations = await fetch('/items/recommendations?limit=10', {
  headers: { Authorization: `Bearer ${token}` },
});

// Get similar items (useful for "You might also like" sections)
const similar = await fetch('/items/item-123/similar?limit=5');
```

### User Settings

Users can control recommendations through their settings:

```typescript
PATCH /users/settings
{
  "preferredDeliveryMethod": "MAIL",      // Preferred method for filtering
  "enableRecommendations": true,          // Toggle recommendations on/off
  "showSimilarItems": true,               // Show similar items on item pages
  "saveSearchHistory": true               // Use search history for better recommendations
}
```

---

## 🆔 ID Verification & Age Verification (v1.0.3)

### User ID Verification System

A comprehensive ID verification system with mandatory age verification (18+) to ensure platform safety and legal compliance.

### Features

- ✅ Secure ID document upload (ID card, passport, driver's license)
- ✅ **Mandatory age verification (18+ requirement)**
- ✅ Manual review by admin/support staff
- ✅ Automatic account suspension for underage users
- ✅ Verified badge on user profiles
- ✅ Admin dashboard for reviewing verification requests
- ✅ Comprehensive audit trail

### API Endpoints

**User Endpoints:**

```bash
# Submit ID verification request
POST /verification
{
  "documentType": "ID_CARD",  // ID_CARD, PASSPORT, DRIVERS_LICENSE
  "documentUrl": "https://cloudinary.com/secure/document.jpg"
}

# Get own verification status
GET /verification/me

# Cancel pending verification
DELETE /verification/me
```

**Admin Endpoints:**

```bash
# Get pending verifications (paginated)
GET /verification/admin/pending?page=1&limit=20

# Get verification by ID
GET /verification/admin/:id

# Get signed URL for viewing document (expires in 5 minutes)
GET /verification/admin/:id/document-url
Response: {
  "signedUrl": "https://res.cloudinary.com/...",
  "expiresIn": 300
}

# Approve verification (requires date of birth)
PATCH /verification/admin/:id/approve
{
  "dateOfBirth": "1995-05-15",  // Required for age calculation
  "notes": "Document verified"
}

# Reject verification
PATCH /verification/admin/:id/reject
{
  "rejectionReason": "Document is blurry and unreadable",
  "notes": "Request better quality scan"
}

# Get verification statistics
GET /verification/admin/stats
```

### Verification Status Flow

```
PENDING → APPROVED (if 18+, user verified)
        → UNDERAGE (if <18, account suspended)
        → REJECTED (invalid document, user can resubmit)
        → CANCELLED (user cancelled request)
```

### Age Verification Process

**Manual Review (Current Implementation):**

1. User uploads ID document to Cloudinary
2. User submits verification request with document URL
3. Admin/Support reviews document
4. Admin extracts date of birth from document
5. System automatically calculates age:
   - **If 18+**: Verification approved, user marked as verified
   - **If under 18**: Auto-reject with `UNDERAGE` status, account suspended
6. User notified of verification result

**Age Calculation:**

- Accurate age calculation considering birth date, month, and year
- Edge case handling (e.g., birthday today counts as 18)
- Timezone-aware calculations

### Security & Privacy

- ✅ **Document Encryption**: Documents encrypted at rest using AES-256-GCM
- ✅ **Signed URLs**: Temporary signed URLs with 5-minute expiration for viewing
- ✅ **Admin-Only Access**: AdminGuard protects all admin endpoints
- ✅ **Auto-Deletion**: Approved documents deleted after 30 days, rejected after 90 days
- ✅ **Audit Logging**: Comprehensive logging of all verification actions
- ✅ **Rate Limiting**: Max 3 verification attempts per 30 days (configurable)
- ✅ **GDPR Compliance**: Manual deletion method + automatic cleanup
- ✅ **Encrypted Storage**: Document URLs encrypted in database
- ✅ **Secure Access**: Documents only accessible via time-limited signed URLs

### Account Suspension for Underage Users

When a user is verified as under 18:

- Verification status set to `UNDERAGE`
- User account automatically deactivated (`isActive = false`)
- User cannot log in or access platform
- Clear rejection message explaining age requirement

### Admin Dashboard Data

Admins can access:

- Pending verification queue (FIFO order)
- Verification statistics:
  - Total pending
  - Total approved
  - Total rejected
  - Total underage
  - Total cancelled
- Individual verification details with user information
- Document viewing (secure access)

### Example Usage

**User Submitting Verification:**

```typescript
// 1. Upload document to Cloudinary first
const formData = new FormData();
formData.append('file', idDocument);

const uploadResponse = await fetch('/upload', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: formData,
});
const { url } = await uploadResponse.json();

// 2. Submit verification request
const verification = await fetch('/verification', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    documentType: 'ID_CARD',
    documentUrl: url,
  }),
});
```

**Admin Reviewing Verification:**

```typescript
// Get pending verifications
const pending = await fetch('/verification/admin/pending', {
  headers: { Authorization: `Bearer ${adminToken}` },
});

// Approve with age verification
const approve = await fetch('/verification/admin/verif-123/approve', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
  },
  body: JSON.stringify({
    dateOfBirth: '1995-05-15', // Extracted from document
    notes: 'ID card verified, clear photo',
  }),
});

// System automatically:
// - Calculates age (29 years old)
// - Checks if >= 18 (yes)
// - Approves verification
// - Marks user as verified
```

### Implemented Security Services

**DocumentSecurityService:**

- AES-256-GCM encryption for document URLs
- Signed URL generation with configurable expiration
- Cloudinary document deletion
- Public ID extraction from URLs

**VerificationAuditService:**

- Comprehensive logging of all actions
- Document access tracking
- Suspicious activity alerts
- GDPR-compliant audit trail

**VerificationRateLimitService:**

- 3 attempts per 30 days limit
- Rate limit checking and stats
- Automatic violation logging

**VerificationCleanupService:**

- Automated document deletion (cron jobs)
- 30 days after approval
- 90 days after rejection
- Manual deletion support for GDPR requests

### Future Enhancements (Phase 2)

- [ ] Automatic OCR for date of birth extraction
- [ ] AI-powered document validation
- [ ] Liveness detection (selfie with ID)
- [ ] Face matching between selfie and ID photo
- [ ] Address verification
- [ ] Phone number verification
- [ ] Email notifications for verification status changes

---

## 👑 Admin & Moderation System (v1.1.0)

### Role-Based Access Control

A comprehensive admin system with hierarchical role-based access control for platform management.

### User Roles

- **USER**: Standard platform user (default)
- **SUPPORT**: Customer support staff (can view user data, no moderation)
- **MODERATOR**: Content moderator (can manage items, users)
- **ADMIN**: Full platform access (all permissions)

**Role Hierarchy:** ADMIN > MODERATOR > SUPPORT > USER

### Features

- ✅ Platform statistics dashboard
- ✅ User management (list, search, filter)
- ✅ User ban/unban with audit logging
- ✅ Role management (change user roles)
- ✅ Comprehensive audit log system
- ✅ Role-based guards (AdminGuard, ModeratorGuard, SupportGuard)
- ⏳ Content moderation (flag/approve/remove items)
- ⏳ Bulk moderation actions

### API Endpoints

**Admin Statistics:**

```bash
# Get platform statistics
GET /admin/stats
Response: {
  "users": {
    "total": 1250,
    "active": 980,
    "inactive": 270,
    "newLast7Days": 45
  },
  "items": {
    "total": 3400,
    "available": 2100,
    "inTrade": 450,
    "newLast7Days": 120
  },
  "trades": {
    "total": 890,
    "active": 156,
    "completed": 650,
    "newLast7Days": 34
  },
  "verifications": {
    "total": 425,
    "pending": 23,
    "approved": 380
  }
}
```

**User Management:**

```bash
# List all users with filtering
GET /admin/users?page=1&limit=20&search=john&role=USER&isActive=true

# Get detailed user information
GET /admin/users/:id
Response: {
  "id": "user-123",
  "username": "john_doe",
  "email": "john@example.com",
  "role": "USER",
  "isActive": true,
  "isVerified": true,
  "stats": { ... },
  "auditLogs": [ ... ]  // Recent audit logs for this user
}

# Ban user
PATCH /admin/users/:id/ban
{
  "reason": "Violating community guidelines"
}

# Unban user
PATCH /admin/users/:id/unban
{
  "reason": "Appeal accepted, behavior improved"
}

# Change user role
PATCH /admin/users/:id/role
{
  "role": "MODERATOR",
  "reason": "Promoted to content moderator"
}
```

**Audit Logs:**

```bash
# Get audit logs with filtering
GET /admin/audit-logs?page=1&limit=50&action=USER_BAN&performedById=admin-123

# Get audit log statistics
GET /admin/audit-logs/stats
Response: {
  "totalLogs": 1450,
  "recentLogs": 89,  // Last 24 hours
  "byAction": {
    "USER_BAN": 23,
    "USER_UNBAN": 12,
    "ROLE_CHANGE": 8,
    ...
  }
}
```

### Guards & Decorators

**AdminGuard:**

- Requires ADMIN role (or legacy isAdmin flag)
- Protects all `/admin/*` endpoints

**ModeratorGuard:**

- Requires MODERATOR or ADMIN role
- Used for content moderation features

**SupportGuard:**

- Requires SUPPORT, MODERATOR, or ADMIN role
- Used for customer support features

**Usage:**

```typescript
@UseGuards(JwtAuthGuard, AdminGuard)
@Get('admin/stats')
async getStats() {
  return this.adminService.getPlatformStats();
}
```

### Audit Log System

Comprehensive logging of all admin actions for compliance and security:

**Tracked Actions:**

- USER_BAN, USER_UNBAN, USER_SUSPEND
- ROLE_CHANGE
- ITEM_FLAG, ITEM_APPROVE, ITEM_REMOVE
- VERIFICATION_APPROVE, VERIFICATION_REJECT
- And more...

**Audit Log Fields:**

- Action type (enum)
- Admin who performed action
- Target entity (type + ID)
- Description and reason
- IP address
- JSON metadata
- Timestamp

**Features:**

- Paginated log retrieval
- Filtering by action, admin, target
- Statistics and grouping
- Silent failure (doesn't throw errors)

### Business Rules

- ✅ Cannot ban admin users (protection)
- ✅ Role changes update both `role` and legacy `isAdmin` field
- ✅ All admin actions are logged with full context
- ✅ Audit logs cannot be deleted (immutable)
- ✅ Backward compatibility with existing `isAdmin` field

### Future Enhancements

- [ ] Content moderation queue
- [ ] Bulk user actions
- [ ] Automated moderation rules
- [ ] Admin activity dashboard
- [ ] Role permission customization
- [ ] Admin notification system

---

## 🔔 Real-time Features

### WebSocket Notifications

Connect to the WebSocket server for real-time notification updates:

```typescript
import { io } from 'socket.io-client';

const socket = io('ws://localhost:3001/notifications', {
  auth: {
    token: 'your-jwt-token',
  },
});

// Subscribe to notifications
socket.emit('subscribe', userId);

// Listen for events
socket.on('notification', (notification) => {
  console.log('New notification:', notification);
});

socket.on('notificationRead', ({ notificationId }) => {
  console.log('Notification marked as read:', notificationId);
});

socket.on('allNotificationsRead', ({ count }) => {
  console.log(`${count} notifications marked as read`);
});

socket.on('notificationDeleted', ({ notificationId }) => {
  console.log('Notification deleted:', notificationId);
});

// Messaging events (v0.9.0)
socket.on('message', (message) => {
  console.log('New message received:', message);
});

socket.on('messageRead', ({ messageId, conversationId }) => {
  console.log('Message marked as read:', messageId);
});

socket.on('conversationRead', ({ conversationId, count }) => {
  console.log(`${count} messages marked as read in conversation`);
});

socket.on('messageDeleted', ({ messageId, conversationId }) => {
  console.log('Message deleted:', messageId);
});

socket.on('typing', ({ conversationId, isTyping, username }) => {
  console.log(`${username} is ${isTyping ? 'typing' : 'stopped typing'}`);
});

// Dispute events (v0.12.0)
socket.on('dispute', (dispute) => {
  console.log('New dispute created:', dispute);
});

socket.on('disputeUpdated', (dispute) => {
  console.log('Dispute updated:', dispute);
});

socket.on('disputeResolved', ({ disputeId, resolution }) => {
  console.log('Dispute resolved:', disputeId, resolution);
});

socket.on('disputeMessage', (message) => {
  console.log('New dispute message:', message);
});
```

### Email Notifications

Email notifications are automatically sent for:

- **Trade Proposals** - When someone proposes a trade
- **Trade Accepted** - When a trade is accepted
- **Trade Rejected** - When a trade is declined
- **Trade Cancelled** - When a trade is cancelled
- **Trade Expired** - When a trade expires (v0.11.1)
- **New Review** - When someone reviews you (v0.10.1)
- **New Dispute** - When a dispute is filed (v0.12.0)
- **Dispute Resolved** - When a dispute is resolved (v0.12.0)
- **Welcome Email** - When a new user registers

#### Email Configuration

For Gmail, enable 2FA and use an App Password:

1. Go to Google Account Settings → Security
2. Enable 2-Step Verification
3. Generate App Password for "Mail"
4. Use the generated password in `MAIL_PASSWORD`

#### Disabling Email

Email is optional. If `MAIL_USER` or `MAIL_PASSWORD` is not set, the system gracefully disables email sending without affecting other functionality.

### Notification Preferences

Users can control which notifications they receive via push (in-app) and email:

```typescript
{
  // Email preferences
  emailTradeProposal: true,
  emailTradeAccepted: true,
  emailTradeRejected: true,
  emailTradeCancelled: true,
  emailNewMessage: true,
  emailNewComment: true,
  emailNewLike: true,
  emailNewReview: true,

  // Push/in-app preferences
  pushTradeProposal: true,
  pushTradeAccepted: true,
  pushTradeRejected: true,
  pushTradeCancelled: true,
  pushNewMessage: true,
  pushNewComment: true,
  pushNewLike: true,
  pushNewReview: true
}
```

All preferences default to `true` (opt-out model).

---

## 🗄️ Database

### Prisma Commands

```bash
# Create migration
yarn prisma migrate dev --name migration-name

# Apply migrations (production)
yarn prisma migrate deploy

# Open Prisma Studio
yarn prisma studio

# Reset database (DESTRUCTIVE!)
yarn prisma migrate reset
```

### Schema Overview

- **User** - User accounts with authentication and reputation
- **Item** - Trading items with categories/conditions
- **ItemImage** - Multiple images per item
- **Trade** - Trade proposals between users (supports multi-item trades)
- **TradeItem** - Join table for multi-item trades (v0.13.0)
- **CounterOffer** - Alternative trade proposals (v0.11.0)
- **CounterOfferItem** - Items in counter-offers
- **Review** - Trade reviews and ratings (v0.10.1)
- **Dispute** - Trade dispute resolution (v0.12.0)
- **DisputeMessage** - Messages within disputes
- **Like** - Item likes
- **Comment** - Item comments
- **Message** - Chat messages
- **Conversation** - Message threads between users
- **Notification** - In-app notifications
- **NotificationPreference** - User notification settings
- **UserSettings** - Privacy and preference controls (v0.14.0)

---

## 🧪 Testing

**484 tests passing** across 33 test suites, covering all features from v0.2.0 through v1.0.0.

```bash
# Unit tests
yarn test

# E2E tests
yarn test:e2e

# Test coverage
yarn test:cov

# Watch mode
yarn test:watch
```

---

## 🔐 Security

- **JWT Authentication** - Secure token-based auth
- **Bcrypt** - Password hashing with salt rounds
- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing
- **Rate Limiting** - Throttling with @nestjs/throttler
- **Validation** - Strict DTO validation with class-validator

---

## 📝 Path Aliases

TypeScript path aliases configured in `tsconfig.json`:

```typescript
import { PrismaService } from '@/prisma/prisma.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/auth/decorators/auth.decorators';
```

All imports use the `@/` prefix for cleaner code.

---

## 🚀 Deployment

### Vercel (Recommended)

1. Install Vercel CLI

   ```bash
   npm i -g vercel
   ```

2. Deploy

   ```bash
   vercel
   ```

3. Set environment variables in Vercel dashboard

### Environment Variables (Production)

```env
DATABASE_URL="your-production-postgres-url"
JWT_SECRET="your-production-secret"
REDIS_HOST="your-redis-host"
CLOUDINARY_CLOUD_NAME="your-cloud"
CLOUDINARY_API_KEY="your-key"
CLOUDINARY_API_SECRET="your-secret"
NODE_ENV=production
```

---

## 🚀 Redis Caching

### Overview

The backend uses Redis for distributed caching and rate limiting. This provides:

- **~20x performance improvement** for cached responses (150ms → 10ms)
- Distributed rate limiting across multiple server instances
- Automatic cache invalidation on data changes

### What's Cached

- ✅ **Item listings** (`GET /api/items`) - 5 minute TTL
- ✅ **Rate limiting** - Distributed across all instances

### Cache Service

The `CacheService` is globally available and provides:

#### Basic Operations

```typescript
// Get from cache
const value = await cacheService.get<Type>(key);

// Set in cache with TTL
await cacheService.set(key, value, 300000); // 5 minutes

// Delete from cache
await cacheService.del(key);
```

#### Domain-Specific Key Generators

```typescript
// Items
cacheService.getItemsListKey(page, limit, filters?);
cacheService.getItemKey(itemId);

// Users
cacheService.getUserKey(userId);
cacheService.getUserItemsKey(userId);

// Messages
cacheService.getUnreadMessagesKey(userId);
cacheService.getConversationsKey(userId);

// Notifications
cacheService.getUnreadNotificationsKey(userId);

// Trades
cacheService.getTradeKey(tradeId);
cacheService.getUserTradesKey(userId);
```

#### Cache Invalidation Helpers

```typescript
// Clear item and related lists
await cacheService.invalidateItem(itemId);

// Clear all user-related caches
await cacheService.invalidateUser(userId);

// Clear notification/message counts
await cacheService.invalidateUnreadCounts(userId);

// Clear trade-related caches
await cacheService.invalidateTrade(tradeId);
```

### Implementation Example

```typescript
async findAll(skip = 0, take = 20): Promise<ItemResponseDto[]> {
  // 1. Generate cache key
  const page = Math.floor(skip / take);
  const cacheKey = this.cacheService.getItemsListKey(page, take);

  // 2. Try cache first
  const cached = await this.cacheService.get<ItemResponseDto[]>(cacheKey);
  if (cached) return cached;

  // 3. Fetch from database if not cached
  const items = await this.prisma.item.findMany({ ... });
  const response = items.map(item => this.mapToResponse(item));

  // 4. Cache the result
  await this.cacheService.set(cacheKey, response, 300000);

  return response;
}

// Invalidate on mutations
async create(userId: string, dto: CreateItemDto) {
  const item = await this.prisma.item.create({ ... });
  await this.cacheService.invalidateItem(item.id);
  return item;
}
```

### Cache Keys Structure

| Pattern                               | Example                               | TTL    | Invalidated On               |
| ------------------------------------- | ------------------------------------- | ------ | ---------------------------- |
| `items:list:{page}:{limit}:{filters}` | `items:list:0:20:all`                 | 5 min  | Item created/updated/deleted |
| `items:{itemId}`                      | `items:abc-123`                       | 5 min  | Item updated/deleted         |
| `users:{userId}`                      | `users:user-456`                      | 10 min | User profile updated         |
| `users:{userId}:items`                | `users:user-456:items`                | 5 min  | User's item created/deleted  |
| `users:{userId}:notifications:unread` | `users:user-456:notifications:unread` | 1 min  | Notification marked read     |
| `users:{userId}:messages:unread`      | `users:user-456:messages:unread`      | 1 min  | Message marked read          |
| `trades:{tradeId}`                    | `trades:trade-789`                    | 5 min  | Trade updated                |

### Testing with Cache

Mock the `CacheService` in tests:

```typescript
const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  invalidateItem: jest.fn(),
  getItemsListKey: jest.fn((page, limit) => `items:list:${page}:${limit}:all`),
};

// In test module
{
  provide: CacheService,
  useValue: mockCacheService,
}

// Test cache hit
mockCacheService.get.mockResolvedValue([{ id: '1', title: 'Cached Item' }]);
const result = await service.findAll();
expect(mockCacheService.get).toHaveBeenCalled();
expect(prisma.item.findMany).not.toHaveBeenCalled(); // DB not queried

// Test cache miss
mockCacheService.get.mockResolvedValue(null);
const result = await service.findAll();
expect(prisma.item.findMany).toHaveBeenCalled(); // DB queried
expect(mockCacheService.set).toHaveBeenCalled(); // Result cached
```

### Advanced Caching Features

#### 1. @Cacheable() Decorator

Automatically cache method results with declarative syntax:

```typescript
import { Cacheable, CacheInvalidate } from '@/cache/cache.module';

@Injectable()
export class UsersService {
  constructor(private cacheService: CacheService) {}

  // Automatic caching with default options (1 min TTL)
  @Cacheable()
  async getUserById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  // Custom TTL and prefix
  @Cacheable({ ttl: 600000, prefix: 'users' })
  async getUserProfile(id: string) {
    return this.getUserWithStats(id);
  }

  // Custom key generator
  @Cacheable({
    ttl: 300000,
    keyGenerator: (userId: string) => `custom:${userId}`,
  })
  async getCustomData(userId: string) {
    return this.fetchExpensiveData(userId);
  }

  // Automatic cache invalidation
  @CacheInvalidate(['users:*', 'profiles:*'])
  async updateUser(id: string, data: UpdateUserDto) {
    return this.prisma.user.update({ where: { id }, data });
  }

  // Dynamic invalidation based on arguments
  @CacheInvalidate((id: string) => [`users:${id}`, `profiles:${id}`])
  async deleteUser(id: string) {
    return this.prisma.user.delete({ where: { id } });
  }
}
```

**Features:**

- ✨ Automatic cache-aside pattern
- 🎯 Configurable TTL per method
- 🔑 Custom key generators
- 🗑️ Automatic cache invalidation
- 📝 Clean, declarative syntax

#### 2. HTTP Cache Interceptor

Controller-level caching with HTTP standards (ETags, Cache-Control):

```typescript
import { HttpCacheInterceptor } from '@/cache/cache.module';

@Controller('items')
export class ItemsController {
  // Cache GET requests for 5 minutes
  @Get()
  @UseInterceptors(new HttpCacheInterceptor({ ttl: 300 }))
  findAll(@Query() query: ItemQueryDto) {
    return this.itemsService.findAll(query);
  }

  // Custom key generator for user-specific caching
  @Get('my-items')
  @UseInterceptors(
    new HttpCacheInterceptor({
      ttl: 60,
      keyGenerator: (req) => `user-items:${req.user.id}`,
    }),
  )
  getMyItems(@CurrentUser() user: User) {
    return this.itemsService.findByUser(user.id);
  }

  // Disable ETags
  @Get('public')
  @UseInterceptors(new HttpCacheInterceptor({ ttl: 3600, useETag: false }))
  getPublicItems() {
    return this.itemsService.findPublic();
  }
}
```

**Features:**

- 🌐 HTTP-standard caching (ETags, Cache-Control)
- ⚡ 304 Not Modified responses
- 🔒 Per-user cache isolation
- 📋 Only caches GET requests with 200 responses
- 🎛️ Configurable ETag usage

**Response Headers:**

```http
HTTP/1.1 200 OK
ETag: "a4f3d2c1b0"
Cache-Control: public, max-age=300
Vary: Accept-Encoding
```

**Conditional Request:**

```http
GET /api/items
If-None-Match: "a4f3d2c1b0"

HTTP/1.1 304 Not Modified
```

#### 3. Cache Warming

Pre-populate cache on application startup for frequently accessed data:

```typescript
// Automatically runs on app startup
// src/cache/cache-warming.service.ts

@Injectable()
export class CacheWarmingService implements OnModuleInit {
  async onModuleInit() {
    // Warms:
    // - Recent items (first page)
    // - Popular items (most engagement)
  }
}
```

**Configuration:**

```typescript
// Custom configuration
const warmingService = new CacheWarmingService(cacheService, prisma, {
  enabled: true,
  itemsCount: 20,
  ttl: 300000, // 5 minutes
});

// Manual trigger (for scheduled tasks)
await warmingService.warmCache();
```

**Benefits:**

- 🚀 Fast first requests after startup
- 📊 Pre-caches popular content
- 🔧 Configurable warming strategies
- ⏰ Manual trigger for scheduled refresh

#### 4. Cache Monitoring

Track cache performance with built-in metrics:

```typescript
// Access monitoring service
@Injectable()
export class MyService {
  constructor(private monitoring: CacheMonitoringService) {}

  async someMethod() {
    // Track cache operations
    this.monitoring.recordGet();
    const cached = await this.cacheService.get(key);

    if (cached) {
      this.monitoring.recordHit();
    } else {
      this.monitoring.recordMiss();
      // Fetch from DB...
      this.monitoring.recordSet();
    }
  }
}
```

**Metrics Endpoints:**

```bash
# Get cache statistics
GET /cache/stats
{
  "hits": 1500,
  "misses": 300,
  "hitRate": 83.33,
  "totalRequests": 1800,
  "operations": {
    "get": 1800,
    "set": 400,
    "del": 50
  },
  "timestamp": "2025-11-22T14:35:00.000Z"
}

# Get health status
GET /cache/health
{
  "status": "healthy",
  "uptime": 3600000,
  "hitRate": 83.33,
  "totalRequests": 1800
}

# Reset statistics
POST /cache/reset-stats
{
  "message": "Cache statistics reset successfully"
}
```

**Features:**

- 📈 Hit/miss rate tracking
- 📊 Operation counters
- ⏱️ Uptime monitoring
- 🔍 Health check endpoint
- 🧹 Stats reset capability

### Performance Metrics

**Before Caching:**

- Item list request: ~150ms (DB query + serialization)
- Repeated requests: Same ~150ms

**After Caching:**

- First request: ~150ms (DB query + serialization + cache write)
- Cached requests: ~10ms (Redis fetch + deserialization)
- **~15x performance improvement**

### Dependencies

```json
{
  "@nest-lab/throttler-storage-redis": "^1.1.0",
  "@nestjs/cache-manager": "^3.0.1",
  "@nestjs/throttler": "^6.4.0",
  "cache-manager": "^7.2.5",
  "cache-manager-redis-yet": "^5.1.5",
  "ioredis": "^5.8.2"
}
```

---

## 🐛 Troubleshooting

### Prisma Issues

```bash
# Regenerate Prisma Client
yarn prisma generate

# Check migration status
yarn prisma migrate status

# Reset and reseed
yarn prisma migrate reset
```

### Port Already in Use

```bash
# Kill process on port 3001 (macOS/Linux)
lsof -ti:3001 | xargs kill -9
```

### Redis Connection Issues

```bash
# Check Redis is running
docker ps | grep redis

# Restart Redis
docker-compose restart redis
```

---

## 📚 Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)
- [Main Project README](../README.md)

---

<div align="center">
  <p>Part of the <a href="https://github.com/BereDarius/swapbuds">SWAPBUDS</a> project</p>
  <p>Made with ❤️ using NestJS</p>
</div>
