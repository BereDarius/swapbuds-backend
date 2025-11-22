# SwapBuds Backend - Post v1.0.0 Roadmap

## Version 1.1.0 - Admin & Moderation System

### Features

- [ ] Admin dashboard with platform statistics
- [ ] User management (view all users, ban/suspend/activate)
- [ ] Content moderation (flag/approve/remove items)
- [ ] Role-based access control (Admin, Moderator, Support)
- [ ] Audit logs for admin actions
- [ ] Platform monitoring and health checks
- [ ] Bulk actions for moderation tasks
- [ ] **Live support chat with queue system**
- [ ] Support ticket management
- [ ] Real-time support agent availability
- [ ] Support chat history and transcripts

### Technical Implementation

- [ ] Extend User model with roles (ADMIN, MODERATOR, SUPPORT, USER)
- [ ] Create AdminGuard, ModeratorGuard, SupportGuard
- [ ] AdminModule with controllers and services
- [ ] AuditLog model for tracking admin actions
- [ ] Admin dashboard API endpoints
- [ ] Moderation queue system
- [ ] **SupportChat model (userId, agentId, status, priority, queuePosition)**
- [ ] **SupportChatMessage model (chatId, senderId, message, timestamp)**
- [ ] **SupportQueue service with basic queue handling**
- [ ] **WebSocket gateway for live support chat**
- [ ] **Queue position tracking and notifications**
- [ ] **Agent assignment algorithm (round-robin with availability)**

### API Endpoints

- `GET /admin/stats` - Platform statistics
- `GET /admin/users` - List all users with filters
- `PATCH /admin/users/:id/ban` - Ban user
- `PATCH /admin/users/:id/suspend` - Suspend user
- `GET /admin/items/flagged` - Get flagged items
- `PATCH /admin/items/:id/approve` - Approve item
- `DELETE /admin/items/:id` - Remove item
- `GET /admin/audit-logs` - View audit logs
- **`POST /support/chat/start` - Start support chat session (enters queue)**
- **`GET /support/chat/:id` - Get support chat details**
- **`GET /support/chat/:id/messages` - Get chat messages**
- **`POST /support/chat/:id/messages` - Send message in support chat**
- **`PATCH /support/chat/:id/close` - Close support chat**
- **`GET /support/queue` - Get current queue position (user)**
- **`GET /support/agent/queue` - Get support queue (agents only)**
- **`PATCH /support/agent/available` - Toggle agent availability**
- **`GET /support/history` - Get user's support chat history**

### Database Schema

```prisma
model SupportChat {
  id            String   @id @default(uuid())
  userId        String
  user          User     @relation("UserSupportChats", fields: [userId], references: [id])
  agentId       String?
  agent         User?    @relation("AgentSupportChats", fields: [agentId], references: [id])
  status        SupportChatStatus @default(QUEUED)
  priority      Int      @default(0) // Priority level (can be enhanced later)
  queuePosition Int?
  subject       String?
  createdAt     DateTime @default(now())
  assignedAt    DateTime?
  closedAt      DateTime?
  messages      SupportChatMessage[]
}

model SupportChatMessage {
  id        String   @id @default(uuid())
  chatId    String
  chat      SupportChat @relation(fields: [chatId], references: [id])
  senderId  String
  sender    User     @relation(fields: [senderId], references: [id])
  message   String
  isInternal Boolean @default(false) // For agent-only notes
  createdAt DateTime @default(now())
}

enum SupportChatStatus {
  QUEUED
  ASSIGNED
  IN_PROGRESS
  RESOLVED
  CLOSED
}
```

### WebSocket Events

- `support:queue:joined` - User entered queue (with position)
- `support:queue:updated` - Queue position changed
- `support:chat:assigned` - Agent assigned to chat
- `support:chat:message` - New message in support chat
- `support:chat:typing` - Someone is typing
- `support:chat:closed` - Chat session closed
- `support:agent:available` - Agent became available
- `support:agent:unavailable` - Agent went offline

