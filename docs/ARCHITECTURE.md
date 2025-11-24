# Architecture Module

## Overview

Project structure, module organization, and database schema for the SWAPBUDS backend.

## Project Structure

```
src/
├── admin/                 # Admin dashboard and user management
├── auth/                  # Authentication, JWT, OAuth
├── cache/                 # Redis caching and decorators
├── comments/              # Item comments
├── config/                # Configuration and environment
├── disputes/              # Dispute resolution system
├── gdpr/                  # GDPR compliance and data management
├── health/                # Health checks
├── items/                 # Item CRUD and recommendations
├── likes/                 # Item likes/favorites
├── mail/                  # Email notifications
├── messages/              # Real-time messaging
├── moderation/            # Content moderation
├── monitoring/            # Metrics and monitoring
├── notifications/         # In-app notifications
├── prisma/                # Prisma ORM configuration
├── recaptcha/             # reCAPTCHA integration
├── reviews/               # Reviews and ratings
├── support/               # Live support chat
├── trades/                # Trading system
├── upload/                # File uploads (Cloudinary)
├── users/                 # User management
├── verification/          # ID and age verification
├── app.module.ts          # Root module
└── main.ts                # Application entry point
```

## Module Structure

Each module follows this pattern:

```
module/
├── module.controller.ts      # HTTP request handlers
├── module.service.ts         # Business logic
├── module.module.ts          # Module definition
├── dto/
│   ├── create-*.dto.ts       # Creation validation
│   ├── update-*.dto.ts       # Update validation
│   └── *-response.dto.ts     # Response validation
├── guards/                   # Route guards (if needed)
├── interceptors/             # Custom interceptors (if needed)
├── strategies/               # Auth strategies (if needed)
└── *.spec.ts                 # Unit tests
```

## Database Schema (Prisma)

### Core Entities

**User**
- id, email, username, password
- firstName, lastName, bio, profileImage
- isVerified, role, isActive, isSuspended, isBanned
- createdAt, updatedAt

**Item**
- id, title, description, category, condition
- estimatedValue, deliveryMethod, deliveryScope
- ownerId, status, createdAt, updatedAt
- images

**Trade**
- id, offeredById, requestedById
- itemsOffered, itemsRequested
- status, deliveryMethod, expiresAt
- createdAt, updatedAt

**Review**
- id, tradeId, authorId, targetUserId
- rating, title, comment, categories
- isVerified, createdAt, updatedAt

**Message**
- id, conversationId, senderId, recipientId
- content, isRead, createdAt

**Notification**
- id, userId, type, title, message
- isRead, data, createdAt

**Verification**
- id, userId, type, status
- documentType, submittedAt, verifiedAt

**Dispute**
- id, tradeId, initiatedById, reason
- status, resolution, createdAt, updatedAt

## Authentication Flow

```
1. Register: POST /auth/register → Create user → JWT token
2. Login: POST /auth/login → Validate credentials → JWT token
3. Refresh: POST /auth/refresh → Validate refresh token → New JWT
4. Protected Route: Send JWT in Authorization header
5. JWT Guard: Validates token → Extracts user info
```

## Authorization Levels

- **PUBLIC** - No authentication required
- **JWT** - Valid JWT token required
- **SUPPORT** - Support role or above
- **MODERATOR** - Moderator role or above
- **ADMIN** - Admin role required

## Data Flow

### Item Creation
```
User → POST /items → Controller → Service → Database → Notification
```

### Trade Proposal
```
User A → POST /trades → Service → Database → Notification to User B
```

### Real-time Updates
```
WebSocket Connection → Gateway → Service → Broadcast to clients
```

## Key Design Patterns

### Decorators
- `@Public()` - Skip JWT authentication
- `@CurrentUser()` - Inject authenticated user
- `@Cacheable()` - Cache method result
- `@InvalidateCache()` - Clear cache keys
- `@UseGuards()` - Apply authentication guards

### Interceptors
- `HttpCacheInterceptor` - HTTP caching
- `MonitoringInterceptor` - Request/response timing
- `LoggingInterceptor` - Request logging

### Guards
- `JwtAuthGuard` - JWT validation
- `AdminGuard` - Admin role check
- `ModeratorGuard` - Moderator role check
- `SupportGuard` - Support role check
- `WsJwtGuard` - WebSocket JWT validation

## Technology Stack

- **Framework:** NestJS 10
- **Database:** PostgreSQL 15 + Prisma ORM
- **Cache:** Redis 7
- **Auth:** JWT + Passport
- **Real-time:** Socket.IO + WebSocket
- **File Storage:** Cloudinary
- **Email:** Nodemailer
- **Logging:** Winston
- **Documentation:** Swagger/OpenAPI
- **Validation:** Class Validator
- **Type Safety:** TypeScript 5

## Database Relationships

```
User (1) ← → (many) Item
User (1) ← → (many) Trade (as offeredBy/requestedBy)
User (1) ← → (many) Review
Item (1) ← → (many) Comment
Item (1) ← → (many) Like
Item (1) ← → (many) Notification
Trade (1) ← → (many) Review
Trade (1) ← → (many) Dispute
User (1) ← → (many) Message
User (1) ← → (many) Verification
```

## Deployment Architecture

```
Client (React/Next.js)
        ↓
Load Balancer (nginx)
        ↓
API Servers (Node.js/NestJS)
        ↓
┌───────┴───────┐
↓               ↓
PostgreSQL    Redis
(Database)    (Cache)
        ↓
Cloudinary (File Storage)
        ↓
Email Service (SMTP)
```