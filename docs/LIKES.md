# Likes Module

## Overview

The Likes module manages item likes and favorites functionality for users.

**Features:**

- Item like/unlike
- Like tracking
- User favorites list
- Popular items ranking
- Like statistics

## Endpoints

| Method | Endpoint              | Auth   | Description            |
| ------ | --------------------- | ------ | ---------------------- |
| POST   | `/likes/:itemId`      | JWT    | Like item              |
| DELETE | `/likes/:itemId`      | JWT    | Unlike item            |
| GET    | `/likes/user/:userId` | JWT    | Get user's liked items |
| GET    | `/likes/:itemId`      | Public | Get like count         |
| GET    | `/items/popular`      | Public | Get popular items      |

## Like Item

```bash
POST /likes/item-123
Authorization: Bearer <token>
```

**Response (201):**

```json
{
  "id": "like-123",
  "userId": "user-123",
  "itemId": "item-123",
  "createdAt": "2025-11-23T10:30:00Z"
}
```

## Unlike Item

```bash
DELETE /likes/item-123
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "message": "Item unliked successfully"
}
```

## Get User's Liked Items

```bash
GET /likes/user/user-123?page=1&limit=20
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "data": [
    {
      "id": "item-123",
      "title": "iPhone 13",
      "category": "ELECTRONICS",
      "estimatedValue": 500,
      "owner": {
        "id": "user-456",
        "username": "jane_smith"
      },
      "likedAt": "2025-11-23T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "pages": 1
  }
}
```

## Implementation Details

**Module:** `src/likes/`

**Key Files:**

- `likes.controller.ts` - API endpoints
- `likes.service.ts` - Business logic