### Business Rules

- Maximum 3 active support chats per agent
- Inactive chats (no response for 10 minutes) get auto-reminder
- Chats with no agent response for 5 minutes get reassigned
- Support agents can't see messages marked as `isInternal`
- Queue position updates in real-time via WebSocket
- Default priority is 0 (can be modified by subscription tier)

---

## Version 1.2.0 - Organization/Business Accounts

### Features

- [ ] Organization-type user accounts
- [ ] Multiple members per organization
- [ ] Organization roles (Owner, Admin, Member)
- [ ] Business profile with company details
- [ ] Bulk item management for organizations
- [ ] Team collaboration features
- [ ] Organization statistics and analytics

### Technical Implementation

- [ ] Organization model (name, type, verification status)
- [ ] OrganizationMember model (join table with roles)
- [ ] OrganizationType enum (BUSINESS, NONPROFIT, EDUCATIONAL, OTHER)
- [ ] OrganizationRole enum (OWNER, ADMIN, MEMBER)
- [ ] Update Item model with organizationId
- [ ] OrganizationsModule with full CRUD
- [ ] Member invitation system

### API Endpoints

- `POST /organizations` - Create organization
- `GET /organizations/:id` - Get organization details
- `POST /organizations/:id/members` - Invite member
- `PATCH /organizations/:id/members/:userId` - Update member role
- `DELETE /organizations/:id/members/:userId` - Remove member
- `GET /organizations/:id/items` - Get organization items
- `POST /organizations/:id/items/bulk` - Bulk create items

---

## Version 1.3.0 - Social Authentication (OAuth)

### Features

- [ ] Google OAuth integration
- [ ] Apple Sign In integration
- [ ] Facebook OAuth integration
- [ ] X (Twitter) OAuth integration
- [ ] GitHub OAuth integration
- [ ] Account linking (connect multiple OAuth providers)
- [ ] Unified user profile across providers
- [ ] OAuth token refresh handling

### Technical Implementation

- [ ] Install @nestjs/passport OAuth strategies
- [ ] GoogleStrategy, AppleStrategy, FacebookStrategy, XStrategy, GitHubStrategy
- [ ] OAuthProvider enum (GOOGLE, APPLE, FACEBOOK, X, GITHUB, LOCAL)
- [ ] UserOAuthProvider model (userId, provider, providerId, tokens)
- [ ] Account linking logic (merge or link existing accounts)
- [ ] OAuth callback handlers
- [ ] Token refresh service

### API Endpoints

- `GET /auth/google` - Initiate Google OAuth
- `GET /auth/google/callback` - Google OAuth callback
- `GET /auth/apple` - Initiate Apple Sign In
- `GET /auth/apple/callback` - Apple callback
- `GET /auth/facebook` - Initiate Facebook OAuth
- `GET /auth/facebook/callback` - Facebook callback
- `GET /auth/x` - Initiate X OAuth
- `GET /auth/x/callback` - X callback
- `GET /auth/github` - Initiate GitHub OAuth
- `GET /auth/github/callback` - GitHub callback
- `POST /auth/link/:provider` - Link OAuth provider to existing account
- `DELETE /auth/unlink/:provider` - Unlink OAuth provider

### Environment Variables

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
APPLE_CLIENT_ID=
APPLE_CLIENT_SECRET=
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=
X_CLIENT_ID=
X_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

---

## Version 1.4.0 - Email Digest Notifications

### Features

- [ ] Daily email digest (configurable time)
- [ ] Weekly email digest (configurable day)
- [ ] Trade summaries (pending, completed)
- [ ] New items from followed users
- [ ] Personalized recommendations
- [ ] Activity highlights (messages, reviews)
- [ ] Digest preferences per user

### Technical Implementation

