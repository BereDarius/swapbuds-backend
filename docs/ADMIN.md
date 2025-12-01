# Admin Module

## Overview

The Admin module provides comprehensive admin dashboard and user management with role-based access control.

**Features:**

- User management and moderation
- Admin statistics and metrics
- Audit logging
- Account suspension/bans
- Role assignment
- Platform overview
- Admin actions history

## Endpoints

| Method | Endpoint                     | Auth  | Description             |
| ------ | ---------------------------- | ----- | ----------------------- |
| GET    | `/admin/stats`               | Admin | Get platform statistics |
| GET    | `/admin/users`               | Admin | List all users          |
| GET    | `/admin/users/:id`           | Admin | Get user details        |
| PATCH  | `/admin/users/:id/role`      | Admin | Change user role        |
| PATCH  | `/admin/users/:id/suspend`   | Admin | Suspend user account    |
| PATCH  | `/admin/users/:id/ban`       | Admin | Ban user permanently    |
| PATCH  | `/admin/users/:id/unsuspend` | Admin | Unsuspend user          |
| GET    | `/admin/audit-logs`          | Admin | Get audit logs          |
| GET    | `/admin/items`               | Admin | List flagged items      |
| GET    | `/admin/trades`              | Admin | List problematic trades |

## Platform Statistics

```bash
GET /admin/stats
Authorization: Bearer <admin-token>
```

**Response (200):**

```json
{
  "totalUsers": 1250,
  "activeUsers": 856,
  "totalTrades": 4532,
  "completedTrades": 3890,
  "totalItems": 8750,
  "activeItems": 6234,
  "suspendedUsers": 12,
  "bannedUsers": 8,
  "platformHealth": {
    "averageRating": 4.7,
    "completionRate": 85.8,
    "disputeRate": 2.3
  }
}
```

## User Management

### List Users

```bash
GET /admin/users?page=1&limit=20&role=USER&status=ACTIVE
Authorization: Bearer <admin-token>
```

### Get User Details

```bash
GET /admin/users/user-123
Authorization: Bearer <admin-token>
```

### Change User Role

```bash
PATCH /admin/users/user-123/role
Authorization: Bearer <admin-token>
{
  "role": "MODERATOR"
}
```

**Available Roles:**

- USER
- SUPPORT
- MODERATOR
- ADMIN

### Suspend User Account

```bash
PATCH /admin/users/user-123/suspend
Authorization: Bearer <admin-token>
{
  "reason": "Suspicious activity",
  "duration": 7
}
```

### Ban User Permanently

```bash
PATCH /admin/users/user-123/ban
Authorization: Bearer <admin-token>
{
  "reason": "Violation of terms of service"
}
```

## Audit Logs

### Get Audit Logs

```bash
GET /admin/audit-logs?action=USER_SUSPENDED&page=1&limit=20
Authorization: Bearer <admin-token>
```

**Response (200):**

```json
{
  "data": [
    {
      "id": "log-123",
      "admin": {
        "id": "admin-123",
        "username": "admin_user"
      },
      "action": "USER_SUSPENDED",
      "targetUser": "user-123",
      "details": "Suspicious activity",
      "createdAt": "2025-11-23T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 456,
    "pages": 23
  }
}
```

## Implementation Details

**Module:** `src/admin/`

**Key Files:**

- `admin.controller.ts` - API endpoints
- `admin.service.ts` - Business logic
- `audit-log.service.ts` - Audit logging
