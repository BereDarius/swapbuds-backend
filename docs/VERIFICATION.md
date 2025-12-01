# Verification Module

## Overview

The Verification module handles user identity verification including ID verification, age verification, and document security.

**Features:**

- Identity document verification
- Age verification
- KYC (Know Your Customer) compliance
- Document security and validation
- Verification audit trails
- Rate limiting on verification attempts
- Automatic document cleanup

## Endpoints

| Method | Endpoint                      | Auth | Description                |
| ------ | ----------------------------- | ---- | -------------------------- |
| POST   | `/verification/id`            | JWT  | Submit ID for verification |
| GET    | `/verification/status`        | JWT  | Get verification status    |
| POST   | `/verification/age`           | JWT  | Submit age verification    |
| GET    | `/verification/documents`     | JWT  | Get uploaded documents     |
| DELETE | `/verification/documents/:id` | JWT  | Delete document            |

## Submit ID Verification

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
  "submittedAt": "2025-11-23T10:30:00Z",
  "estimatedReviewTime": "24-48 hours"
}
```

## Verification Status

### Get Verification Status

```bash
GET /verification/status
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "idVerified": true,
  "idVerificationDate": "2025-11-20T10:30:00Z",
  "ageVerified": true,
  "ageVerificationDate": "2025-11-20T10:30:00Z",
  "documents": [
    {
      "id": "doc-123",
      "type": "PASSPORT",
      "status": "VERIFIED",
      "uploadedAt": "2025-11-23T10:30:00Z"
    }
  ]
}
```

## Age Verification

### Submit Age Verification

```bash
POST /verification/age
Authorization: Bearer <token>
{
  "dateOfBirth": "1990-01-15"
}
```

**Response (201):**

```json
{
  "id": "age-verification-123",
  "userId": "user-123",
  "status": "VERIFIED",
  "verifiedAt": "2025-11-23T10:30:00Z",
  "minimumAge": 18
}
```

## Document Types

- PASSPORT
- DRIVER_LICENSE
- NATIONAL_ID
- RESIDENCE_PERMIT

## Verification Status

- PENDING
- VERIFIED
- REJECTED
- EXPIRED

## Implementation Details

**Module:** `src/verification/`

**Key Files:**

- `verification.controller.ts` - API endpoints
- `verification.service.ts` - Business logic
- `document-security.service.ts` - Document validation
- `verification-audit.service.ts` - Audit logging
- `verification-rate-limit.service.ts` - Rate limiting