- [ ] DigestService with scheduled jobs
- [ ] User digest preferences (daily, weekly, none)
- [ ] Email templates: daily-digest.hbs, weekly-digest.hbs
- [ ] Recommendation algorithm for suggested items
- [ ] Cron jobs: daily (8 AM user timezone), weekly (Monday 8 AM)
- [ ] Digest content aggregation logic
- [ ] Unsubscribe functionality

### API Endpoints

- `GET /users/me/digest-preferences` - Get digest settings
- `PATCH /users/me/digest-preferences` - Update digest settings
- `POST /users/me/digest/preview` - Preview digest email

### Database Schema

```prisma
model User {
  digestFrequency DigestFrequency @default(WEEKLY)
  digestTime      Int             @default(8) // Hour in user timezone
  digestDay       Int             @default(1) // 1 = Monday for weekly
}

enum DigestFrequency {
  NONE
  DAILY
  WEEKLY
}
```

---

## Version 1.5.0 - Social Features (Follow System)

### Features

- [ ] Follow/unfollow users
- [ ] Followers/following lists
- [ ] Follow notifications
- [ ] New item notifications from followed users
- [ ] Follow suggestions (based on interests, location)
- [ ] Privacy settings (allow/block followers)
- [ ] Following activity in notifications

### Technical Implementation

- [ ] UserFollow model (followerId, followingId, createdAt)
- [ ] FollowsService with business logic
- [ ] Follow/unfollow endpoints
- [ ] Notification integration (NEW_FOLLOWER type)
- [ ] Privacy settings in UserSettings
- [ ] Follow count on user profiles
- [ ] Follow suggestion algorithm

### API Endpoints

- `POST /users/:id/follow` - Follow user
- `DELETE /users/:id/unfollow` - Unfollow user
- `GET /users/:id/followers` - Get user's followers
- `GET /users/:id/following` - Get users they follow
- `GET /users/me/follow-suggestions` - Get suggested users to follow
- `GET /users/:id/is-following` - Check if following user

### Database Schema

```prisma
model UserFollow {
  id          String   @id @default(cuid())
  followerId  String
  followingId String
  createdAt   DateTime @default(now())

  follower    User     @relation("Followers", fields: [followerId], references: [id], onDelete: Cascade)
  following   User     @relation("Following", fields: [followingId], references: [id], onDelete: Cascade)

  @@unique([followerId, followingId])
  @@index([followerId])
  @@index([followingId])
}

model User {
  followers     UserFollow[] @relation("Following")
  following     UserFollow[] @relation("Followers")
  followerCount Int          @default(0)
  followingCount Int         @default(0)
}
```

---

## Version 1.6.0 - Social Features (Activity Feed)

### Features

- [ ] Personalized activity feed
- [ ] Feed showing followed users' new items
- [ ] Feed showing followed users' completed trades
- [ ] Trending items section
- [ ] Community highlights
- [ ] Real-time feed updates via WebSocket
- [ ] Feed filters (items only, trades only, all activity)
- [ ] Infinite scroll pagination

### Technical Implementation

- [ ] ActivityFeed model (userId, activityType, metadata, createdAt)
- [ ] ActivityType enum (NEW_ITEM, COMPLETED_TRADE, NEW_REVIEW, MILESTONE)
- [ ] FeedService with aggregation logic
- [ ] Feed generation from followed users' activities
- [ ] Trending algorithm (likes + recency + trade activity)
- [ ] WebSocket feed updates
- [ ] Feed caching strategy (Redis)

### API Endpoints

- `GET /feed` - Get personalized activity feed
- `GET /feed/trending` - Get trending items
- `GET /feed/community` - Get community highlights
- `POST /feed/mark-seen` - Mark feed items as seen

### Database Schema

```prisma
model ActivityFeed {
  id           String       @id @default(cuid())
  userId       String
  activityType ActivityType
  actorId      String       // User who performed the action
  targetId     String       // Item/Trade/etc ID
  metadata     Json?
  createdAt    DateTime     @default(now())

  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  actor        User         @relation("ActivityActor", fields: [actorId], references: [id])

  @@index([userId, createdAt])
  @@index([actorId])
}

enum ActivityType {
  NEW_ITEM
  COMPLETED_TRADE
  NEW_REVIEW
  MILESTONE
}
```

