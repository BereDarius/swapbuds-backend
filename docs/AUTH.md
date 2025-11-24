# Authentication Module

## Overview

The Authentication module provides secure JWT-based authentication with OAuth support, MFA capabilities, and multiple login strategies.

**Features:**
- JWT token-based authentication
- User registration and login
- Token refresh mechanism
- OAuth2 strategies (Google, Facebook, Apple)
- Multi-Factor Authentication (MFA)
- Role-based access control with custom guards
- Password hashing with bcrypt

## Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | Public | Register new user |
| POST | `/auth/login` | Public | Login and get JWT tokens |
| POST | `/auth/refresh` | Public | Refresh expired token |
| GET | `/auth/me` | JWT | Get current authenticated user |
| POST | `/auth/logout` | JWT | Logout (invalidate token) |
| POST | `/auth/oauth/google` | Public | Google OAuth login |
| POST | `/auth/oauth/facebook` | Public | Facebook OAuth login |
| POST | `/auth/oauth/apple` | Public | Apple OAuth login |
| POST | `/auth/mfa/setup` | JWT | Setup MFA for user |
| POST | `/auth/mfa/verify` | JWT | Verify MFA code |
| DELETE | `/auth/mfa` | JWT | Disable MFA for user |

## Registration

### Register New User

```bash
POST /auth/register
{
  "email": "user@example.com",
  "username": "john_doe",
  "password": "securePassword123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response (201):**
```json
{
  "id": "user-123",
  "email": "user@example.com",
  "username": "john_doe",
  "firstName": "John",
  "lastName": "Doe",
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 604800
}
```

## Implementation Details

**Module:** `src/auth/`

**Key Files:**
- `auth.controller.ts` - API endpoints
- `auth.service.ts` - Business logic
- `strategies/jwt.strategy.ts` - JWT strategy
- `strategies/google.strategy.ts` - Google OAuth
- `strategies/facebook.strategy.ts` - Facebook OAuth
- `strategies/apple.strategy.ts` - Apple OAuth
- `guards/jwt-auth.guard.ts` - JWT validation
- `guards/admin.guard.ts` - Admin role check
- `mfa.service.ts` - MFA implementation