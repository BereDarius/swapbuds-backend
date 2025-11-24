# Messages Module

## Overview

The Messages module provides real-time messaging between users with WebSocket support, conversation management, and message history.

**Features:**

- Real-time messaging
- WebSocket integration
- Conversation management
- Unread message tracking
- Message read receipts
- Typing indicators
- Message history

## Endpoints

| Method | Endpoint                           | Auth | Description               |
| ------ | ---------------------------------- | ---- | ------------------------- |
| POST   | `/messages`                        | JWT  | Send message              |
| GET    | `/messages/conversations`          | JWT  | List conversations        |
| GET    | `/messages/conversations/:id`      | JWT  | Get conversation messages |
| GET    | `/messages/unread/count`           | JWT  | Get unread count          |
| PATCH  | `/messages/:id/read`               | JWT  | Mark message as read      |
| PATCH  | `/messages/conversations/:id/read` | JWT  | Mark all as read          |
| DELETE | `/messages/:id`                    | JWT  | Delete message            |

## Send Message

```bash
POST /messages
Authorization: Bearer <token>
{
  "recipientId": "user-456",
  "content": "Hello! How are you?"
}
```

**Response (201):**

```json
{
  "id": "msg-123",
  "conversationId": "conv-123",
  "senderId": "user-123",
  "recipientId": "user-456",
  "content": "Hello! How are you?",
  "isRead": false,
  "createdAt": "2025-11-23T10:30:00Z"
}
```

## Conversations

### List Conversations

```bash
GET /messages/conversations?page=1&limit=20
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "data": [
    {
      "id": "conv-123",
      "participant": {
        "id": "user-456",
        "username": "jane_smith"
      },
      "lastMessage": "See you soon!",
      "lastMessageTime": "2025-11-23T10:30:00Z",
      "unreadCount": 3
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 12,
    "pages": 1
  }
}
```

### Get Conversation Messages

```bash
GET /messages/conversations/conv-123?page=1&limit=50
Authorization: Bearer <token>
```

## WebSocket Real-time Features

### Connection Setup

The Messages Gateway provides real-time messaging via WebSocket:

```javascript
// Frontend connection
import io from 'socket.io-client';

const socket = io('http://localhost:4000', {
  path: '/socket.io',
  auth: { token: accessToken },
  transports: ['websocket', 'polling'],
});

// Subscribe to receive messages
socket.emit('subscribe', userId);
```

### Client → Server Events

| Event               | Payload                                  | Description                       |
| ------------------- | ---------------------------------------- | --------------------------------- |
| `subscribe`         | `userId: string`                         | Subscribe to user's message room  |
| `unsubscribe`       | `userId: string`                         | Unsubscribe from user's room      |
| `typing`            | `{ conversationId, isTyping, username }` | Send typing indicator             |
| `joinConversation`  | `conversationId: string`                 | Join conversation room for typing |
| `leaveConversation` | `conversationId: string`                 | Leave conversation room           |

### Server → Client Events

| Event              | Payload                                       | Description                      |
| ------------------ | --------------------------------------------- | -------------------------------- |
| `message`          | `Message`                                     | New message received             |
| `messageRead`      | `{ messageId, conversationId }`               | Message marked as read           |
| `conversationRead` | `{ conversationId, count }`                   | Multiple messages marked as read |
| `messageDeleted`   | `{ messageId, conversationId }`               | Message deleted                  |
| `typing`           | `{ conversationId, isTyping, typerUsername }` | User is typing                   |

### Example: Real-time Message Delivery

```javascript
// Send message via REST API
await fetch('/api/messages', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    recipientId: 'user-456',
    content: 'Hello!',
  }),
});

// Recipient receives via WebSocket
socket.on('message', (message) => {
  console.log('New message:', message);
  // Update UI instantly
});
```

### Example: Typing Indicators

