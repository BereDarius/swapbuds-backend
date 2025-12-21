# Items Module

## Overview

The Items module manages product listings with comprehensive filtering, categorization, conditions, and smart recommendations.

**Features:**

- Item CRUD operations
- Advanced filtering and search
- Category and condition systems
- Delivery method filtering
- Smart recommendations
- Similar item matching
- Pagination and sorting
- Item images with Cloudinary integration

## Endpoints

| Method | Endpoint                 | Auth   | Description                      |
| ------ | ------------------------ | ------ | -------------------------------- |
| POST   | `/items`                 | JWT    | Create new item                  |
| GET    | `/items`                 | Public | List items with filtering        |
| GET    | `/items/:id`             | Public | Get item details                 |
| GET    | `/items/:id/similar`     | Public | Get similar items                |
| GET    | `/items/user/:userId`    | Public | Get user's items                 |
| GET    | `/items/recommendations` | JWT    | Get personalized recommendations |
| PATCH  | `/items/:id`             | JWT    | Update item (owner only)         |
| DELETE | `/items/:id`             | JWT    | Delete item (owner only)         |

## Create Item

```bash
POST /items
Authorization: Bearer <token>
{
  "title": "Vintage Pokemon Cards",
  "description": "Complete base set collection",
  "category": "COLLECTIBLES",
  "condition": "EXCELLENT",
  "estimatedValue": 250,
  "deliveryMethods": ["MAIL", "PHYSICAL"],
  "deliveryScope": "INTERNATIONAL",
  "images": ["https://cdn.example.com/image1.jpg"]
}
```

**Response (201):**

```json
{
  "id": "item-123",
  "title": "Vintage Pokemon Cards",
  "category": "COLLECTIBLES",
  "condition": "EXCELLENT",
  "estimatedValue": 250,
  "deliveryMethods": ["MAIL", "PHYSICAL"],
  "ownerId": "user-123",
  "status": "AVAILABLE",
  "createdAt": "2025-11-23T10:30:00Z",
  "likes": 0
}
```

## List Items

```bash
GET /items?page=1&limit=20&category=ELECTRONICS&condition=GOOD&search=phone
```

**Query Parameters:**

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `search` - Search title/description
- `category` - Filter by category
- `condition` - Filter by condition
- `deliveryMethod` - Filter by delivery method
- `minValue` - Minimum estimated value
- `maxValue` - Maximum estimated value
- `sortBy` - Sort field (createdAt, likes, value)
- `sortOrder` - Sort order (asc, desc)

**Response (200):**

```json
{
  "data": [
    {
      "id": "item-123",
      "title": "iPhone 13",
      "category": "ELECTRONICS",
      "condition": "GOOD",
      "estimatedValue": 400,
      "owner": {
        "id": "user-123",
        "username": "john_doe",
        "rating": 4.8
      },
      "likes": 15,
      "createdAt": "2025-11-20T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

## Categories

Available categories:

- ELECTRONICS
- CLOTHING
- BOOKS
- SPORTS
- TOYS
- COLLECTIBLES
- HOME
- BEAUTY
- JEWELRY
- OTHER

## Conditions

- LIKE_NEW
- EXCELLENT
- GOOD
- FAIR
- POOR

## Implementation Details

**Module:** `src/items/`

**Key Files:**

- `items.controller.ts` - API endpoints
- `items.service.ts` - Business logic
- `recommendations.service.ts` - Recommendation engine
- `dto/create-item.dto.ts` - Creation DTO
- `dto/item-filter.dto.ts` - Filter DTO
