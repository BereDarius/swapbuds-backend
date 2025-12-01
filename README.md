# 🔵 SWAPBUDS Backend

> **RESTful API for the SWAPBUDS Trading Platform**

A production-ready NestJS backend with PostgreSQL, Redis, JWT authentication, and comprehensive API documentation.

**Version 1.1.3** (Platform Monitoring & Enhanced Moderation)

[![NestJS](https://img.shields.io/badge/NestJS-10-red.svg)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748.svg)](https://www.prisma.io/)

---

## 📖 Overview

This is the production-ready backend API for SWAPBUDS, providing secure authentication, item management, trading functionality, reviews, disputes, real-time messaging, and comprehensive user features. Built with NestJS and following enterprise best practices.

## 📚 Documentation Index

Navigate to each functionality module:

| Module             | Documentation                        | Purpose                                                       |
| ------------------ | ------------------------------------ | ------------------------------------------------------------- |
| **Setup**          | [SETUP.md](SETUP.md)                 | Installation, environment, running locally/production         |
| **Architecture**   | [ARCHITECTURE.md](ARCHITECTURE.md)   | Project structure, modules, database schema                   |
| **Authentication** | [AUTH.md](AUTH.md)                   | JWT, OAuth, MFA, guards, registration/login                   |
| **Users**          | [USERS.md](USERS.md)                 | User profiles, settings, statistics, filtering                |
| **Items**          | [ITEMS.md](ITEMS.md)                 | Item CRUD, categories, conditions, filtering, recommendations |
| **Trades**         | [TRADES.md](TRADES.md)               | Trading system, proposals, counter-offers, expiration         |
| **Reviews**        | [REVIEWS.md](REVIEWS.md)             | Reviews, ratings, reputation system                           |
| **Likes**          | [LIKES.md](LIKES.md)                 | Item likes, favorites system                                  |
| **Comments**       | [COMMENTS.md](COMMENTS.md)           | Comments on items                                             |
| **Disputes**       | [DISPUTES.md](DISPUTES.md)           | Dispute resolution system                                     |
| **Notifications**  | [NOTIFICATIONS.md](NOTIFICATIONS.md) | In-app notifications, preferences, unread counts              |
| **Messages**       | [MESSAGES.md](MESSAGES.md)           | Real-time messaging, conversations, WebSocket                 |
| **Support**        | [SUPPORT.md](SUPPORT.md)             | Live Support Chat, priority queue, agent assignment           |
| **Moderation**     | [MODERATION.md](MODERATION.md)       | Content moderation, flagging, bulk operations                 |
| **Admin**          | [ADMIN.md](ADMIN.md)                 | Admin dashboard, user management, roles                       |
| **GDPR**           | [GDPR.md](GDPR.md)                   | Data export, deletion, privacy compliance                     |
| **Verification**   | [VERIFICATION.md](VERIFICATION.md)   | ID verification, age checks, security                         |
| **Upload**         | [UPLOAD.md](UPLOAD.md)               | File uploads, Cloudinary integration                          |
| **Caching**        | [CACHING.md](CACHING.md)             | Redis caching, cache keys, performance                        |
| **Monitoring**     | [MONITORING.md](MONITORING.md)       | Health checks, metrics, platform monitoring                   |
| **Security**       | [SECURITY.md](SECURITY.md)           | Best practices, rate limiting, validation                     |
| **Testing**        | [TESTING.md](TESTING.md)             | Unit/E2E tests, mocks, fixtures                               |

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
- ✅ Content moderation system (flag/approve/remove items) (v1.1.1)
- ✅ Live Support Chat with priority queue & agent assignment (v1.1.2)
- ✅ Platform monitoring & health checks + bulk moderation actions (v1.1.3)

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
- **@nestjs/schedule** - Cron jobs for trade expiration
- **@nestjs/terminus** - Health checks and monitoring
- **Socket.IO** - WebSocket for real-time features
- **Nodemailer** - Email notifications

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Yarn 1.22+
- Docker (for local PostgreSQL & Redis)

### Installation & Setup

👉 **Start here:** [SETUP.md](SETUP.md)

```bash
# Install dependencies
yarn install

# Generate Prisma Client
yarn prisma generate

# Start Docker services
docker-compose up -d

# Run migrations
yarn prisma migrate dev

# Development mode
yarn dev
```

### Access Points

- **API:** http://localhost:3001/api
- **Swagger Docs:** http://localhost:3001/api/docs
- **Health Check:** http://localhost:3001/api/health
- **WebSocket:** ws://localhost:3001/notifications

## 📖 Getting Started by Role

### 👨‍💻 Backend Developers

1. [SETUP.md](SETUP.md) - Get the project running locally
2. [ARCHITECTURE.md](ARCHITECTURE.md) - Understand project structure
3. [AUTH.md](AUTH.md) - Learn authentication patterns
4. [SECURITY.md](SECURITY.md) - Understand security best practices

### 🔌 API Consumers

1. [AUTH.md](AUTH.md) - Register and authenticate
2. Browse individual feature docs (ITEMS.md, TRADES.md, etc.)
3. [SWAGGER DOCS](http://localhost:3001/api/docs) - Interactive API reference

### ⚙️ DevOps/Operations

1. [SETUP.md](SETUP.md) - Deployment instructions
2. [MONITORING.md](MONITORING.md) - Health checks and monitoring
3. [CACHING.md](CACHING.md) - Performance optimization
4. [SECURITY.md](SECURITY.md) - Security configuration

### 👑 Admins/Moderators

1. [ADMIN.md](ADMIN.md) - Admin dashboard and tools
2. [MODERATION.md](MODERATION.md) - Content moderation
3. [MONITORING.md](MONITORING.md) - Platform statistics

## 📊 Version History

- **v1.1.3** - Platform monitoring & enhanced moderation
- **v1.1.2** - Live Support Chat with priority queue
- **v1.1.1** - Content moderation system
- **v1.1.0** - Admin & moderation system with role-based access
- **v1.0.4** - ID verification & age verification
- **v1.0.3** - ID verification system
- **v1.0.2** - Smart recommendations & matching
- **v1.0.1** - Delivery method & value filtering
- **v1.0.0** - Production Ready
- **v0.14.0** - User settings and preferences
- **v0.13.0** - Multi-item trades
- **v0.12.0** - Dispute resolution
- **v0.11.2** - Trade statistics
- **v0.11.1** - Trade expiration system
- **v0.11.0** - Trade counter-offers
- **v0.10.3** - User filtering and search
- **v0.10.2** - Schema validation and type safety
- **v0.10.1** - Reviews and trade filtering
- **v0.10.0** - Redis caching system with decorators
- **v0.9.0** - Messaging system
- **v0.8.0** - WebSocket real-time notifications
- **v0.7.0** - Notifications system
- **v0.6.0** - Trading system
- **v0.5.0** - Likes and comments

---

<div align="center">
  <p>Part of the <a href="https://github.com/BereDarius/swapbuds">SWAPBUDS</a> project</p>
  <p>Made with ❤️ using NestJS</p>
</div>
