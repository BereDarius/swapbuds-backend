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

- ✅ Notifications system (v0.7.0)
- ✅ WebSocket real-time notifications (v0.8.0)
- ✅ Email notifications (v0.8.0)
- ✅ Messaging system (v0.9.0)

### In Progress

- 🚧 Trading system (v0.6.0+)
- 🚧 Likes and comments

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

#### Items

- `POST /api/items` - Create item (protected)
- `GET /api/items` - List all items (public, paginated)
- `GET /api/items/:id` - Get item details (public)
- `GET /api/items/user/:userId` - Get user's items (public)
- `PATCH /api/items/:id` - Update item (owner only)
- `DELETE /api/items/:id` - Delete item (owner only)

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
