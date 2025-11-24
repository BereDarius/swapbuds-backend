# Security Module

## Overview

The Security module provides authentication, authorization, rate limiting, validation, and security best practices.

**Features:**
- JWT token validation
- Rate limiting
- Request validation
- CORS configuration
- Helmet security headers
- Password hashing
- SQL injection prevention
- XSS protection

## Rate Limiting

### Global Rate Limit
- **Default:** 100 requests per 15 minutes per IP
- **Apply to:** All endpoints except `/health`

### Endpoint-Specific Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/auth/login` | 5 requests | 15 minutes |
| `/auth/register` | 3 requests | 1 hour |
| `/verification/*` | 10 requests | 24 hours |
| `/messages` | 50 requests | 1 minute |

## Request Validation

### Payload Validation
```typescript
// Example DTO with validation
import { IsEmail, MinLength, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}
```

### CORS Configuration
```typescript
{
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
  allowedHeaders: ['Content-Type', 'Authorization']
}
```

## Security Headers

**Helmet.js Configuration:**
- Content Security Policy (CSP)
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security (HSTS)
- X-XSS-Protection

## Password Security

### Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Hashing
- Algorithm: bcrypt
- Rounds: 10

## API Security

### JWT Token Claims
```json
{
  "sub": "user-123",
  "email": "user@example.com",
  "roles": ["USER"],
  "iat": 1700000000,
  "exp": 1700604800
}
```

### Token Validation
- **Issuer:** SWAPBUDS
- **Signature Algorithm:** HS256
- **Expiration:** 7 days access token, 30 days refresh token

## SQL Injection Prevention

- Use Prisma ORM (parameterized queries)
- Input validation on all endpoints
- Type checking with TypeScript

## XSS Prevention

- HTML entity encoding for user input
- Content Security Policy headers
- Sanitization of rich text inputs

## HTTPS/TLS

- Minimum TLS 1.2
- Strong cipher suites
- HSTS enabled (max-age: 31536000)

## Implementation Details

**Module:** `src/auth/` and `src/config/`

**Key Files:**
- `auth/guards/` - Authentication guards
- `config/configuration.ts` - Security configuration
- Global middleware for rate limiting and validation