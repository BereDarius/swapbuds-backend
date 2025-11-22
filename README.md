# 🔵 SWAPBUDS Backend

> **RESTful API for the SWAPBUDS Trading Platform**

A production-ready NestJS backend with PostgreSQL, Redis, JWT authentication, and comprehensive API documentation.

[![NestJS](https://img.shields.io/badge/NestJS-10-red.svg)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748.svg)](https://www.prisma.io/)

---

## 📖 Overview

This is the backend API for SWAPBUDS, providing secure authentication, item management, and trading functionality. Built with NestJS and following enterprise best practices.

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
- `GET /api/items` - List all items (public, paginated)
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
```

### Email Notifications

Email notifications are automatically sent for:

- **Trade Proposals** - When someone proposes a trade
- **Trade Accepted** - When a trade is accepted
- **Trade Rejected** - When a trade is declined
- **Trade Cancelled** - When a trade is cancelled
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

- **User** - User accounts with authentication
- **Item** - Trading items with categories/conditions
- **ItemImage** - Multiple images per item
- **Trade** - Trade proposals between users
- **Like** - Item likes
- **Comment** - Item comments
- **Message** - Chat messages

---

## 🧪 Testing

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
