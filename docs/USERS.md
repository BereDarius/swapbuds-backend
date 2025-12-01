# Users Module

## Overview

The Users module manages user profiles, settings, statistics, and comprehensive user data with filtering and search capabilities.

**Features:**

- User profile management
- User settings and preferences
- User statistics and reputation
- Advanced filtering and search
- Profile image uploads
- Verified badges
- Account deletion (GDPR)

## Endpoints

| Method | Endpoint                | Auth   | Description                     |
| ------ | ----------------------- | ------ | ------------------------------- |
| GET    | `/users/:id`            | Public | Get user profile                |
| GET    | `/users/:id/stats`      | Public | Get user trade statistics       |
| GET    | `/users/:id/reputation` | Public | Get user reputation             |
| GET    | `/users/filter`         | Public | Filter users with pagination    |
| PATCH  | `/users/:id`            | JWT    | Update own profile (owner only) |
| GET    | `/users/settings`       | JWT    | Get user settings               |
| PATCH  | `/users/settings`       | JWT    | Update user settings            |
| DELETE | `/users/:id`            | JWT    | Delete account (owner only)     |

## User Profile

### Get User Profile

```bash
GET /users/user-123
```

**Response (200):**

```json
{
  "id": "user-123",
  "email": "user@example.com",
  "username": "john_doe",
  "firstName": "John",
  "lastName": "Doe",
  "bio": "Trading enthusiast",
  "profileImage": "https://cdn.example.com/avatar.jpg",
  "isVerified": true,
  "role": "USER",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### Update User Profile

```bash
PATCH /users/user-123
Authorization: Bearer <token>
{
  "firstName": "Jonathan",
  "lastName": "Smith",
  "bio": "Avid collector",
  "profileImage": "https://cdn.example.com/new-avatar.jpg"
}
```

## User Settings

### Get Settings

```bash
GET /users/settings
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "userId": "user-123",
  "preferredDeliveryMethod": "MAIL",
  "enableNotifications": true,
  "emailNotifications": true,
  "enableRecommendations": true,
  "privacyLevel": "PUBLIC"
}
```

### Update Settings

```bash
PATCH /users/settings
Authorization: Bearer <token>
{
  "preferredDeliveryMethod": "PHYSICAL",
  "enableRecommendations": false,
  "privacyLevel": "PRIVATE"
}
```

## User Statistics

### Get User Statistics

```bash
GET /users/user-123/stats
```

**Response (200):**

```json
{
  "userId": "user-123",
  "totalTrades": 45,
  "completedTrades": 40,
  "cancelledTrades": 3,
  "failedTrades": 2,
  "completionRate": 88.9,
  "averageRating": 4.8,
  "totalReviews": 38,
  "totalItems": 12,
  "activeItems": 8
}
```

## Filter & Search Users

### Filter Users

```bash
GET /users/filter?search=john&role=USER&isVerified=true&page=1&limit=20
```

**Query Parameters:**

- `search` - Search username, email, name
- `role` - Filter by role
- `isVerified` - Filter verified users
- `minRating` - Minimum reputation rating
- `page` - Page number
- `limit` - Results per page

## Implementation Details

**Module:** `src/users/`

**Key Files:**

- `users.controller.ts` - API endpoints
- `users.service.ts` - Business logic
- `dto/user-profile.dto.ts` - User profile DTO
- `dto/user-settings.dto.ts` - Settings DTO
- `dto/user-statistics.dto.ts` - Statistics DTO
