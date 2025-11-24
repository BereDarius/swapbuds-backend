# Messages Module

## Overview

The Messages module provides real-time messaging between users with WebSocket support, conversation management, and message history.

**Features:**
- Real-time messaging
- WebSocket integration
- Conversation management
- Unread message tracking
- Message read receipts
- Typing indicators
- Message history

## Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/messages` | JWT | Send message |
| GET | `/messages/conversations` | JWT | List conversations |
| GET | `/messages/conversations/:id` | JWT | Get conversation messages |
| GET | `/messages/unread/count` | JWT | Get unread count |
| PATCH | `/messages/:id/read` | JWT | Mark message as read |
| PATCH | `/messages/conversations/:id/read` | JWT | Mark all as read |
| DELETE | `/messages/:id` | JWT | Delete message |

## Send Message

```bash
POST /messages
Authorization: Bearer <token>
{
  "recipientId": "user-456",
  "content": "Hello! How are you?"
}
```

**Response (201):**
```json
{
  "id": "msg-123",
  "conversationId": "conv-123",
  "senderId": "user-123",
  "recipientId": "user-456",
  "content": "Hello! How are you?",
  "isRead": false,
  "createdAt": "2025-11-23T10:30:00Z"
}
```

## Conversations

### List Conversations

```bash
GET /messages/conversations?page=1&limit=20
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "data": [
    {
      "id": "conv-123",
      "participant": {
        "id": "user-456",
        "username": "jane_smith"
      },
      "lastMessage": "See you soon!",
      "lastMessageTime": "2025-11-23T10:30:00Z",
      "unreadCount": 3
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 12,
    "pages": 1
  }
}
```

### Get Conversation Messages

```bash
GET /messages/conversations/conv-123?page=1&limit=50
Authorization: Bearer <token>
```

## Implementation Details

**Module:** `src/messages/`

**Key Files:**
- `messages.controller.ts` - API endpoints
- `messages.service.ts` - Business logic
- `messages.gateway.ts` - WebSocket gateway