---

## Version 1.7.0 - Premium Subscription System

### Features

- [ ] Subscription tiers (Basic - Free, Premium - Paid)
- [ ] Stripe integration for payments
- [ ] PayPal integration (alternative)
- [ ] Subscription management dashboard
- [ ] Billing history
- [ ] Automatic subscription renewal
- [ ] Subscription cancellation
- [ ] Grace period handling
- [ ] Proration for upgrades/downgrades
- [ ] Webhook handling for payment events

### Technical Implementation

- [ ] Subscription model (userId, tier, status, billingCycle)
- [ ] SubscriptionTier enum (BASIC, PREMIUM)
- [ ] SubscriptionStatus enum (ACTIVE, CANCELLED, PAST_DUE, EXPIRED)
- [ ] Payment model (subscriptionId, amount, status, provider)
- [ ] Stripe SDK integration
- [ ] PayPal SDK integration
- [ ] Webhook handlers for Stripe/PayPal events
- [ ] SubscriptionGuard for premium-only endpoints
- [ ] Billing cycle management service

### API Endpoints

- `GET /subscriptions/plans` - List available plans
- `POST /subscriptions/subscribe` - Create subscription
- `GET /subscriptions/me` - Get current subscription
- `PATCH /subscriptions/me/cancel` - Cancel subscription
- `POST /subscriptions/me/reactivate` - Reactivate subscription
- `GET /subscriptions/me/billing-history` - Get payment history
- `POST /subscriptions/webhooks/stripe` - Stripe webhook
- `POST /subscriptions/webhooks/paypal` - PayPal webhook

### Database Schema

```prisma
model Subscription {
  id              String             @id @default(cuid())
  userId          String             @unique
  tier            SubscriptionTier   @default(BASIC)
  status          SubscriptionStatus @default(ACTIVE)
  billingCycle    BillingCycle       @default(MONTHLY)
  currentPeriodStart DateTime
  currentPeriodEnd   DateTime
  cancelAtPeriodEnd  Boolean         @default(false)
  stripeCustomerId   String?
  stripeSubscriptionId String?
  paypalSubscriptionId String?
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt

  user            User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  payments        Payment[]
}

model Payment {
  id              String        @id @default(cuid())
  subscriptionId  String
  amount          Decimal       @db.Decimal(10, 2)
  currency        String        @default("USD")
  status          PaymentStatus
  provider        PaymentProvider
  providerPaymentId String?
  createdAt       DateTime      @default(now())

  subscription    Subscription  @relation(fields: [subscriptionId], references: [id])

  @@index([subscriptionId])
}

enum SubscriptionTier {
  BASIC
  PREMIUM
}

enum SubscriptionStatus {
  ACTIVE
  CANCELLED
  PAST_DUE
  EXPIRED
}

enum BillingCycle {
  MONTHLY
  YEARLY
}

enum PaymentStatus {
  PENDING
  SUCCEEDED
  FAILED
  REFUNDED
}

enum PaymentProvider {
  STRIPE
  PAYPAL
}
```

### Environment Variables

```
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_WEBHOOK_ID=
PREMIUM_MONTHLY_PRICE=9.99
PREMIUM_YEARLY_PRICE=99.99
```

---

## Version 1.8.0 - Premium Features Implementation

### Premium Features

- [ ] Advanced search with more filters
- [ ] Unlimited items (Basic: 20 items limit)
- [ ] **Priority customer support (queue jumping)**
- [ ] Featured/promoted listings
- [ ] Analytics dashboard (views, likes, trade success rate)
- [ ] Ad-free experience
- [ ] Early access to new features
- [ ] Custom profile themes
- [ ] Verified badge

### Technical Implementation

