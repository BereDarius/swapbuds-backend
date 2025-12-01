# Reviews Module

## Overview

The Reviews module manages user reviews and ratings for trades and users with comprehensive reputation tracking.

**Features:**

- Trade reviews and ratings
- User reputation scoring
- Review filtering and sorting
- Verified purchase badges
- Review moderation
- Rating statistics
- Review history

## Endpoints

| Method | Endpoint                  | Auth   | Description                |
| ------ | ------------------------- | ------ | -------------------------- |
| POST   | `/reviews`                | JWT    | Create review              |
| GET    | `/reviews`                | Public | List reviews               |
| GET    | `/reviews/user/:userId`   | Public | Get reviews for user       |
| GET    | `/reviews/trade/:tradeId` | Public | Get reviews for trade      |
| GET    | `/reviews/:id`            | Public | Get review details         |
| PATCH  | `/reviews/:id`            | JWT    | Update review (owner only) |
| DELETE | `/reviews/:id`            | JWT    | Delete review (owner only) |

## Create Review

```bash
POST /reviews
Authorization: Bearer <token>
{
  "tradeId": "trade-123",
  "rating": 5,
  "title": "Perfect trade!",
  "comment": "Great communication and fast delivery",
  "categories": {
    "itemCondition": 5,
    "communication": 5,
    "delivery": 4
  }
}
```

**Response (201):**

```json
{
  "id": "review-123",
  "tradeId": "trade-123",
  "authorId": "user-123",
  "targetUserId": "user-456",
  "rating": 5,
  "title": "Perfect trade!",
  "comment": "Great communication and fast delivery",
  "categories": {
    "itemCondition": 5,
    "communication": 5,
    "delivery": 4
  },
  "isVerified": true,
  "createdAt": "2025-11-23T10:30:00Z"
}
```

## List Reviews

```bash
GET /reviews?page=1&limit=20&userId=user-456&sortBy=createdAt
```

**Query Parameters:**

- `page` - Page number
- `limit` - Results per page
- `userId` - Filter by reviewed user
- `minRating` - Minimum rating
- `maxRating` - Maximum rating
- `sortBy` - Sort field (createdAt, rating)

**Response (200):**

```json
{
  "data": [
    {
      "id": "review-123",
      "authorId": "user-123",
      "rating": 5,
      "title": "Perfect trade!",
      "comment": "Great communication",
      "isVerified": true,
      "createdAt": "2025-11-23T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 38,
    "pages": 2
  }
}
```

## Implementation Details

**Module:** `src/reviews/`

**Key Files:**

- `reviews.controller.ts` - API endpoints
- `reviews.service.ts` - Business logic
- `dto/create-review.dto.ts` - Creation DTO
- `dto/review-response.dto.ts` - Response DTO
