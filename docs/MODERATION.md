# Moderation Module

## Overview

The Moderation module provides content moderation tools for flagging, approving, and removing items and trades.

**Features:**
- Item and trade flagging
- Content moderation workflow
- Bulk moderation actions
- Moderator tools and dashboard
- Moderation history
- Appeal process
- Automated moderation rules

## Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/moderation/flag/item` | JWT | Flag item for review |
| POST | `/moderation/flag/trade` | JWT | Flag trade for review |
| GET | `/moderation/items` | Moderator | Get flagged items |
| GET | `/moderation/trades` | Moderator | Get flagged trades |
| PATCH | `/moderation/items/:id/approve` | Moderator | Approve item |
| PATCH | `/moderation/items/:id/reject` | Moderator | Remove item |
| PATCH | `/moderation/bulk-action` | Moderator | Bulk moderation action |

## Flag Item

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

## Flag Reasons

- INAPPROPRIATE_CONTENT
- MISLEADING_DESCRIPTION
- STOLEN_ITEM
- COUNTERFEIT
- ILLEGAL_ITEM
- HARASSMENT
- OTHER

## Moderator Dashboard

### Get Flagged Items

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
        "title": "Item Title",
        "owner": {
          "id": "user-123",
          "username": "john_doe"
        }
      },
      "reason": "INAPPROPRIATE_CONTENT",
      "reportedBy": "user-456",
      "status": "PENDING",
      "flaggedAt": "2025-11-23T10:30:00Z"
    }
  ]
}
```

### Approve Item

```bash
PATCH /moderation/items/flag-123/approve
Authorization: Bearer <moderator-token>
{
  "notes": "Content is appropriate"
}
```

### Remove Item

```bash
PATCH /moderation/items/flag-123/reject
Authorization: Bearer <moderator-token>
{
  "reason": "Violates community guidelines",
  "notifyUser": true
}
```

## Bulk Actions

### Bulk Moderation Action

```bash
PATCH /moderation/bulk-action
Authorization: Bearer <moderator-token>
{
  "flagIds": ["flag-123", "flag-124", "flag-125"],
  "action": "REJECT",
  "reason": "Violates guidelines"
}
```

## Implementation Details

**Module:** `src/moderation/`

**Key Files:**
- `moderation.controller.ts` - API endpoints
- `moderation.service.ts` - Business logic