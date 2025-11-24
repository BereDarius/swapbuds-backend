# Testing Module

## Overview

Comprehensive testing setup including unit tests, integration tests, and end-to-end tests with mocks and fixtures.

## Test Structure

```
src/test/
├── fixtures/                 # Test data factories
│   ├── user.fixture.ts
│   ├── item.fixture.ts
│   ├── trade.fixture.ts
│   ├── notification.fixture.ts
│   ├── comment.fixture.ts
│   ├── dispute.fixture.ts
│   └── like.fixture.ts
├── mocks/                    # Mock implementations
│   ├── auth.mock.ts
│   ├── users.mock.ts
│   ├── items.mock.ts
│   ├── trades.mock.ts
│   ├── notifications.mock.ts
│   ├── messages.mock.ts
│   ├── reviews.mock.ts
│   ├── comments.mock.ts
│   ├── disputes.mock.ts
│   ├── cache.mock.ts
│   ├── prisma.mock.ts
│   ├── jwt.mock.ts
│   ├── mail.mock.ts
│   └── ...
```

## Running Tests

```bash
# Run all tests
yarn test

# Run specific test file
yarn test auth.controller.spec

# Watch mode
yarn test --watch

# Coverage report
yarn test:cov

# E2E tests
yarn test:e2e
```

## Test Configuration

**jest.config.js:**
```typescript
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
```

## Unit Tests

### Example: Auth Service Test

```typescript
describe('AuthService', () => {
  let service: AuthService;
  let userService: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: mockUserService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should register a new user', async () => {
    const dto = {
      email: 'test@example.com',
      password: 'Password123!',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
    };

    const result = await service.register(dto);

    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
  });
});
```

## Integration Tests

### Example: Items Controller Test

```typescript
describe('ItemsController (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ItemsModule, PrismaModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
  });

  it('GET /items should return paginated items', () => {
    return request(app.getHttpServer())
      .get('/items?page=1&limit=20')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('data');
        expect(res.body).toHaveProperty('pagination');
      });
  });

  it('POST /items should create item', () => {
    return request(app.getHttpServer())
      .post('/items')
      .set('Authorization', `Bearer ${token}`)
      .send(itemFixture.createItemDto())
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('id');
        expect(res.body.title).toBe(itemFixture.createItemDto().title);
      });
  });
});
```

## E2E Tests

### Example: Trade Workflow Test

```typescript
describe('Trade Workflow (E2E)', () => {
  let app: INestApplication;
  let user1Token: string;
  let user2Token: string;
  let item1Id: string;
  let item2Id: string;

  beforeAll(async () => {
    // Setup
    const result = await setupE2ETest();
    app = result.app;
    user1Token = result.user1Token;
    user2Token = result.user2Token;
    item1Id = result.item1Id;
    item2Id = result.item2Id;
  });

  it('should complete full trade workflow', async () => {
    // 1. Create trade proposal
    const tradeRes = await request(app.getHttpServer())
      .post('/trades')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        itemOfferedIds: [item1Id],
        itemRequestedIds: [item2Id],
        message: 'Would like to trade!',
      })
      .expect(201);

    const tradeId = tradeRes.body.id;

    // 2. Accept trade
    await request(app.getHttpServer())
      .patch(`/trades/${tradeId}/accept`)
      .set('Authorization', `Bearer ${user2Token}`)
      .expect(200);

    // 3. Complete trade
    await request(app.getHttpServer())
      .patch(`/trades/${tradeId}/complete`)
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(200);

    // 4. Leave review
    await request(app.getHttpServer())
      .post('/reviews')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({
        tradeId,
        rating: 5,
        comment: 'Great trade!',
      })
      .expect(201);
  });
});
```

## Fixtures

### User Fixture

```typescript
export const userFixture = {
  createUserDto: () => ({
    email: 'test@example.com',
    username: 'testuser',
    password: 'Password123!',
    firstName: 'Test',
    lastName: 'User',
  }),

  user: {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    isVerified: true,
    role: 'USER',
  },
};
```

## Mock Services

### Prisma Mock

```typescript
export const mockPrismaService = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  item: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};
```

## Coverage Goals

- **Statements:** >80%
- **Branches:** >75%
- **Functions:** >80%
- **Lines:** >80%

## Test Naming Convention

```
describe('ComponentName', () => {
  describe('MethodName', () => {
    it('should [expected behavior] when [condition]', () => {
      // Test
    });
  });
});
```

## Implementation Details

**Test Modules:** 30+ test suites covering:
- Authentication and authorization
- Item management
- Trade system
- Notifications
- Messages
- Reviews
- Comments
- User management
- Admin operations
- Moderation
- Caching
- Database queries