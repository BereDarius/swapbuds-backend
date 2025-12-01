# GDPR Module

## Overview

The GDPR module provides data privacy compliance features including data export, deletion, and consent management.

**Features:**

- Data export functionality
- Account deletion requests
- Data retention policies
- Privacy settings
- Consent management
- GDPR compliance reporting
- Data portability

## Endpoints

| Method | Endpoint                 | Auth | Description              |
| ------ | ------------------------ | ---- | ------------------------ |
| POST   | `/gdpr/export`           | JWT  | Request data export      |
| GET    | `/gdpr/export/:id`       | JWT  | Download exported data   |
| POST   | `/gdpr/delete`           | JWT  | Request account deletion |
| GET    | `/gdpr/delete-status`    | JWT  | Check deletion status    |
| GET    | `/gdpr/privacy-settings` | JWT  | Get privacy settings     |
| PATCH  | `/gdpr/privacy-settings` | JWT  | Update privacy settings  |

## Data Export

### Request Data Export

```bash
POST /gdpr/export
Authorization: Bearer <token>
{
  "includeMessages": true,
  "includeTrades": true,
  "includeItems": true,
  "includeReviews": true
}
```

**Response (202):**

```json
{
  "id": "export-123",
  "userId": "user-123",
  "status": "PROCESSING",
  "requestedAt": "2025-11-23T10:30:00Z",
  "estimatedCompletionTime": "2025-11-23T14:30:00Z"
}
```

### Download Exported Data

```bash
GET /gdpr/export/export-123
Authorization: Bearer <token>
```

**Response:** ZIP file containing user data in JSON format

## Account Deletion

### Request Account Deletion

```bash
POST /gdpr/delete
Authorization: Bearer <token>
{
  "password": "user_password",
  "reason": "No longer using platform"
}
```

**Response (202):**

```json
{
  "id": "deletion-123",
  "userId": "user-123",
  "status": "PENDING",
  "scheduledDeletionDate": "2025-12-23T10:30:00Z",
  "canCancelUntil": "2025-11-24T10:30:00Z"
}
```

### Check Deletion Status

```bash
GET /gdpr/delete-status
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "status": "PENDING",
  "scheduledDeletionDate": "2025-12-23T10:30:00Z",
  "canCancelUntil": "2025-11-24T10:30:00Z"
}
```

## Privacy Settings

### Get Privacy Settings

```bash
GET /gdpr/privacy-settings
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "userId": "user-123",
  "profileVisibility": "PUBLIC",
  "allowMessagesfromAnyone": true,
  "showOnlineStatus": true,
  "shareTradeHistory": true,
  "allowAnalytics": true,
  "allowMarketing": false
}
```

### Update Privacy Settings

```bash
PATCH /gdpr/privacy-settings
Authorization: Bearer <token>
{
  "profileVisibility": "PRIVATE",
  "allowMessagesfromAnyone": false,
  "allowMarketing": false
}
```

## Implementation Details

**Module:** `src/gdpr/`

**Key Files:**

- `gdpr.controller.ts` - API endpoints
- `gdpr.service.ts` - Business logic
- `data-export.service.ts` - Data export functionality
- `data-deletion.service.ts` - Deletion handling