```javascript
// User starts typing
const handleTyping = (conversationId, isTyping) => {
  socket.emit('typing', {
    conversationId,
    isTyping,
    username: currentUser.username,
  });
};

// Receive typing indicator
socket.on('typing', ({ conversationId, isTyping, typerUsername }) => {
  if (isTyping) {
    showTypingIndicator(`${typerUsername} is typing...`);
  } else {
    hideTypingIndicator();
  }
});
```

### Example: Read Receipts

```javascript
// Mark message as read
await fetch(`/api/messages/${messageId}/read`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${token}` },
});

// Sender receives read receipt via WebSocket
socket.on('messageRead', ({ messageId, conversationId }) => {
  // Update UI to show message was read (checkmark, etc.)
  updateMessageStatus(messageId, 'read');
});
```

## Message Flow Diagrams

### Sending a Message

```
User A sends message
    ↓
REST API: POST /messages
    ↓
MessagesService.sendMessage()
    ↓
├─→ Save to database (Prisma)
├─→ MessagesGateway.emitMessageToUser(userB)
│       ↓
│   WebSocket: 'message' → User B's clients
│
└─→ NotificationsService.createNotification()
        ↓
    Create in-app notification
```

### Typing Indicator Flow

```
User A types → WebSocket: emit('typing')
    ↓
MessagesGateway.handleTyping()
    ↓
Broadcast to conversation room
    ↓
User B receives: 'typing' event
    ↓
Show "User A is typing..."
    ↓
Auto-hide after 3 seconds (frontend)
```

### Read Receipt Flow

```
User B reads message → REST: PATCH /messages/:id/read
    ↓
MessagesService.markAsRead()
    ↓
├─→ Update DB (isRead: true, readAt: now)
└─→ MessagesGateway.emitMessageRead(userA, messageId)
        ↓
    User A receives: 'messageRead' event
        ↓
    Show checkmark/seen indicator
```

## Implementation Details

**Module:** `src/messages/`

**Key Files:**

- `messages.controller.ts` - REST API endpoints
- `messages.service.ts` - Business logic, integrates with gateway
- `gateway/messages.gateway.ts` - WebSocket gateway for real-time features
- `gateway/messages.gateway.spec.ts` - Gateway unit tests
- `dto/` - Data transfer objects

### Architecture

The `MessagesGateway` is injected into `MessagesService`:

```typescript
@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private messagesGateway: MessagesGateway,
    private notificationsService: NotificationsService,
  ) {}

  async sendMessage(senderId: string, dto: SendMessageDto) {
    // ... save to database ...

    // Emit via WebSocket for real-time delivery
    this.messagesGateway.emitMessageToUser(recipientId, message);

    // Also create notification (for offline/push)
    await this.notificationsService.createNotification(...);
  }
}
```

## Security

- **WebSocket Authentication:** JWT tokens validated via `WsJwtGuard`
- **Room Authorization:** Users can only subscribe to their own rooms
- **Message Authorization:** Users can only read messages they're part of
- **Rate Limiting:** Applied to REST endpoints

## Performance

- **Multiple Connections:** Same user can connect from multiple devices
- **Efficient Broadcasting:** Socket.io rooms for targeted message delivery
- **Redis Caching:** Unread counts cached for 1 minute
- **Scalability:** Can add Redis adapter for multi-server deployments

## Testing

**Coverage:** 100% for gateway, 47 tests for service

Run tests:

```bash
yarn test messages
```

## Troubleshooting

### WebSocket Connection Issues

1. **CORS errors:** Check `FRONTEND_URL` environment variable
2. **Auth failed:** Verify JWT token in socket.io auth
3. **Events not received:** Ensure `subscribe` event was emitted

### Debug Logging

```typescript
// Enable in messages.gateway.ts
this.logger.debug(`User ${userId} subscribed with socket ${client.id}`);
```

Frontend debugging:

```javascript
socket.on('connect', () => console.log('Connected:', socket.id));
socket.on('disconnect', () => console.log('Disconnected'));
socket.on('error', (error) => console.error('Socket error:', error));
```