- [ ] ItemLimit service (check user tier before creating items)
- [ ] FeaturedItem model (itemId, startDate, endDate)
- [ ] Analytics service (track views, clicks, conversions)
- [ ] ItemAnalytics model (itemId, views, likes, tradeAttempts)
- [ ] PremiumGuard decorator for premium-only endpoints
- [ ] **Priority queue system enhancement (Premium users get +10 priority)**
- [ ] **Update SupportQueue service to check subscription tier**
- [ ] Featured items in search results

### API Endpoints

- `POST /items/:id/feature` - Feature item (Premium only)
- `GET /analytics/items/:id` - Get item analytics (Premium only)
- `GET /analytics/dashboard` - User analytics dashboard (Premium only)
- `GET /support/tickets` - Priority support (Premium gets faster response)
- `POST /profile/theme` - Set custom theme (Premium only)

### Business Rules

- Basic users: Max 20 items
- Premium users: Unlimited items
- Featured listings: Premium only, max 3 concurrent
- Analytics: Premium gets detailed metrics, Basic gets basic stats
- **Support queue priority: Premium users get +10 priority (moved to front of queue)**
- **Premium support chats are assigned to agents first**
- **Premium users see "Priority Support" badge in queue**

### Database Schema

```prisma
model User {
  itemLimit       Int      @default(20)
  verifiedBadge   Boolean  @default(false)
}

model FeaturedItem {
  id        String   @id @default(cuid())
  itemId    String
  userId    String
  startDate DateTime @default(now())
  endDate   DateTime
  createdAt DateTime @default(now())

  item      Item     @relation(fields: [itemId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([itemId])
  @@index([startDate, endDate])
}

model ItemAnalytics {
  id             String   @id @default(cuid())
  itemId         String   @unique
  views          Int      @default(0)
  uniqueViews    Int      @default(0)
  likes          Int      @default(0)
  tradeAttempts  Int      @default(0)
  completedTrades Int     @default(0)
  updatedAt      DateTime @updatedAt

  item           Item     @relation(fields: [itemId], references: [id], onDelete: Cascade)
}
```

---

## Version 1.9.0 - Payment Integration (Complete)

### Features

- [ ] One-time payments for featured listings
- [ ] Tip/donation functionality
- [ ] Payment method management
- [ ] Refund processing
- [ ] Payment dispute handling
- [ ] Multi-currency support
- [ ] Tax calculation (where applicable)
- [ ] Invoice generation

### Technical Implementation

- [ ] PaymentIntent service (Stripe/PayPal)
- [ ] Refund service with business logic
- [ ] Invoice model and generation
- [ ] Multi-currency conversion service
- [ ] Tax calculation service (based on location)
- [ ] Payment method storage (tokenized)
- [ ] Receipt email generation

### API Endpoints

- `POST /payments/feature-item` - Pay to feature item
- `POST /payments/tip/:userId` - Send tip to user
- `GET /payments/methods` - Get saved payment methods
- `POST /payments/methods` - Add payment method
- `DELETE /payments/methods/:id` - Remove payment method
- `POST /payments/:id/refund` - Process refund (Admin)
- `GET /payments/:id/invoice` - Get invoice/receipt

### Database Schema

