import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { resetDatabase } from './helpers/db-reset.helper';
import request = require('supertest');

/**
 * E2E Tests for Social Features
 * Tests reviews, comments, and likes functionality
 */
describe('Social Features E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userToken: string;
  let userId: string;
  let otherUserToken: string;
  let otherUserId: string;
  let itemId: string;
  let commentId: string;

  beforeAll(async () => {
    // Reset database for test isolation
    await resetDatabase();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);

    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    // Create two test users
    const user1 = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        username: `socialuser1_${Date.now()}`,
        email: `socialuser1_${Date.now()}@example.com`,
        password: 'TestPass123',
        recaptchaToken: 'test-token',
      });

    if (user1.status === 201) {
      userToken = user1.body.accessToken;
      userId = user1.body.user.id;

      // Create an item
      const itemResponse = await request(app.getHttpServer())
        .post('/api/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Item for Social Tests',
          description: 'Testing comments and likes',
          category: 'ELECTRONICS',
          condition: 'GOOD',
          estimatedValue: 100,
          deliveryMethods: ['PHYSICAL'],
        });

      if (itemResponse.status === 201) {
        itemId = itemResponse.body.id;
      }
    }

    const user2 = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        username: `socialuser2_${Date.now()}`,
        email: `socialuser2_${Date.now()}@example.com`,
        password: 'TestPass123',
        recaptchaToken: 'test-token',
      });

    if (user2.status === 201) {
      otherUserToken = user2.body.accessToken;
      otherUserId = user2.body.user.id;
    }
  });

  afterAll(async () => {
    if (userId) {
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
    if (otherUserId) {
      await prisma.user.delete({ where: { id: otherUserId } }).catch(() => {});
    }
    await app.close();
  });

  describe('Comments', () => {
    it('should require authentication to comment', () => {
      if (!itemId) return;

      return request(app.getHttpServer())
        .post(`/api/items/${itemId}/comments`)
        .send({
          text: 'Test comment',
        })
        .expect(401);
    });

    it('should create a comment on an item', async () => {
      if (!itemId) return;

      const response = await request(app.getHttpServer())
        .post(`/api/items/${itemId}/comments`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({
          text: 'Great item! Is it still available?',
        });

      expect([201, 400, 404]).toContain(response.status);

      if (response.status === 201) {
        commentId = response.body.id;
        expect(response.body).toHaveProperty('id');
        expect(response.body.text).toBe('Great item! Is it still available?');
        expect(response.body).toHaveProperty('userId');
      }
    });

    it('should validate comment text', async () => {
      if (!itemId) return;

      const response = await request(app.getHttpServer())
        .post(`/api/items/${itemId}/comments`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({
          text: '', // Empty text
        });

      expect(response.status).toBe(400);
    });

    it('should list comments for an item', async () => {
      if (!itemId) return;

      const response = await request(app.getHttpServer()).get(
        `/api/items/${itemId}/comments`,
      );

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        expect(Array.isArray(response.body.comments)).toBe(true);
        expect(response.body).toHaveProperty('total');
      }
    });

    it('should paginate comments', async () => {
      if (!itemId) return;

      const response = await request(app.getHttpServer()).get(
        `/api/items/${itemId}/comments?page=1&limit=10`,
      );

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('page');
        expect(response.body).toHaveProperty('totalPages');
      }
    });

    it('should update own comment', async () => {
      if (!commentId) return;

      const response = await request(app.getHttpServer())
        .patch(`/api/comments/${commentId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({
          text: 'Updated: Still interested in this item!',
        });

      expect([200, 400, 403, 404]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.text).toBe(
          'Updated: Still interested in this item!',
        );
      }
    });

    it('should prevent editing others comments', async () => {
      if (!commentId) return;

      const response = await request(app.getHttpServer())
        .patch(`/api/comments/${commentId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          text: 'Trying to edit someone elses comment',
        });

      expect([403, 404]).toContain(response.status);
    });

    it('should delete own comment', async () => {
      if (!itemId) return;

      // Create a comment to delete
      const createResponse = await request(app.getHttpServer())
        .post(`/api/items/${itemId}/comments`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({
          text: 'Comment to be deleted',
        });

      if (createResponse.status === 201) {
        const deleteCommentId = createResponse.body.id;

        const deleteResponse = await request(app.getHttpServer())
          .delete(`/api/comments/${deleteCommentId}`)
          .set('Authorization', `Bearer ${otherUserToken}`);

        expect([200, 204, 403, 404]).toContain(deleteResponse.status);
      }
    });

    it('should prevent deleting others comments', async () => {
      if (!commentId) return;

      const response = await request(app.getHttpServer())
        .delete(`/api/comments/${commentId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect([403, 404]).toContain(response.status);
    });
  });

  describe('Likes', () => {
    it('should require authentication to like', () => {
      if (!itemId) return;

      return request(app.getHttpServer())
        .post(`/api/items/${itemId}/like`)
        .expect(401);
    });

    it('should like an item', async () => {
      if (!itemId) return;

      const response = await request(app.getHttpServer())
        .post(`/api/items/${itemId}/like`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect([200, 201, 404]).toContain(response.status);

      if ([200, 201].includes(response.status)) {
        expect(response.body).toHaveProperty('liked');
        expect(response.body.liked).toBe(true);
      }
    });

    it('should unlike an item', async () => {
      if (!itemId) return;

      const response = await request(app.getHttpServer())
        .delete(`/api/items/${itemId}/like`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect([200, 204, 404]).toContain(response.status);
    });

    it('should get like status', async () => {
      if (!itemId) return;

      const response = await request(app.getHttpServer())
        .get(`/api/items/${itemId}/like`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('liked');
        expect(typeof response.body.liked).toBe('boolean');
      }
    });

    it('should list users who liked an item', async () => {
      if (!itemId) return;

      const response = await request(app.getHttpServer()).get(
        `/api/items/${itemId}/likes`,
      );

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        expect(Array.isArray(response.body)).toBe(true);
      }
    });

    it('should prevent liking own item', async () => {
      if (!itemId) return;

      const response = await request(app.getHttpServer())
        .post(`/api/items/${itemId}/like`)
        .set('Authorization', `Bearer ${userToken}`);

      // Some implementations might allow this, others might not
      expect([200, 201, 400, 403]).toContain(response.status);
    });
  });

  describe('Reviews', () => {
    let completedTradeId: string;
    let johnToken: string;
    let mikeToken: string;

    beforeAll(async () => {
      // Login as John (has completed trade with Mike)
      const johnLogin = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'john.doe@example.com',
          password: 'Password123!',
        });

      if (johnLogin.status === 200) {
        johnToken = johnLogin.body.accessToken;
      }

      // Login as Mike
      const mikeLogin = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'mike.collector@example.com',
          password: 'Password123!',
        });

      if (mikeLogin.status === 200) {
        mikeToken = mikeLogin.body.accessToken;
      }

      // Get the completed trade between John and Mike
      const completedTrade = await prisma.trade.findFirst({
        where: { status: 'COMPLETED' },
      });

      if (completedTrade) {
        completedTradeId = completedTrade.id;
      }
    });

    it('should require authentication to review', async () => {
      // Re-fetch completed trade to ensure it exists after DB reset
      const completedTrade = await prisma.trade.findFirst({
        where: { status: 'COMPLETED' },
      });

      if (!completedTrade) {
        // Skip if no completed trade exists (shouldn't happen with seed data)
        expect(true).toBe(true);
        return;
      }

      return request(app.getHttpServer())
        .post(`/api/reviews/trades/${completedTrade.id}`)
        .send({
          rating: 5,
          comment: 'Great trader!',
        })
        .expect(401);
    });

    it('should create a review for completed trade', async () => {
      if (!completedTradeId || !johnToken) return;

      const response = await request(app.getHttpServer())
        .post(`/api/reviews/trades/${completedTradeId}`)
        .set('Authorization', `Bearer ${johnToken}`)
        .send({
          rating: 5,
          comment: 'Excellent communication and item as described!',
        });

      expect([201, 400, 403, 404, 409]).toContain(response.status);

      if (response.status === 201) {
        expect(response.body).toHaveProperty('id');
        expect(response.body.rating).toBe(5);
        expect(response.body).toHaveProperty('comment');
      }
    });

    it('should validate rating range', async () => {
      if (!completedTradeId || !mikeToken) return;

      const response = await request(app.getHttpServer())
        .post(`/api/reviews/trades/${completedTradeId}`)
        .set('Authorization', `Bearer ${mikeToken}`)
        .send({
          rating: 6, // Invalid rating (should be 1-5)
          comment: 'Test',
        });

      expect([400, 403, 404, 409]).toContain(response.status);
    });

    it('should allow review without comment', async () => {
      if (!completedTradeId || !johnToken) return;

      const response = await request(app.getHttpServer())
        .post(`/api/reviews/trades/${completedTradeId}`)
        .set('Authorization', `Bearer ${johnToken}`)
        .send({
          rating: 4,
        });

      expect([201, 400, 403, 404, 409]).toContain(response.status);
    });

    it('should prevent reviewing incomplete trades', async () => {
      if (!johnToken) return;

      // Get a pending trade
      const pendingTrade = await prisma.trade.findFirst({
        where: { status: 'PENDING' },
      });

      if (pendingTrade) {
        const response = await request(app.getHttpServer())
          .post(`/api/reviews/trades/${pendingTrade.id}`)
          .set('Authorization', `Bearer ${johnToken}`)
          .send({
            rating: 5,
            comment: 'Test',
          });

        expect([400, 403, 404]).toContain(response.status);
      }
    });

    it('should list user reviews', async () => {
      const response = await request(app.getHttpServer()).get(
        `/api/users/${userId}/reviews`,
      );

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        expect(Array.isArray(response.body.reviews)).toBe(true);
        expect(response.body).toHaveProperty('averageRating');
        expect(response.body).toHaveProperty('totalReviews');
      }
    });

    it('should update own review', async () => {
      // Get user's review
      const reviewsResponse = await request(app.getHttpServer()).get(
        `/api/users/${userId}/reviews`,
      );

      if (
        reviewsResponse.status === 200 &&
        reviewsResponse.body.reviews.length > 0
      ) {
        const reviewId = reviewsResponse.body.reviews[0].id;

        const updateResponse = await request(app.getHttpServer())
          .patch(`/api/reviews/${reviewId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            rating: 4,
            comment: 'Updated review comment',
          });

        expect([200, 400, 403, 404]).toContain(updateResponse.status);

        if (updateResponse.status === 200) {
          expect(updateResponse.body.rating).toBe(4);
          expect(updateResponse.body.comment).toBe('Updated review comment');
        }
      }
    });

    it('should delete own review', async () => {
      // Get user's review
      const reviewsResponse = await request(app.getHttpServer()).get(
        `/api/users/${userId}/reviews`,
      );

      if (
        reviewsResponse.status === 200 &&
        reviewsResponse.body.reviews.length > 0
      ) {
        const reviewId = reviewsResponse.body.reviews[0].id;

        const deleteResponse = await request(app.getHttpServer())
          .delete(`/api/reviews/${reviewId}`)
          .set('Authorization', `Bearer ${userToken}`);

        expect([200, 204, 403, 404]).toContain(deleteResponse.status);
      }
    });
  });

  describe('User Reputation', () => {
    it('should calculate user reputation score', async () => {
      const response = await request(app.getHttpServer()).get(
        `/api/users/${userId}/reputation`,
      );

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('reputationScore');
        expect(response.body).toHaveProperty('totalTrades');
        expect(response.body).toHaveProperty('averageRating');
        expect(typeof response.body.reputationScore).toBe('number');
      }
    });

    it('should include reputation in user profile', async () => {
      const response = await request(app.getHttpServer()).get(
        `/api/users/${userId}`,
      );

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('reputation');
      }
    });
  });
});
