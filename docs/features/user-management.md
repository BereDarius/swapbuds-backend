# User Management

Comprehensive documentation for user authentication, profiles, and identity verification in SwapBuds.

---

## Table of Contents

1. [Authentication](#authentication)
2. [User Profiles](#user-profiles)
3. [Identity Verification](#identity-verification)
4. [Selfie Verification](#selfie-verification)

---

## Authentication

### Overview

JWT-based authentication with OAuth support, MFA capabilities, and multiple login strategies.

**Features:**

- JWT token-based authentication
- User registration and login
- Token refresh mechanism
- OAuth2 strategies (Google, Facebook, Apple)
- Multi-Factor Authentication (MFA)
- Role-based access control with custom guards
- Password hashing with bcrypt

### Endpoints

| Method | Endpoint               | Auth   | Description                    |
| ------ | ---------------------- | ------ | ------------------------------ |
| POST   | `/auth/register`       | Public | Register new user              |
| POST   | `/auth/login`          | Public | Login and get JWT tokens       |
| POST   | `/auth/refresh`        | Public | Refresh expired token          |
| GET    | `/auth/me`             | JWT    | Get current authenticated user |
| POST   | `/auth/logout`         | JWT    | Logout (invalidate token)      |
| POST   | `/auth/oauth/google`   | Public | Google OAuth login             |
| POST   | `/auth/oauth/facebook` | Public | Facebook OAuth login           |
| POST   | `/auth/oauth/apple`    | Public | Apple OAuth login              |
| POST   | `/auth/mfa/setup`      | JWT    | Setup MFA for user             |
| POST   | `/auth/mfa/verify`     | JWT    | Verify MFA code                |
| DELETE | `/auth/mfa`            | JWT    | Disable MFA for user           |

### Registration

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
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "username": "john_doe",
    "firstName": "John",
    "lastName": "Doe"
  },
  "tokens": {
    "accessToken": "<jwt-access-token>",
    "refreshToken": "<jwt-refresh-token>"
  }
}
```

### Login

```bash
POST /auth/login
{
  "email": "user@example.com",
  "password": "securePassword123!"
}
```

### Token Refresh

```bash
POST /auth/refresh
{
  "refreshToken": "<jwt-refresh-token>"
}
```

### OAuth Login

```bash
POST /auth/oauth/google
{
  "token": "google-oauth-token"
}
```

---

## User Profiles

### Overview

User profile management, settings, statistics, and comprehensive user data with filtering and search capabilities.

**Features:**

- User profile management
- User settings and preferences
- User statistics and reputation
- Advanced filtering and search
- Profile image uploads
- Verified badges
- Account deletion (GDPR)

### Endpoints

| Method | Endpoint                | Auth   | Description                     |
| ------ | ----------------------- | ------ | ------------------------------- |
| GET    | `/users/:id`            | Public | Get user profile                |
| GET    | `/users/:id/stats`      | Public | Get user trade statistics       |
| GET    | `/users/:id/reputation` | Public | Get user reputation             |
| GET    | `/users/filter`         | Public | Filter users with pagination    |
| PATCH  | `/users/:id`            | JWT    | Update own profile (owner only) |
| GET    | `/users/settings`       | JWT    | Get user settings               |
| PATCH  | `/users/settings`       | JWT    | Update user settings            |
| DELETE | `/users/:id`            | JWT    | Delete account (owner only)     |

### Get User Profile

```bash
GET /users/user-123
```

**Response (200):**

```json
{
  "id": "user-123",
  "email": "user@example.com",
  "username": "john_doe",
  "firstName": "John",
  "lastName": "Doe",
  "bio": "Trading enthusiast",
  "profileImage": "https://cdn.example.com/avatar.jpg",
  "isVerified": true,
  "role": "USER",
  "createdAt": "2025-01-15T10:00:00Z",
  "stats": {
    "totalTrades": 42,
    "completedTrades": 40,
    "rating": 4.8
  }
}
```

### Update Profile

```bash
PATCH /users/user-123
Authorization: Bearer <token>
{
  "bio": "Updated bio",
  "profileImage": "https://cdn.example.com/new-avatar.jpg"
}
```

### User Settings

```bash
GET /users/settings
Authorization: Bearer <token>
```

**Response:**

```json
{
  "emailNotifications": true,
  "pushNotifications": true,
  "tradeNotifications": true,
  "messageNotifications": true,
  "language": "en",
  "timezone": "America/New_York"
}
```

---

## Identity Verification

### Overview

User identity verification including ID verification, age verification (18+), and document security for platform safety.

**Features:**

- Identity document verification (Passport, Driver's License, National ID)
- Age verification (18+ requirement)
- KYC (Know Your Customer) compliance
- Document security and validation
- Verification audit trails
- Rate limiting on verification attempts
- Automatic document cleanup

### Endpoints

| Method | Endpoint                      | Auth | Description                |
| ------ | ----------------------------- | ---- | -------------------------- |
| POST   | `/verification/id`            | JWT  | Submit ID for verification |
| GET    | `/verification/status`        | JWT  | Get verification status    |
| POST   | `/verification/age`           | JWT  | Submit age verification    |
| GET    | `/verification/documents`     | JWT  | Get uploaded documents     |
| DELETE | `/verification/documents/:id` | JWT  | Delete document            |

### Submit ID Verification

```bash
POST /verification/id
Authorization: Bearer <token>
Content-Type: multipart/form-data
{
  "documentType": "PASSPORT",
  "document": <file>,
  "selfie": <file>,
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-01-15"
}
```

**Response (201):**

```json
{
  "id": "verification-123",
  "userId": "user-123",
  "type": "ID_VERIFICATION",
  "documentType": "PASSPORT",
  "status": "PENDING",
  "submittedAt": "2025-12-21T10:00:00Z"
}
```

### Get Verification Status

```bash
GET /verification/status
Authorization: Bearer <token>
```

**Response:**

```json
{
  "id": "verification-123",
  "status": "APPROVED",
  "documentType": "PASSPORT",
  "verifiedAt": "2025-12-21T11:00:00Z",
  "isAgeVerified": true
}
```

### Document Types

- **PASSPORT** - International passport
- **DRIVERS_LICENSE** - Driver's license
- **NATIONAL_ID** - National identity card

### Verification Status

- **PENDING** - Submitted, awaiting review
- **APPROVED** - Verified successfully
- **REJECTED** - Verification failed
- **EXPIRED** - Document expired

---

## Selfie Verification

### Overview

Live selfie verification adds an additional security layer by requiring users to submit a live selfie photo holding their ID document. This ensures the person submitting the verification is the actual owner of the ID document.

**Purpose:**

- **Identity Verification**: Ensures the person submitting the ID is the actual owner
- **Security Enhancement**: Prevents stolen/borrowed ID document usage
- **Fraud Prevention**: Helps admins detect fake or mismatched documents
- **Compliance**: Strengthens KYC (Know Your Customer) requirements

### Implementation

The selfie verification is integrated into the ID verification process. Users must submit:

1. **Front of ID document** (required)
2. **Back of ID document** (optional for passports)
3. **Live selfie holding ID** (required)

### Database Schema

```prisma
model UserVerification {
  id                String   @id @default(uuid())
  userId            String   @unique

  documentType      DocumentType
  documentUrlFront  String  // Front of ID document
  documentUrlBack   String? // Back of ID document (optional)
  selfieUrl         String  // Live selfie photo holding ID

  status            VerificationStatus @default(PENDING)
  verifiedAt        DateTime?
  rejectionReason   String?

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

### Submission Process

```bash
POST /verification/id
Authorization: Bearer <token>
Content-Type: multipart/form-data

# Upload 3 files:
- documentFront: <ID front image>
- documentBack: <ID back image> (optional)
- selfie: <Selfie holding ID>

# Additional data:
{
  "documentType": "PASSPORT",
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-01-15"
}
```

### Validation Rules

- **Selfie file required**: Must be submitted with ID documents
- **File format**: JPG, PNG (max 5MB per file)
- **Face detection**: Selfie must contain a visible face
- **ID visible**: ID document must be visible in selfie
- **Match verification**: Admin verifies face in selfie matches ID photo

### Admin Review Process

Admins review submissions and check:

1. Face in selfie matches ID photo
2. ID document is visible and readable in selfie
3. ID details match submitted information
4. User is 18+ years old
5. Documents appear authentic (not tampered)

### Rejection Reasons

- Face does not match ID photo
- ID document not clearly visible in selfie
- Blurry or low-quality images
- Documents appear fake or tampered
- User under 18 years old
- Information mismatch between ID and submission

### Security Measures

- **Encrypted storage**: All documents stored encrypted
- **Access control**: Only admins can view verification documents
- **Audit logging**: All verification actions logged
- **Auto-deletion**: Documents deleted after 90 days (GDPR)
- **Rate limiting**: Max 3 verification attempts per day

---

## Related Modules

- **Admin**: Verification review and approval
- **Moderation**: Flagging suspicious verifications
- **Audit**: Compliance logging
- **Security**: Document encryption and access control

---

**Last Updated:** December 21, 2025