```prisma
model Payment {
  id              String          @id @default(cuid())
  userId          String
  amount          Decimal         @db.Decimal(10, 2)
  currency        String          @default("USD")
  type            PaymentType
  status          PaymentStatus
  provider        PaymentProvider
  providerPaymentId String?
  metadata        Json?
  refundedAmount  Decimal?        @db.Decimal(10, 2)
  createdAt       DateTime        @default(now())

  user            User            @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([status])
}

enum PaymentType {
  SUBSCRIPTION
  FEATURED_ITEM
  TIP
  OTHER
}

model PaymentMethod {
  id              String          @id @default(cuid())
  userId          String
  type            String          // card, paypal, etc
  provider        PaymentProvider
  providerMethodId String
  last4           String?
  isDefault       Boolean         @default(false)
  createdAt       DateTime        @default(now())

  user            User            @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

---

## Version 1.10.0 - Item Recommendations & Matching Algorithm

### Features

- [ ] Personalized item recommendations based on user preferences
- [ ] Smart trade matching (suggest compatible trades)
- [ ] Category-based recommendations
- [ ] Location-based item suggestions
- [ ] User behavior tracking (views, likes, searches)
- [ ] "Similar items" feature on item pages
- [ ] "You might also like" recommendations
- [ ] Trade compatibility scoring
- [ ] Trending items algorithm
- [ ] Recently viewed items tracking

### Technical Implementation

- [ ] RecommendationEngine service with ML-ready architecture
- [ ] UserBehavior model (track views, searches, interactions)
- [ ] ItemSimilarity calculation algorithm
- [ ] Collaborative filtering algorithm (user-based)
- [ ] Content-based filtering (category, condition, location)
- [ ] Hybrid recommendation system (combine multiple algorithms)
- [ ] Redis caching for recommendation results
- [ ] Scheduled job to pre-compute recommendations
- [ ] Recommendation scoring and ranking system
- [ ] A/B testing framework for algorithm improvements

### API Endpoints

- `GET /recommendations/items` - Get personalized item recommendations
- `GET /recommendations/items/:id/similar` - Get similar items
- `GET /recommendations/trades` - Get suggested trade matches
- `GET /recommendations/trending` - Get trending items
- `GET /items/:id/compatibility/:targetId` - Check trade compatibility score
- `POST /analytics/track` - Track user behavior (view, search, etc.)
- `GET /users/me/recently-viewed` - Get recently viewed items

### Database Schema

```prisma
model UserBehavior {
  id          String         @id @default(cuid())
  userId      String
  itemId      String?
  categoryId  String?
  action      BehaviorAction
  metadata    Json?          // Additional context (search query, duration, etc.)
  createdAt   DateTime       @default(now())

  user        User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  item        Item?          @relation(fields: [itemId], references: [id], onDelete: Cascade)

  @@index([userId, action])
  @@index([itemId])
  @@index([createdAt])
}

model ItemRecommendation {
  id              String   @id @default(cuid())
  userId          String
  itemId          String
  score           Float    // Recommendation confidence score (0-1)
  algorithm       String   // Which algorithm generated this
  expiresAt       DateTime // Cache expiration
  createdAt       DateTime @default(now())

  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  item            Item     @relation(fields: [itemId], references: [id], onDelete: Cascade)

  @@unique([userId, itemId])
  @@index([userId, score])
  @@index([expiresAt])
}

model TradeMatch {
  id              String   @id @default(cuid())
  userId          String
  userItemId      String
  matchUserId     String
  matchItemId     String
  compatibilityScore Float  // 0-100 score
  reasons         Json     // Why this is a good match
  status          MatchStatus @default(SUGGESTED)
  createdAt       DateTime @default(now())
  viewedAt        DateTime?
  dismissedAt     DateTime?

  user            User     @relation("UserMatches", fields: [userId], references: [id], onDelete: Cascade)
  matchUser       User     @relation("MatchUserMatches", fields: [matchUserId], references: [id], onDelete: Cascade)
  userItem        Item     @relation("UserMatchItems", fields: [userItemId], references: [id], onDelete: Cascade)
  matchItem       Item     @relation("MatchUserItems", fields: [matchItemId], references: [id], onDelete: Cascade)

  @@unique([userId, matchUserId, userItemId, matchItemId])
  @@index([userId, status])
  @@index([compatibilityScore])
}

enum BehaviorAction {
  VIEW
  SEARCH
  LIKE
  UNLIKE
  COMMENT
  TRADE_PROPOSE
  SHARE
}

