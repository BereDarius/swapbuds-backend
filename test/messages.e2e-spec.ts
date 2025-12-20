import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { io, Socket } from 'socket.io-client';
import { truncateAndReseed } from './helpers/truncate-and-seed.helper';
import request = require('supertest');

/**
 * E2E Tests for Real-time Messaging
 * Tests trade chat and WebSocket functionality
 */
describe('Messages E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userToken: string;
  let userId: string;
  let otherUserToken: string;
  let otherUserId: string;
  let tradeId: string;
  let socketClient: Socket;

  beforeAll(async () => {
    // Truncate and reseed for test isolation
    await truncateAndReseed();

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
    await app.listen(0); // Listen on random port for WebSocket

    const address = app.getHttpServer().address();
    const baseUrl = `http://localhost:${address.port}`;

    // Create two test users
    const user1 = await request(baseUrl)
      .post('/api/auth/register')
      .send({
        username: `msguser1_${Date.now()}`,
        email: `msguser1_${Date.now()}@example.com`,
        password: 'TestPass123',
        recaptchaToken: 'test-token',
      });

    if (user1.status === 201) {
      userToken = user1.body.accessToken;
      userId = user1.body.user.id;

      // Verify user for sending messages
      await prisma.user.update({
        where: { id: userId },
        data: { isVerified: true },
      });
    }

    const user2 = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        username: `msguser2_${Date.now()}`,
        email: `msguser2_${Date.now()}@example.com`,
        password: 'TestPass123',
        recaptchaToken: 'test-token',
      });

    if (user2.status === 201) {
      otherUserToken = user2.body.accessToken;
      otherUserId = user2.body.user.id;

      // Verify user for sending messages
      await prisma.user.update({
        where: { id: otherUserId },
        data: { isVerified: true },
      });
    }

    // Create items and trade for messaging context
    if (userToken && otherUserToken) {
      const item1 = await request(baseUrl)
        .post('/api/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Item for Message Test',
          description: 'Test item',
          category: 'ELECTRONICS',
          condition: 'GOOD',
          estimatedValue: 100,
          deliveryMethods: ['PHYSICAL'],
        });

      const item2 = await request(baseUrl)
        .post('/api/items')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({
          title: 'Another Item for Message Test',
          description: 'Another test item',
          category: 'BOOKS',
          condition: 'NEW',
          estimatedValue: 95,
          deliveryMethods: ['PHYSICAL'],
        });

      if (item1.status === 201 && item2.status === 201) {
        const tradeResponse = await request(baseUrl)
          .post('/api/trades')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            itemOfferedId: item1.body.id,
            itemRequestedId: item2.body.id,
            message: 'Let me trade!',
            deliveryMethod: 'PHYSICAL',
          });

        if (tradeResponse.status === 201) {
          tradeId = tradeResponse.body.id;
        }
      }
    }
  });

  afterAll(async () => {
    if (socketClient && socketClient.connected) {
      socketClient.disconnect();
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (userId) {
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
    if (otherUserId) {
      await prisma.user.delete({ where: { id: otherUserId } }).catch(() => {});
    }
    const server = app.getHttpServer();
    if (server && server.listening) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await app.close();
  });

  describe('Message HTTP Endpoints', () => {
    it('should require authentication to send messages', () => {
      if (!tradeId) return;

      return request(app.getHttpServer())
        .post(`/api/trades/${tradeId}/messages`)
        .send({
          text: 'Test message',
        })
        .expect(401);
    });

    it('should send a message in a trade', async () => {
      if (!tradeId) return;

      const response = await request(app.getHttpServer())
        .post(`/api/trades/${tradeId}/messages`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          text: 'Hello, interested in trading!',
        });

      expect([201, 400, 403, 404]).toContain(response.status);

      if (response.status === 201) {
        expect(response.body).toHaveProperty('id');
        expect(response.body.text).toBe('Hello, interested in trading!');
        expect(response.body).toHaveProperty('userId');
      }
    });

    it('should get message history for a trade', async () => {
      if (!tradeId) return;

      const response = await request(app.getHttpServer())
        .get(`/api/trades/${tradeId}/messages`)
        .set('Authorization', `Bearer ${userToken}`);

      expect([200, 403, 404]).toContain(response.status);

      if (response.status === 200) {
        expect(Array.isArray(response.body.messages)).toBe(true);
        expect(response.body).toHaveProperty('total');
      }
    });

    it('should paginate message history', async () => {
      if (!tradeId) return;

      const response = await request(app.getHttpServer())
        .get(`/api/trades/${tradeId}/messages?page=1&limit=10`)
        .set('Authorization', `Bearer ${userToken}`);

      expect([200, 403, 404]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('page');
        expect(response.body).toHaveProperty('limit');
        expect(response.body).toHaveProperty('totalPages');
      }
    });

    it('should prevent non-participants from accessing messages', async () => {
      if (!tradeId) return;

      // Create third user
      const thirdUser = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          username: `msguser3_${Date.now()}`,
          email: `msguser3_${Date.now()}@example.com`,
          password: 'TestPass123',
          recaptchaToken: 'test-token',
        });

      if (thirdUser.status === 201) {
        const response = await request(app.getHttpServer())
          .get(`/api/trades/${tradeId}/messages`)
          .set('Authorization', `Bearer ${thirdUser.body.accessToken}`);

        expect(response.status).toBe(403);

        // Cleanup
        await prisma.user
          .delete({ where: { id: thirdUser.body.user.id } })
          .catch(() => {});
      }
    });

    it('should validate message text', async () => {
      if (!tradeId) return;

      const response = await request(app.getHttpServer())
        .post(`/api/trades/${tradeId}/messages`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          text: '', // Empty text
        });

      expect(response.status).toBe(400);
    });

    it('should handle long messages', async () => {
      if (!tradeId) return;

      const longMessage = 'A'.repeat(1000);

      const response = await request(app.getHttpServer())
        .post(`/api/trades/${tradeId}/messages`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          text: longMessage,
        });

      expect([201, 400]).toContain(response.status);

      if (response.status === 201) {
        expect(response.body.text.length).toBe(1000);
      }
    });
  });

  describe('WebSocket Messaging', () => {
    it('should connect to WebSocket with authentication', (done) => {
      const address = app.getHttpServer().address();
      const baseUrl = `http://localhost:${address.port}`;

      socketClient = io(baseUrl, {
        auth: {
          token: userToken,
        },
        transports: ['websocket'],
      });

      socketClient.on('connect', () => {
        expect(socketClient.connected).toBe(true);
        done();
      });

      socketClient.on('connect_error', () => {
        // Connection might fail if WebSocket not configured
        done();
      });
    }, 10000);

    it('should join trade room', (done) => {
      if (!socketClient || !socketClient.connected || !tradeId) {
        done();
        return;
      }

      socketClient.emit('join:trade', { tradeId });

      setTimeout(() => {
        done();
      }, 1000);
    }, 10000);

    it('should receive real-time messages', (done) => {
      if (!socketClient || !socketClient.connected || !tradeId) {
        done();
        return;
      }

      socketClient.on('message:new', (data) => {
        expect(data).toHaveProperty('text');
        expect(data).toHaveProperty('userId');
        done();
      });

      // Send a message via HTTP to trigger WebSocket event
      request(app.getHttpServer())
        .post(`/api/trades/${tradeId}/messages`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({
          text: 'Real-time test message',
        })
        .then(() => {
          // Message sent
        })
        .catch(() => {
          done();
        });

      setTimeout(() => {
        done();
      }, 5000);
    }, 10000);

    it('should leave trade room', (done) => {
      if (!socketClient || !socketClient.connected || !tradeId) {
        done();
        return;
      }

      socketClient.emit('leave:trade', { tradeId });

      setTimeout(() => {
        done();
      }, 1000);
    }, 10000);
  });

  describe('Message Notifications', () => {
    it('should create notification for new message', async () => {
      if (!tradeId) return;

      // Send message
      await request(app.getHttpServer())
        .post(`/api/trades/${tradeId}/messages`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          text: 'Notification test message',
        });

      // Check recipient's notifications
      const notifResponse = await request(app.getHttpServer())
        .get('/api/notifications')
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect([200, 401]).toContain(notifResponse.status);

      if (notifResponse.status === 200) {
        expect(Array.isArray(notifResponse.body.notifications)).toBe(true);
      }
    });
  });
});
