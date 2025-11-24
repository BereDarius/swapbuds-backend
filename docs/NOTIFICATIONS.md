# Notifications Module

## Overview

The Notifications module provides in-app notifications with WebSocket real-time updates, email notifications, and customizable preferences.

**Features:**
- Real-time WebSocket notifications
- Email notifications
- Notification preferences
- Unread count tracking
- Notification history
- WebSocket event subscriptions
- Multiple notification types

## Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/notifications` | JWT | List user notifications |
| GET | `/notifications/unread-count` | JWT | Get unread count |
| PATCH | `/notifications/:id/read` | JWT | Mark as read |
| PATCH | `/notifications/read-all` | JWT | Mark all as read |
| DELETE | `/notifications/:id` | JWT | Delete notification |
| GET | `/notifications/preferences` | JWT | Get preferences |
| PUT | `/notifications/preferences` | JWT | Update preferences |

## List Notifications

```bash
GET /notifications?page=1&limit=20&unreadOnly=false
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "data": [
    {
      "id": "notif-123",
      "type": "TRADE_PROPOSAL",
      "title": "New Trade Proposal",
      "message": "john_doe proposed a trade for your iPhone",
      "isRead": false,
      "createdAt": "2025-11-23T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

## Unread Count

```bash
GET /notifications/unread-count
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "unreadCount": 5
}
```

## Notification Preferences

### Get Preferences

```bash
GET /notifications/preferences
Authorization: Bearer <token>
```

### Update Preferences

```bash
PUT /notifications/preferences
Authorization: Bearer <token>
{
  "emailTradeProposal": false,
  "pushNewMessage": true
}
```

## Notification Types

- **TRADE_PROPOSAL** - When user receives trade proposal
- **TRADE_ACCEPTED** - When trade is accepted
- **TRADE_REJECTED** - When trade is rejected
- **NEW_MESSAGE** - When new message received
- **NEW_COMMENT** - When comment added to user's item
- **NEW_LIKE** - When item is liked
- **NEW_REVIEW** - When review received

## Implementation Details

**Module:** `src/notifications/`

**Key Files:**
- `notifications.controller.ts` - API endpoints
- `notifications.service.ts` - Business logic
- `notifications.gateway.ts` - WebSocket gateway