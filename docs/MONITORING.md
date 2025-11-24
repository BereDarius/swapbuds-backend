# Monitoring Module

## Overview

The Monitoring module provides health checks, platform monitoring, and real-time metrics for system observability.

**Features:**
- Health check endpoints
- Real-time metrics
- Database monitoring
- Redis health checks
- API performance metrics
- Error tracking
- Platform statistics

## Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | Public | Basic health check |
| GET | `/health/detailed` | Public | Detailed health status |
| GET | `/monitoring/metrics` | Admin | Get platform metrics |
| GET | `/monitoring/stats` | Admin | Get platform statistics |
| GET | `/monitoring/errors` | Admin | Get recent errors |

## Health Check

### Basic Health

```bash
GET /health
```

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2025-11-23T10:30:00Z"
}
```

### Detailed Health Status

```bash
GET /health/detailed
```

**Response (200):**
```json
{
  "status": "UP",
  "components": {
    "database": {
      "status": "UP",
      "details": {
        "database": "PostgreSQL",
        "validationQuery": "isValid()"
      }
    },
    "redis": {
      "status": "UP",
      "details": {
        "host": "localhost:6379",
        "memoryUsage": "128MB"
      }
    },
    "diskSpace": {
      "status": "UP",
      "details": {
        "total": "1TB",
        "free": "500GB",
        "threshold": "100GB"
      }
    }
  }
}
```

## Platform Metrics

### Get Metrics

```bash
GET /monitoring/metrics?period=24h
Authorization: Bearer <admin-token>
```

**Response (200):**
```json
{
  "period": "24h",
  "metrics": {
    "requestCount": 125000,
    "avgResponseTime": 145,
    "errorRate": 0.8,
    "uptime": 99.98,
    "activeUsers": 856,
    "activeConnections": 234
  }
}
```

## Platform Statistics

### Get Statistics

```bash
GET /monitoring/stats
Authorization: Bearer <admin-token>
```

**Response (200):**
```json
{
  "timestamp": "2025-11-23T10:30:00Z",
  "users": {
    "total": 1250,
    "active": 856,
    "suspended": 12,
    "banned": 8
  },
  "trades": {
    "total": 4532,
    "completed": 3890,
    "cancelled": 450,
    "disputedRate": 2.3
  },
  "items": {
    "total": 8750,
    "active": 6234,
    "removed": 156,
    "reported": 34
  },
  "performance": {
    "avgResponseTime": 145,
    "p95ResponseTime": 450,
    "p99ResponseTime": 850,
    "requestsPerSecond": 145.2,
    "errorRate": 0.8
  }
}
```

## Recent Errors

### Get Recent Errors

```bash
GET /monitoring/errors?limit=50&severity=ERROR
Authorization: Bearer <admin-token>
```

**Response (200):**
```json
{
  "data": [
    {
      "id": "error-123",
      "timestamp": "2025-11-23T10:30:00Z",
      "severity": "ERROR",
      "endpoint": "POST /trades",
      "message": "Database connection timeout",
      "stackTrace": "...",
      "affectedUsers": 12
    }
  ]
}
```

## Implementation Details

**Module:** `src/monitoring/`

**Key Files:**
- `monitoring.controller.ts` - API endpoints
- `monitoring.service.ts` - Metrics collection
- `health.controller.ts` - Health checks
- `monitoring.interceptor.ts` - Performance tracking