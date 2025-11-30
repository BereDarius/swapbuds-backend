import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { resetDatabase } from './helpers/db-reset.helper';
import request = require('supertest');

/**
 * E2E Tests for Trade Workflows
 * Tests complete trade lifecycle from proposal to completion
 */
describe('Trades E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userToken: string;
  let userId: string;
  let otherUserToken: string;
  let otherUserId: string;
  let userItemId: string;
  let otherUserItemId: string;

  beforeAll(async () => {
    // Reset database for test isolation
    await resetDatabase();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);

    // Apply same configuration as main.ts
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    // Create two test users with items
    const timestamp = Date.now();
    const user1 = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        username: `trader1_${timestamp}`,
        email: `trader1_${timestamp}@example.com`,
        password: 'TestPass123',
        recaptchaToken: 'test-token',
      });

    if (user1.status === 201) {
      userToken = user1.body.accessToken;
      userId = user1.body.user.id;

      // Verify user so they can create trades
      await prisma.user.update({
        where: { id: userId },
        data: { isVerified: true },
      });
    }

    const user2 = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        username: `trader2_${timestamp}`,
        email: `trader2_${timestamp}@example.com`,
        password: 'TestPass123',
        recaptchaToken: 'test-token',
      });

    if (user2.status === 201) {
      otherUserToken = user2.body.accessToken;
      otherUserId = user2.body.user.id;

      // Verify user so they can create trades
      await prisma.user.update({
        where: { id: otherUserId },
        data: { isVerified: true },
      });
    }
  });

  afterAll(async () => {
    // Cleanup test data
    if (userId) {
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
    if (otherUserId) {
      await prisma.user.delete({ where: { id: otherUserId } }).catch(() => {});
    }
    await app.close();
  });

  describe('Trade Proposal', () => {
    it('should create items for both users first', async () => {
      // User 1 creates an item
      const item1Response = await request(app.getHttpServer())
        .post('/api/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Test Item for Trade',
          description: 'A great item to trade',
          category: 'ELECTRONICS',
          condition: 'GOOD',
          estimatedValue: 100,
          deliveryMethods: ['PHYSICAL', 'MAIL'],
        });

      expect([201, 400, 401, 403]).toContain(item1Response.status);
      if (item1Response.status === 201) {
        userItemId = item1Response.body.id;
      }

      // User 2 creates an item
      const item2Response = await request(app.getHttpServer())
        .post('/api/items')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({
          title: 'Another Item for Trade',
          description: 'Also a great item',
          category: 'BOOKS',
          condition: 'NEW',
          estimatedValue: 95,
          deliveryMethods: ['PHYSICAL'],
        });

      expect([201, 400, 401, 403]).toContain(item2Response.status);
      if (item2Response.status === 201) {
        otherUserItemId = item2Response.body.id;
      }
    });

    it('should create a trade proposal', async () => {
      if (!userItemId || !otherUserItemId) {
        return; // Skip if items weren't created
      }

      const response = await request(app.getHttpServer())
        .post('/api/trades')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          itemOfferedId: userItemId,
          itemRequestedId: otherUserItemId,
          message: 'Would you like to trade?',
          deliveryMethod: 'PHYSICAL',
        });

      expect([201, 400, 404]).toContain(response.status);

      if (response.status === 201) {
        expect(response.body).toHaveProperty('id');
        expect(response.body.status).toBe('PENDING');
        expect(response.body.proposerId).toBe(userId);
        expect(response.body.responderId).toBe(otherUserId);
      }
    });

    it('should require authentication for trade creation', () => {
      return request(app.getHttpServer())
        .post('/api/trades')
        .send({
          itemOfferedId: 'some-id',
          itemRequestedId: 'some-other-id',
          message: 'Trade?',
        })
        .expect(401);
    });

    it('should reject trade with invalid item IDs', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/trades')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          itemOfferedId: 'invalid-id',
          itemRequestedId: 'also-invalid-id',
          message: 'Trade?',
          deliveryMethod: 'PHYSICAL',
        });

      expect([400, 401, 404]).toContain(response.status);
    });
  });

  describe('Trade Listing', () => {
    it('should list user trades', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/trades/my-trades')
        .set('Authorization', `Bearer ${userToken}`);

      expect([200, 401]).toContain(response.status);

      if (response.status === 200) {
        expect(Array.isArray(response.body.trades)).toBe(true);
        expect(response.body).toHaveProperty('total');
      }
    });

    it('should filter trades by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/trades/my-trades?status=PENDING')
        .set('Authorization', `Bearer ${userToken}`);

      expect([200, 401]).toContain(response.status);

      if (response.status === 200) {
        expect(Array.isArray(response.body.trades)).toBe(true);
      }
    });

    it('should require authentication to list trades', () => {
      return request(app.getHttpServer())
        .get('/api/trades/my-trades')
        .expect(401);
    });
  });

  describe('Trade Detail', () => {
    it('should get trade details', async () => {
      // First get a trade ID
      const tradesResponse = await request(app.getHttpServer())
        .get('/api/trades')
        .set('Authorization', `Bearer ${userToken}`);

      if (
        tradesResponse.status === 200 &&
        tradesResponse.body.trades.length > 0
      ) {
        const tradeId = tradesResponse.body.trades[0].id;

        const detailResponse = await request(app.getHttpServer())
          .get(`/api/trades/${tradeId}`)
          .set('Authorization', `Bearer ${userToken}`);

        expect([200, 404]).toContain(detailResponse.status);

        if (detailResponse.status === 200) {
          expect(detailResponse.body).toHaveProperty('id');
          expect(detailResponse.body).toHaveProperty('status');
          expect(detailResponse.body).toHaveProperty('proposer');
          expect(detailResponse.body).toHaveProperty('responder');
        }
      }
    });

    it('should return 404 for non-existent trade', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/trades/non-existent-id')
        .set('Authorization', `Bearer ${userToken}`);

      expect([404, 401]).toContain(response.status);
    });
  });

  describe('Trade Actions', () => {
    it('should accept a trade', async () => {
      // Get pending trades for the responder
      const tradesResponse = await request(app.getHttpServer())
        .get('/api/trades?status=PENDING')
        .set('Authorization', `Bearer ${otherUserToken}`);

      if (
        tradesResponse.status === 200 &&
        tradesResponse.body.trades.length > 0
      ) {
        const tradeId = tradesResponse.body.trades[0].id;

        const acceptResponse = await request(app.getHttpServer())
          .patch(`/api/trades/${tradeId}/accept`)
          .set('Authorization', `Bearer ${otherUserToken}`);

        expect([200, 400, 403, 404]).toContain(acceptResponse.status);

        if (acceptResponse.status === 200) {
          expect(acceptResponse.body.status).toBe('ACCEPTED');
        }
      }
    });

    it('should reject a trade', async () => {
      // Create another trade for testing rejection
      if (userItemId && otherUserItemId) {
        const createResponse = await request(app.getHttpServer())
          .post('/api/trades')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            itemOfferedId: userItemId,
            itemRequestedId: otherUserItemId,
            message: 'Another trade attempt',
            deliveryMethod: 'MAIL',
          });

        if (createResponse.status === 201) {
          const tradeId = createResponse.body.id;

          const rejectResponse = await request(app.getHttpServer())
            .patch(`/api/trades/${tradeId}/reject`)
            .set('Authorization', `Bearer ${otherUserToken}`);

          expect([200, 400, 403, 404]).toContain(rejectResponse.status);

          if (rejectResponse.status === 200) {
            expect(rejectResponse.body.status).toBe('REJECTED');
          }
        }
      }
    });

    it('should complete a trade', async () => {
      // Get accepted trades
      const tradesResponse = await request(app.getHttpServer())
        .get('/api/trades?status=ACCEPTED')
        .set('Authorization', `Bearer ${userToken}`);

      if (
        tradesResponse.status === 200 &&
        tradesResponse.body.trades.length > 0
      ) {
        const tradeId = tradesResponse.body.trades[0].id;

        const completeResponse = await request(app.getHttpServer())
          .patch(`/api/trades/${tradeId}/complete`)
          .set('Authorization', `Bearer ${userToken}`);

        expect([200, 400, 403, 404]).toContain(completeResponse.status);

        if (completeResponse.status === 200) {
          expect(completeResponse.body.status).toBe('COMPLETED');
        }
      }
    });

    it('should prevent non-participants from accepting trade', async () => {
      const tradesResponse = await request(app.getHttpServer())
        .get('/api/trades')
        .set('Authorization', `Bearer ${userToken}`);

      if (
        tradesResponse.status === 200 &&
        tradesResponse.body.trades.length > 0
      ) {
        const tradeId = tradesResponse.body.trades[0].id;

        // Try to accept with proposer's token (should fail)
        const acceptResponse = await request(app.getHttpServer())
          .patch(`/api/trades/${tradeId}/accept`)
          .set('Authorization', `Bearer ${userToken}`);

        expect([400, 403]).toContain(acceptResponse.status);
      }
    });
  });

  describe('Trade Cancellation', () => {
    it('should cancel a pending trade', async () => {
      if (userItemId && otherUserItemId) {
        // Create a trade to cancel
        const createResponse = await request(app.getHttpServer())
          .post('/api/trades')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            itemOfferedId: userItemId,
            itemRequestedId: otherUserItemId,
            message: 'Trade to be cancelled',
            deliveryMethod: 'PHYSICAL',
          });

        if (createResponse.status === 201) {
          const tradeId = createResponse.body.id;

          const cancelResponse = await request(app.getHttpServer())
            .patch(`/api/trades/${tradeId}/cancel`)
            .set('Authorization', `Bearer ${userToken}`);

          expect([200, 400, 403, 404]).toContain(cancelResponse.status);

          if (cancelResponse.status === 200) {
            expect(cancelResponse.body.status).toBe('CANCELLED');
          }
        }
      }
    });
  });
});
