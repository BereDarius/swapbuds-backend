# Trades Module

## Overview

The Trades module manages the trading system with multi-item support, counter-offers, expiration, and detailed statistics.

**Features:**

- Multi-item trade proposals
- Trade counter-offers
- Automatic trade expiration
- Trade filtering and statistics
- Trade status workflow
- Delivery method validation
- Real-time notifications

## Endpoints

| Method | Endpoint                          | Auth | Description           |
| ------ | --------------------------------- | ---- | --------------------- |
| POST   | `/trades`                         | JWT  | Create trade proposal |
| GET    | `/trades`                         | JWT  | List user's trades    |
| GET    | `/trades/:id`                     | JWT  | Get trade details     |
| GET    | `/trades/filter`                  | JWT  | Filter trades         |
| PATCH  | `/trades/:id/accept`              | JWT  | Accept trade          |
| PATCH  | `/trades/:id/reject`              | JWT  | Reject trade          |
| PATCH  | `/trades/:id/cancel`              | JWT  | Cancel trade          |
| PATCH  | `/trades/:id/complete`            | JWT  | Mark as completed     |
| POST   | `/trades/:tradeId/counter-offers` | JWT  | Create counter-offer  |
| GET    | `/trades/:tradeId/counter-offers` | JWT  | List counter-offers   |
| PATCH  | `/counter-offers/:id/accept`      | JWT  | Accept counter-offer  |
| PATCH  | `/counter-offers/:id/reject`      | JWT  | Reject counter-offer  |

## Create Trade

```bash
POST /trades
Authorization: Bearer <token>
{
  "itemOfferedIds": ["item-123"],
  "itemRequestedIds": ["item-456"],
  "deliveryMethod": "MAIL",
  "message": "Would love to trade!"
}
```

**Response (201):**

```json
{
  "id": "trade-123",
  "offeredBy": {
    "id": "user-123",
    "username": "john_doe"
  },
  "requestedBy": {
    "id": "user-456",
    "username": "jane_smith"
  },
  "itemsOffered": [
    {
      "id": "item-123",
      "title": "iPhone 13",
      "estimatedValue": 500
    }
  ],
  "itemsRequested": [
    {
      "id": "item-456",
      "title": "Samsung S22",
      "estimatedValue": 450
    }
  ],
  "status": "PENDING",
  "deliveryMethod": "MAIL",
  "expiresAt": "2025-12-03T10:30:00Z",
  "createdAt": "2025-11-23T10:30:00Z"
}
```

## Trade Status Workflow

- **PENDING** - Awaiting response
- **ACCEPTED** - Trade accepted by both parties
- **REJECTED** - Trade rejected
- **CANCELLED** - Trade cancelled
- **COMPLETED** - Trade completed
- **EXPIRED** - Trade expired (14 days)

## Counter-Offers

### Create Counter-Offer

```bash
POST /trades/trade-123/counter-offers
Authorization: Bearer <token>
{
  "itemOfferedIds": ["item-789"],
  "itemRequestedIds": ["item-456"],
  "message": "How about these instead?"
}
```

### Accept Counter-Offer

```bash
PATCH /counter-offers/counter-123/accept
Authorization: Bearer <token>
```

### Reject Counter-Offer

```bash
PATCH /counter-offers/counter-123/reject
Authorization: Bearer <token>
```

## Trade Actions

### Accept Trade

```bash
PATCH /trades/trade-123/accept
Authorization: Bearer <token>
```

### Reject Trade

```bash
PATCH /trades/trade-123/reject
Authorization: Bearer <token>
```

### Complete Trade

```bash
PATCH /trades/trade-123/complete
Authorization: Bearer <token>
```

## Implementation Details

**Module:** `src/trades/`

**Key Files:**

- `trades.controller.ts` - API endpoints
- `trades.service.ts` - Business logic
- `trade-expiration.service.ts` - Expiration handling
- `dto/create-trade.dto.ts` - Trade creation DTO
- `dto/create-counter-offer.dto.ts` - Counter-offer DTO
