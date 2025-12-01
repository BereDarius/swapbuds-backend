# Caching Module

## Overview

The Caching module provides Redis-based caching system with decorators, cache warming, and performance monitoring.

**Features:**

- Redis caching layer
- Cacheable decorator for automatic caching
- Cache warming and preloading
- Cache invalidation
- Cache monitoring
- Performance optimization
- TTL management

## Cache Keys

### User Cache Keys

- `user:{userId}` - User profile
- `user:{userId}:stats` - User statistics
- `user:{userId}:reputation` - User reputation

### Item Cache Keys

- `item:{itemId}` - Item details
- `items:popular` - Popular items
- `items:category:{category}` - Items by category
- `items:user:{userId}` - User's items
- `items:recommendations:{userId}` - User recommendations

### Trade Cache Keys

- `trade:{tradeId}` - Trade details
- `user:{userId}:trades` - User trades

### Review Cache Keys

- `review:{reviewId}` - Review details
- `user:{userId}:reviews` - User reviews

## Usage with Decorators

### Cacheable Decorator

```typescript
import { Cacheable, InvalidateCache } from '@/cache/decorators/cacheable.decorator';

@Get('/items/:id')
@Cacheable('item:{id}', 3600) // Cache for 1 hour
async getItem(@Param('id') id: string) {
  return this.itemsService.getItem(id);
}
```

### Invalidate Cache Decorator

```typescript
@Patch('/items/:id')
@InvalidateCache('item:{id}', 'items:user:{userId}')
async updateItem(@Param('id') id: string, @Body() dto: UpdateItemDto) {
  return this.itemsService.updateItem(id, dto);
}
```

## Cache Endpoints

| Method | Endpoint       | Auth  | Description          |
| ------ | -------------- | ----- | -------------------- |
| GET    | `/cache/stats` | Admin | Get cache statistics |
| GET    | `/cache/keys`  | Admin | List cached keys     |
| DELETE | `/cache/:key`  | Admin | Clear specific cache |
| DELETE | `/cache`       | Admin | Clear all cache      |
| POST   | `/cache/warm`  | Admin | Warm cache           |

## Cache Statistics

```bash
GET /cache/stats
Authorization: Bearer <admin-token>
```

**Response (200):**

```json
{
  "totalKeys": 1234,
  "memoryUsage": "256MB",
  "hitRate": 0.82,
  "missRate": 0.18,
  "avgResponseTime": 45,
  "topKeys": [
    {
      "key": "item:item-123",
      "hits": 1050,
      "size": "45KB"
    }
  ]
}
```

## Cache Warming

### Warm Cache

```bash
POST /cache/warm
Authorization: Bearer <admin-token>
{
  "categories": ["POPULAR_ITEMS", "USER_RECOMMENDATIONS"]
}
```

**Response (202):**

```json
{
  "status": "WARMING",
  "estimatedTime": "5-10 minutes",
  "categories": ["POPULAR_ITEMS", "USER_RECOMMENDATIONS"]
}
```

## Implementation Details

**Module:** `src/cache/`

**Key Files:**

- `cache.service.ts` - Core caching logic
- `cache.controller.ts` - Cache management endpoints
- `decorators/cacheable.decorator.ts` - Caching decorators
- `cache-warming.service.ts` - Cache preloading
- `cache-monitoring.service.ts` - Cache metrics
