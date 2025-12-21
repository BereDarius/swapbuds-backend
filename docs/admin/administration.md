# Administration & Moderation

Comprehensive documentation for admin tools, content moderation, and dispute resolution in SwapBuds.

---

## Table of Contents

1. [Admin Dashboard](#admin-dashboard)
2. [Content Moderation](#content-moderation)
3. [Dispute Resolution](#dispute-resolution)

---

## Admin Dashboard

### Overview

The Admin module provides comprehensive admin dashboard and user management with role-based access control.

**Features:**

- User management and moderation
- Admin statistics and metrics
- Audit logging
- Account suspension/bans
- Role assignment
- Platform overview
- Admin actions history

### Endpoints

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

### Platform Statistics

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

### User Management

**List Users:**

```bash
GET /admin/users?page=1&limit=20&role=USER&status=ACTIVE
Authorization: Bearer <admin-token>
```

**Get User Details:**

```bash
GET /admin/users/user-123
Authorization: Bearer <admin-token>
```

**Change User Role:**

```bash
PATCH /admin/users/user-123/role
Authorization: Bearer <admin-token>
{
  "role": "MODERATOR"
}
```

**Suspend User:**

```bash
PATCH /admin/users/user-123/suspend
Authorization: Bearer <admin-token>
{
  "reason": "Violated community guidelines",
  "duration": 7
}
```

**Ban User:**

```bash
PATCH /admin/users/user-123/ban
Authorization: Bearer <admin-token>
{
  "reason": "Repeated violations",
  "permanent": true
}
```

### Audit Logs

```bash
GET /admin/audit-logs?page=1&limit=50&action=BAN_USER
Authorization: Bearer <admin-token>
```

**Response:**

```json
{
  "data": [
    {
      "id": "log-123",
      "action": "BAN_USER",
      "performedBy": "admin-456",
      "targetUser": "user-123",
      "reason": "Repeated violations",
      "timestamp": "2025-12-21T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 234
  }
}
```

### User Roles

- **USER** - Standard user
- **MODERATOR** - Content moderation
- **SUPPORT** - Customer support
- **ADMIN** - Full platform access

---

## Content Moderation

### Overview

The Moderation module provides content moderation tools for flagging, approving, and removing items and trades.

**Features:**

- Item and trade flagging
- Content moderation workflow
- Bulk moderation actions
- Moderator tools and dashboard
- Moderation history
- Appeal process
- Automated moderation rules

### Endpoints

| Method | Endpoint                        | Auth      | Description            |
| ------ | ------------------------------- | --------- | ---------------------- |
| POST   | `/moderation/flag/item`         | JWT       | Flag item for review   |
| POST   | `/moderation/flag/trade`        | JWT       | Flag trade for review  |
| GET    | `/moderation/items`             | Moderator | Get flagged items      |
| GET    | `/moderation/trades`            | Moderator | Get flagged trades     |
| PATCH  | `/moderation/items/:id/approve` | Moderator | Approve item           |
| PATCH  | `/moderation/items/:id/reject`  | Moderator | Remove item            |
| PATCH  | `/moderation/bulk-action`       | Moderator | Bulk moderation action |

### Flag Item

```bash
POST /moderation/flag/item
Authorization: Bearer <token>
{
  "itemId": "item-123",
  "reason": "INAPPROPRIATE_CONTENT",
  "description": "Item contains explicit content"
}
```

**Response (201):**

```json
{
  "id": "flag-123",
  "itemId": "item-123",
  "reportedBy": "user-123",
  "reason": "INAPPROPRIATE_CONTENT",
  "status": "PENDING",
  "createdAt": "2025-11-23T10:30:00Z"
}
```

### Flag Reasons

- **INAPPROPRIATE_CONTENT** - Explicit or offensive content
- **MISLEADING_DESCRIPTION** - False or misleading information
- **STOLEN_ITEM** - Reported as stolen property
- **COUNTERFEIT** - Fake or counterfeit goods
- **ILLEGAL_ITEM** - Prohibited or illegal items
- **HARASSMENT** - User harassment or abuse
- **OTHER** - Other violations

### Moderator Dashboard

**Get Flagged Items:**

```bash
GET /moderation/items?status=PENDING&page=1&limit=20
Authorization: Bearer <moderator-token>
```

**Response (200):**

```json
{
  "data": [
    {
      "id": "flag-123",
      "item": {
        "id": "item-123",
        "title": "iPhone 13",
        "description": "Flagged description",
        "images": ["url1", "url2"]
      },
      "reportedBy": {
        "id": "user-123",
        "username": "john_doe"
      },
      "reason": "INAPPROPRIATE_CONTENT",
      "description": "Contains explicit content",
      "status": "PENDING",
      "createdAt": "2025-12-21T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 8
  }
}
```

### Approve Item

```bash
PATCH /moderation/items/flag-123/approve
Authorization: Bearer <moderator-token>
{
  "reason": "No violation found"
}
```

### Reject Item

```bash
PATCH /moderation/items/flag-123/reject
Authorization: Bearer <moderator-token>
{
  "reason": "Violates community guidelines",
  "notifyUser": true
}
```

### Bulk Moderation

```bash
PATCH /moderation/bulk-action
Authorization: Bearer <moderator-token>
{
  "flagIds": ["flag-123", "flag-124", "flag-125"],
  "action": "APPROVE",
  "reason": "Bulk approval - no violations"
}
```

---

## Dispute Resolution

### Overview

The Disputes module handles trade dispute resolution with detailed messaging, admin review, and conflict resolution.

**Features:**

- Dispute creation and management
- Dispute messaging
- Admin resolution
- Evidence attachments
- Dispute history
- Automatic settlement recommendations

### Endpoints

| Method | Endpoint                 | Auth  | Description          |
| ------ | ------------------------ | ----- | -------------------- |
| POST   | `/disputes`              | JWT   | Create dispute       |
| GET    | `/disputes`              | JWT   | List user disputes   |
| GET    | `/disputes/:id`          | JWT   | Get dispute details  |
| PATCH  | `/disputes/:id`          | Admin | Update dispute       |
| PATCH  | `/disputes/:id/resolve`  | Admin | Resolve dispute      |
| POST   | `/disputes/:id/messages` | JWT   | Add dispute message  |
| GET    | `/disputes/:id/messages` | JWT   | Get dispute messages |

### Create Dispute

```bash
POST /disputes
Authorization: Bearer <token>
{
  "tradeId": "trade-123",
  "reason": "ITEM_NOT_RECEIVED",
  "description": "Item was not received as promised",
  "evidence": ["url1", "url2"]
}
```

**Response (201):**

```json
{
  "id": "dispute-123",
  "tradeId": "trade-123",
  "initiatedBy": "user-123",
  "reason": "ITEM_NOT_RECEIVED",
  "status": "OPEN",
  "evidence": ["url1", "url2"],
  "createdAt": "2025-11-23T10:30:00Z"
}
```

### Dispute Reasons

- **ITEM_NOT_RECEIVED** - Item was not received
- **ITEM_NOT_AS_DESCRIBED** - Item differs from description
- **ITEM_DAMAGED** - Item arrived damaged
- **UNAUTHORIZED_TRANSACTION** - Trade was unauthorized
- **OTHER** - Other disputes

### List Disputes

```bash
GET /disputes?status=OPEN&page=1&limit=20
Authorization: Bearer <token>
```

### Get Dispute Details

```bash
GET /disputes/dispute-123
Authorization: Bearer <token>
```

**Response:**

```json
{
  "id": "dispute-123",
  "trade": {
    "id": "trade-123",
    "status": "DISPUTED"
  },
  "initiatedBy": {
    "id": "user-123",
    "username": "john_doe"
  },
  "respondent": {
    "id": "user-456",
    "username": "jane_smith"
  },
  "reason": "ITEM_NOT_RECEIVED",
  "description": "Item was not received as promised",
  "evidence": ["url1", "url2"],
  "status": "OPEN",
  "resolution": null,
  "createdAt": "2025-12-21T10:00:00Z"
}
```

### Admin Resolution

**Resolve Dispute:**

```bash
PATCH /disputes/dispute-123/resolve
Authorization: Bearer <admin-token>
{
  "resolution": "IN_FAVOR_OF_BUYER",
  "reason": "Evidence confirms item was not received",
  "action": "REFUND_BOTH"
}
```

**Response:**

```json
{
  "id": "dispute-123",
  "status": "RESOLVED",
  "resolution": "IN_FAVOR_OF_BUYER",
  "resolvedBy": "admin-789",
  "resolvedAt": "2025-12-21T11:00:00Z"
}
```

### Resolution Options

- **IN_FAVOR_OF_BUYER** - Dispute resolved in favor of buyer
- **IN_FAVOR_OF_SELLER** - Dispute resolved in favor of seller
- **PARTIAL_REFUND** - Partial settlement
- **NO_FAULT** - Mutual agreement
- **CANCELLED** - Dispute cancelled

### Dispute Messaging

**Add Message:**

```bash
POST /disputes/dispute-123/messages
Authorization: Bearer <token>
{
  "message": "I have additional evidence",
  "attachments": ["url1"]
}
```

**Get Messages:**

```bash
GET /disputes/dispute-123/messages
Authorization: Bearer <token>
```

---

## Related Modules

- **Audit**: Compliance and action logging
- **Notifications**: Admin and moderation alerts
- **Users**: Account management
- **Trades**: Dispute impact on trades

---

**Last Updated:** December 21, 2025
