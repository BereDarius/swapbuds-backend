# Comments Module

## Overview

The Comments module manages comments on items with threading, moderation, and user interactions.

**Features:**

- Comment creation and deletion
- Comment threading
- Comment moderation
- User mentions
- Comment statistics
- Pagination support

## Endpoints

| Method | Endpoint                 | Auth   | Description                   |
| ------ | ------------------------ | ------ | ----------------------------- |
| POST   | `/comments`              | JWT    | Create comment                |
| GET    | `/comments/item/:itemId` | Public | Get item comments             |
| GET    | `/comments/:id`          | Public | Get comment details           |
| PATCH  | `/comments/:id`          | JWT    | Update comment (owner only)   |
| DELETE | `/comments/:id`          | JWT    | Delete comment (owner or mod) |

## Create Comment

```bash
POST /comments
Authorization: Bearer <token>
{
  "itemId": "item-123",
  "content": "Is this still available?",
  "parentCommentId": null
}
```

**Response (201):**

```json
{
  "id": "comment-123",
  "itemId": "item-123",
  "authorId": "user-123",
  "content": "Is this still available?",
  "parentCommentId": null,
  "author": {
    "id": "user-123",
    "username": "john_doe",
    "profileImage": "https://cdn.example.com/avatar.jpg"
  },
  "createdAt": "2025-11-23T10:30:00Z",
  "updatedAt": "2025-11-23T10:30:00Z"
}
```

## Get Item Comments

```bash
GET /comments/item/item-123?page=1&limit=20
```

**Response (200):**

```json
{
  "data": [
    {
      "id": "comment-123",
      "itemId": "item-123",
      "author": {
        "id": "user-123",
        "username": "john_doe"
      },
      "content": "Is this still available?",
      "replies": [
        {
          "id": "comment-124",
          "author": {
            "id": "user-456",
            "username": "jane_smith"
          },
          "content": "Yes, still available!"
        }
      ],
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

## Implementation Details

**Module:** `src/comments/`

**Key Files:**

- `comments.controller.ts` - API endpoints
- `comments.service.ts` - Business logic
- `dto/create-comment.dto.ts` - Creation DTO
