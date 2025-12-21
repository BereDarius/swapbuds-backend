# Social Features

Documentation for comments and likes functionality in SwapBuds.

---

## Table of Contents

1. [Comments](#comments)
2. [Likes](#likes)

---

## Comments

### Overview

The Comments module manages comments on items with threading, moderation, and user interactions.

**Features:**

- Comment creation and deletion
- Comment threading (replies)
- Comment moderation
- User mentions
- Comment statistics
- Pagination support

### Endpoints

| Method | Endpoint                 | Auth   | Description                   |
| ------ | ------------------------ | ------ | ----------------------------- |
| POST   | `/comments`              | JWT    | Create comment                |
| GET    | `/comments/item/:itemId` | Public | Get item comments             |
| GET    | `/comments/:id`          | Public | Get comment details           |
| PATCH  | `/comments/:id`          | JWT    | Update comment (owner only)   |
| DELETE | `/comments/:id`          | JWT    | Delete comment (owner or mod) |

### Create Comment

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

### Thread Reply

To reply to a comment, include `parentCommentId`:

```bash
POST /comments
Authorization: Bearer <token>
{
  "itemId": "item-123",
  "content": "Yes, still available!",
  "parentCommentId": "comment-123"
}
```

### Get Item Comments

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

### Update Comment

```bash
PATCH /comments/comment-123
Authorization: Bearer <token>
{
  "content": "Updated comment text"
}
```

### Delete Comment

```bash
DELETE /comments/comment-123
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "message": "Comment deleted successfully"
}
```

### Implementation Details

**Module:** `src/comments/`

**Key Files:**

- `comments.controller.ts` - API endpoints
- `comments.service.ts` - Business logic
- `dto/create-comment.dto.ts` - Creation DTO
- `dto/update-comment.dto.ts` - Update DTO

---

## Likes

### Overview

The Likes module manages item likes and favorites functionality for users.

**Features:**

- Item like/unlike
- Like tracking
- User favorites list
- Popular items ranking
- Like statistics

### Endpoints

| Method | Endpoint              | Auth   | Description            |
| ------ | --------------------- | ------ | ---------------------- |
| POST   | `/likes/:itemId`      | JWT    | Like item              |
| DELETE | `/likes/:itemId`      | JWT    | Unlike item            |
| GET    | `/likes/user/:userId` | JWT    | Get user's liked items |
| GET    | `/likes/:itemId`      | Public | Get like count         |
| GET    | `/items/popular`      | Public | Get popular items      |

### Like Item

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

### Unlike Item

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

### Get User's Liked Items

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
      "images": ["https://cdn.example.com/item1.jpg"],
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

### Get Like Count

```bash
GET /likes/item-123
```

**Response (200):**

```json
{
  "itemId": "item-123",
  "likeCount": 42,
  "isLikedByCurrentUser": true
}
```

### Get Popular Items

```bash
GET /items/popular?page=1&limit=10
```

**Response (200):**

```json
{
  "data": [
    {
      "id": "item-123",
      "title": "iPhone 13",
      "category": "ELECTRONICS",
      "likeCount": 156,
      "tradeCount": 23
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "pages": 5
  }
}
```

### Implementation Details

**Module:** `src/likes/`

**Key Files:**

- `likes.controller.ts` - API endpoints
- `likes.service.ts` - Business logic
- `dto/` - Data transfer objects

---

## Related Modules

- **Items**: Like counts and popular rankings
- **Moderation**: Comment flagging and removal
- **Notifications**: Like and comment notifications

---

**Last Updated:** December 21, 2025
