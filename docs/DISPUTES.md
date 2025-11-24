# Disputes Module

## Overview

The Disputes module handles trade dispute resolution with detailed messaging, admin review, and conflict resolution.

**Features:**
- Dispute creation and management
- Dispute messaging
- Admin resolution
- Evidence attachments
- Dispute history
- Automatic settlement recommendations

## Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/disputes` | JWT | Create dispute |
| GET | `/disputes` | JWT | List user disputes |
| GET | `/disputes/:id` | JWT | Get dispute details |
| PATCH | `/disputes/:id` | Admin | Update dispute |
| PATCH | `/disputes/:id/resolve` | Admin | Resolve dispute |
| POST | `/disputes/:id/messages` | JWT | Add dispute message |
| GET | `/disputes/:id/messages` | JWT | Get dispute messages |

## Create Dispute

```bash
POST /disputes
Authorization: Bearer <token>
{
  "tradeId": "trade-123",
  "reason": "ITEM_NOT_RECEIVED",
  "description": "Item was not received as promised",
  "evidence": ["url1", "url2"]
}
```

**Response (201):**
```json
{
  "id": "dispute-123",
  "tradeId": "trade-123",
  "initiatedBy": "user-123",
  "reason": "ITEM_NOT_RECEIVED",
  "status": "OPEN",
  "evidence": ["url1", "url2"],
  "createdAt": "2025-11-23T10:30:00Z"
}
```

## Dispute Reasons

- ITEM_NOT_RECEIVED
- ITEM_NOT_AS_DESCRIBED
- ITEM_DAMAGED
- UNAUTHORIZED_TRANSACTION
- OTHER

## List Disputes

```bash
GET /disputes?status=OPEN&page=1&limit=20
Authorization: Bearer <token>
```

## Get Dispute Details

```bash
GET /disputes/dispute-123
Authorization: Bearer <token>
```

## Admin Resolution

### Resolve Dispute

```bash
PATCH /disputes/dispute-123/resolve
Authorization: Bearer <admin-token>
{
  "resolution": "REFUND_FULL",
  "notes": "Evidence shows item not delivered"
}
```

**Resolution Types:**
- REFUND_FULL - Full refund to buyer
- REFUND_PARTIAL - Partial refund
- NO_ACTION - No resolution needed
- ITEM_RETURNED - Item to be returned

## Implementation Details

**Module:** `src/disputes/`

**Key Files:**
- `disputes.controller.ts` - API endpoints
- `disputes.service.ts` - Business logic