enum MatchStatus {
  SUGGESTED
  VIEWED
  DISMISSED
  TRADE_INITIATED
}
```

### Recommendation Algorithms

#### 1. Content-Based Filtering

- Match based on item categories, condition, location
- User's past liked items and completed trades
- Price range preferences

#### 2. Collaborative Filtering

- "Users who liked X also liked Y"
- Similar user taste analysis
- Community behavior patterns

#### 3. Hybrid Approach

- Combine content + collaborative scores
- Weighted scoring: 60% content, 40% collaborative
- Adjust weights based on user activity level

#### 4. Trade Compatibility Scoring

Factors:

- Category match (40 points)
- Condition compatibility (20 points)
- Location proximity (20 points)
- User reputation compatibility (10 points)
- Historical trade patterns (10 points)

### Business Rules

- Recommendations refresh every 6 hours
- Minimum 20 user interactions before collaborative filtering
- New users get content-based recommendations only
- Track user behavior for 90 days (rolling window)
- Trending algorithm: engagement score over last 7 days
- Recently viewed: Last 50 items per user
- Similar items: Top 10 matches by similarity score
- Trade matches: Only suggest if compatibility > 60

### Performance Optimization

- Pre-compute recommendations nightly for all active users
- Cache recommendations in Redis (6 hour TTL)
- Use database indexes on userId, itemId, createdAt
- Lazy load recommendations (paginated)
- Background job for similarity calculations

### Environment Variables

```
RECOMMENDATION_CACHE_TTL=21600
RECOMMENDATION_REFRESH_CRON='0 */6 * * *'
TRENDING_WINDOW_DAYS=7
BEHAVIOR_RETENTION_DAYS=90
MIN_COLLABORATIVE_INTERACTIONS=20
```

---

## E2E Testing (Continuous Integration)

### Test Coverage

- [ ] User registration and authentication flow
- [ ] Item creation, editing, and deletion
- [ ] Trade proposal, acceptance, and completion
- [ ] Messaging between users
- [ ] Review submission
- [ ] Dispute filing and resolution
- [ ] Notification delivery
- [ ] Search and filtering
- [ ] OAuth authentication flows
- [ ] Subscription payment flow
- [ ] Premium feature access control

### Technical Implementation

- [ ] Install Playwright or Cypress
- [ ] Test environment setup (separate DB)
- [ ] Seed data for E2E tests
- [ ] Page Object Model structure
- [ ] CI/CD integration (GitHub Actions)
- [ ] Visual regression testing
- [ ] API contract testing
- [ ] Load testing with k6

### Test Files Structure

```
test/e2e/
  ├── auth/
  │   ├── registration.spec.ts
  │   ├── login.spec.ts
  │   └── oauth.spec.ts
  ├── items/
  │   ├── create-item.spec.ts
  │   └── search-items.spec.ts
  ├── trades/
  │   ├── trade-flow.spec.ts
  │   └── counter-offers.spec.ts
  ├── messaging/
  │   └── send-message.spec.ts
  ├── subscriptions/
  │   └── upgrade-premium.spec.ts
  └── fixtures/
      └── test-data.ts
```

---

## Release Timeline (Estimated)

- **v1.1.0** - Admin & Moderation (2-3 weeks)
- **v1.2.0** - Organizations (3-4 weeks)
- **v1.3.0** - OAuth (2-3 weeks)
- **v1.4.0** - Email Digests (1-2 weeks)
- **v1.5.0** - Follow System (2 weeks)
- **v1.6.0** - Activity Feed (2-3 weeks)
- **v1.7.0** - Subscriptions (3-4 weeks)
- **v1.8.0** - Premium Features (2-3 weeks)
- **v1.9.0** - Payment Integration (2-3 weeks)
- **v2.0.0** - Complete Platform with all features 🎉

**Total Development Time: ~5-7 months**

---

## Notes

- E2E tests should be implemented incrementally with each release
- Each version should include comprehensive unit and integration tests
- Database migrations must be backward compatible
- API versioning may be needed for breaking changes
- Security audits recommended before payment features
- Consider rate limiting and abuse prevention for all new features
- Monitor performance impact of social features on database
- Regular dependency updates and security patches
