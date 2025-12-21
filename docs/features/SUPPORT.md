# Support Module

## Overview

The Support module manages live support chat system with priority queue and agent assignment.

**Features:**

- Live chat support
- Ticket/conversation tracking
- Priority queue system
- Agent assignment
- Chat history
- Real-time messaging
- Support ticket status tracking

## Endpoints

| Method | Endpoint                        | Auth    | Description                      |
| ------ | ------------------------------- | ------- | -------------------------------- |
| POST   | `/support/tickets`              | JWT     | Create support ticket            |
| GET    | `/support/tickets`              | JWT     | List user's tickets              |
| GET    | `/support/tickets/:id`          | JWT     | Get ticket details               |
| POST   | `/support/tickets/:id/messages` | JWT     | Add message to ticket            |
| GET    | `/support/tickets/:id/messages` | JWT     | Get ticket messages              |
| GET    | `/support/queue`                | Support | Get support queue (support only) |
| PATCH  | `/support/tickets/:id/assign`   | Support | Assign ticket to agent           |
| PATCH  | `/support/tickets/:id/resolve`  | Support | Resolve ticket                   |

## Create Support Ticket

```bash
POST /support/tickets
Authorization: Bearer <token>
{
  "subject": "Issue with trade",
  "category": "TRADE",
  "description": "Trade was cancelled unexpectedly",
  "priority": "HIGH",
  "attachments": ["url1"]
}
```

**Response (201):**

```json
{
  "id": "ticket-123",
  "userId": "user-123",
  "subject": "Issue with trade",
  "category": "TRADE",
  "priority": "HIGH",
  "status": "OPEN",
  "assignedTo": null,
  "createdAt": "2025-11-23T10:30:00Z",
  "updatedAt": "2025-11-23T10:30:00Z"
}
```

## List Support Tickets

```bash
GET /support/tickets?status=OPEN&page=1&limit=20
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "data": [
    {
      "id": "ticket-123",
      "subject": "Issue with trade",
      "priority": "HIGH",
      "status": "OPEN",
      "assignedTo": {
        "id": "support-123",
        "username": "support_agent"
      },
      "createdAt": "2025-11-23T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 8,
    "pages": 1
  }
}
```

## Support Categories

- ACCOUNT
- TRADE
- PAYMENT
- ITEM
- VERIFICATION
- OTHER

## Priority Levels

- LOW
- MEDIUM
- HIGH
- URGENT

## Ticket Status

- OPEN
- ASSIGNED
- IN_PROGRESS
- RESOLVED
- CLOSED

## Implementation Details

**Module:** `src/support/`

**Key Files:**

- `support-chat.controller.ts` - API endpoints
- `support-chat.service.ts` - Business logic
- `support-chat.gateway.ts` - WebSocket gateway
- `support-queue.service.ts` - Queue management
