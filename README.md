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

### In Progress

- 🚧 Trading system
- 🚧 Real-time chat
- 🚧 Notifications
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

## 📬 Support

For issues and questions:

- Open an issue on [GitHub](https://github.com/BereDarius/swapbuds-backend/issues)
- Check the [main project](https://github.com/BereDarius/swapbuds)

---

<div align="center">
  <p>Part of the <a href="https://github.com/BereDarius/swapbuds">SWAPBUDS</a> project</p>
  <p>Made with ❤️ using NestJS</p>
</div>

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://kamilmysliwiec.com)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](LICENSE).
