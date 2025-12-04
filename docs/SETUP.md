# Setup Module

## Overview

Installation, environment configuration, and deployment instructions for running SWAPBUDS backend.

## Prerequisites

- **Node.js** 18.x or higher
- **Yarn** 1.22.x or higher
- **Docker** (for local PostgreSQL and Redis)
- **Docker Compose** (for orchestration)
- **Git** (for version control)

## Installation

### 1. Clone Repository

```bash
git clone https://github.com/BereDarius/swapbuds.git
cd swapbuds
```

### 2. Install Dependencies

```bash
yarn install
```

### 3. Generate Prisma Client

```bash
yarn prisma generate
```

### 4. Create Environment File

Create `.env` in root directory:

```env
# Database
DATABASE_URL="postgresql://swapbuds_dev:swapbuds_dev_password@localhost:5432/swapbuds_dev"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"
REFRESH_TOKEN_EXPIRES_IN="30d"

# Redis
REDIS_HOST="localhost"
REDIS_PORT=6379

# Cloudinary
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Email
MAIL_HOST="smtp.gmail.com"
MAIL_PORT=587
MAIL_USER="your-email@gmail.com"
MAIL_PASSWORD="your-app-password"
MAIL_FROM="SwapBuds <noreply@swapbuds.com>"

# Frontend
FRONTEND_URL="http://localhost:3000"

# Server
PORT=3001
NODE_ENV=development

# reCAPTCHA
RECAPTCHA_SECRET_KEY="your-recaptcha-secret"
```

## Running Locally

### Start Docker Services

```bash
docker-compose up -d
```

Verify services:

```bash
docker ps
```

### Run Migrations

```bash
yarn prisma migrate dev
```

### Seed Database (Optional)

```bash
yarn prisma db seed
```

### Start Development Server

```bash
yarn dev
```

Server will be available at: `http://localhost:3001`

## API Endpoints

- **API Base:** http://localhost:3001/api
- **Swagger Docs:** http://localhost:3001/api/docs
- **Health Check:** http://localhost:3001/api/health
- **WebSocket:** ws://localhost:3001/notifications

## Available Scripts

```bash
# Development
yarn dev              # Start with hot reload

# Production
yarn build            # Build TypeScript
yarn start            # Run production build
yarn start       # Build and run

# Database
yarn prisma migrate dev    # Create migration
yarn prisma studio        # Open Prisma Studio
yarn prisma db seed       # Seed database

# Testing
yarn test             # Run unit tests
yarn test:e2e         # Run E2E tests
yarn test:cov         # Coverage report

# Linting
yarn lint             # ESLint check
yarn lint:fix         # Fix ESLint issues

# Format
yarn format           # Format with Prettier
```

## Production Deployment

### Environment Setup

Update `.env.production`:

```env
NODE_ENV=production
DATABASE_URL="postgresql://user:pass@prod-db:5432/swapbuds"
REDIS_HOST="prod-redis-host"
JWT_SECRET="production-secret-key"
FRONTEND_URL="https://swapbuds.com"
```

### Build for Production

```bash
yarn install --production
yarn build
```

### Run Production Server

```bash
yarn start
```

### Docker Deployment

```bash
docker build -t swapbuds-api .
docker run -p 3001:3001 --env-file .env.production swapbuds-api
```

## Database Backup & Restore

### Backup PostgreSQL

```bash
docker exec swapbuds-postgres pg_dump -U swapbuds_dev swapbuds_dev > backup.sql
```

### Restore PostgreSQL

```bash
docker exec -i swapbuds-postgres psql -U swapbuds_dev swapbuds_dev < backup.sql
```

## Troubleshooting

### Port Already in Use

```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9
```

### Database Connection Failed

```bash
# Check PostgreSQL container
docker logs swapbuds-postgres

# Restart services
docker-compose restart
```

### Redis Connection Failed

```bash
# Check Redis container
docker logs swapbuds-redis

# Test connection
redis-cli ping
```

## Implementation Details

Complete setup and deployment documentation.
