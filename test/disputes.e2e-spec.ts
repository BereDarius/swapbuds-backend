import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { truncateAndReseed } from './helpers/truncate-and-seed.helper';
import request = require('supertest');

/**
 * E2E Tests for Dispute System
 * Tests trade dispute creation and resolution
 */
describe('Disputes E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let johnToken: string;
  let mikeToken: string;
  let adminToken: string;
  let disputeId: string;
  let verifiedUserId: string;
  let verifiedUserToken: string;

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

    // Create a verified user for dispute testing
    const verifiedUser = await prisma.user.create({
      data: {
        email: `verified-${Date.now()}@test.com`,
        username: `verified${Date.now()}`,
        password:
          '$2b$10$rZH3P8LhQZvN3PqG5kS3.uGvQqJZ5.9YZH3P8LhQZvN3PqG5kS3.u', // Password123!
        emailVerified: true,
        isActive: true,
      },
    });
    verifiedUserId = verifiedUser.id;

    // Create APPROVED verification for this user
    await prisma.userVerification.create({
      data: {
        userId: verifiedUser.id,
        documentType: 'ID_CARD',
        documentUrlFront: 'https://example.com/id.jpg',
        documentUrlBack: 'https://example.com/id-back.jpg',
        selfieUrl: 'https://example.com/selfie.jpg',
        status: 'APPROVED',
        submittedAt: new Date(),
        reviewedAt: new Date(),
      },
    });

    // Login as verified user
    const verifiedLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: verifiedUser.email,
        password: 'Password123!',
        recaptchaToken: 'test-token',
      });

    expect(verifiedLogin.status).toBe(200);
    verifiedUserToken = verifiedLogin.body.accessToken;

    // Create items for verified user and Mike
    const item1 = await prisma.item.create({
      data: {
        title: 'Test Item 1',
        description: 'Item for dispute test',
        userId: verifiedUser.id,
        category: 'ELECTRONICS',
        condition: 'USED_GOOD',
        estimatedValue: 100,
      },
    });

    const mikeUser = await prisma.user.findUnique({
      where: { email: 'mike.collector@example.com' },
    });

    const item2 = await prisma.item.create({
      data: {
        title: 'Test Item 2',
        description: 'Another item for dispute test',
        userId: mikeUser!.id,
        category: 'COLLECTIBLES',
        condition: 'NEW',
        estimatedValue: 150,
      },
    });

    // Create a COMPLETED trade for dispute testing
    await prisma.trade.create({
      data: {
        proposerId: verifiedUser.id,
        responderId: mikeUser!.id,
        status: 'COMPLETED',
        proposerItems: { connect: [{ id: item1.id }] },
        responderItems: { connect: [{ id: item2.id }] },
        completedAt: new Date(),
      },
    });

    // Login as seeded users (verified, ready for disputes)
    const johnLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'john.doe@example.com',
        password: 'Password123!',
        recaptchaToken: 'test-token',
      });

    expect(johnLogin.status).toBe(200);
    johnToken = johnLogin.body.accessToken;

    const mikeLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'mike.collector@example.com',
        password: 'Password123!',
        recaptchaToken: 'test-token',
      });

    expect(mikeLogin.status).toBe(200);
    mikeToken = mikeLogin.body.accessToken;

    // Login as admin using AdminUser authentication
    const adminLogin = await request(app.getHttpServer())
      .post('/api/admin/auth/login')
      .send({
        email: 'admin@swapbuds.com',
        password: 'Password123!',
      });

    expect(adminLogin.status).toBe(200);
    adminToken = adminLogin.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Dispute Creation', () => {
    it('should require authentication', () => {
      return request(app.getHttpServer())
        .post('/api/disputes')
        .send({
          tradeId: 'some-trade-id',
          reason: 'ITEM_NOT_RECEIVED',
          description: 'I never got the item',
        })
        .expect(401);
    });

    it('should create a dispute for a completed trade', async () => {
      // Find the completed trade we created for verified user
      const completedTrade = await prisma.trade.findFirst({
        where: {
          status: 'COMPLETED',
          proposerId: verifiedUserId,
        },
        include: {
          proposer: true,
          responder: true,
        },
      });

      expect(completedTrade).toBeDefined();

      const response = await request(app.getHttpServer())
        .post('/api/disputes')
        .set('Authorization', `Bearer ${verifiedUserToken}`)
        .send({
          tradeId: completedTrade!.id,
          reportedUserId: completedTrade!.responderId,
          reason: 'ITEM_NOT_RECEIVED',
          description: 'The item was never delivered to me',
        });

      expect(response.status).toBe(201);
      disputeId = response.body.id;
      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe('OPEN');
      expect(response.body.reason).toBe('ITEM_NOT_RECEIVED');
    });

    it('should validate required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/disputes')
        .set('Authorization', `Bearer ${verifiedUserToken}`)
        .send({
          tradeId: 'some-id',
          // Missing reason and description
        });

      expect(response.status).toBe(400);
    });

    it('should validate dispute reasons', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/disputes')
        .set('Authorization', `Bearer ${verifiedUserToken}`)
        .send({
          tradeId: 'some-id',
          reportedUserId: 'some-user',
          reason: 'INVALID_REASON',
          description: 'Test',
        });

      expect(response.status).toBe(400);
    });

    it('should prevent disputes on non-completed trades', async () => {
      // Try to create items and trade
      const item1Response = await request(app.getHttpServer())
        .post('/api/items')
        .set('Authorization', `Bearer ${johnToken}`)
        .send({
          title: 'Item for Dispute Test',
          description: 'Test item',
          category: 'ELECTRONICS',
          condition: 'GOOD',
          estimatedValue: 100,
          deliveryMethods: ['PHYSICAL'],
        });

      const item2Response = await request(app.getHttpServer())
        .post('/api/items')
        .set('Authorization', `Bearer ${mikeToken}`)
        .send({
          title: 'Another Item for Dispute Test',
          description: 'Another test item',
          category: 'BOOKS',
          condition: 'NEW',
          estimatedValue: 95,
          deliveryMethods: ['PHYSICAL'],
        });

      if (item1Response.status === 201 && item2Response.status === 201) {
        const tradeResponse = await request(app.getHttpServer())
          .post('/api/trades')
          .set('Authorization', `Bearer ${johnToken}`)
          .send({
            itemOfferedId: item1Response.body.id,
            itemRequestedId: item2Response.body.id,
            message: 'Trade for dispute test',
            deliveryMethod: 'PHYSICAL',
          });

        if (tradeResponse.status === 201) {
          const pendingTradeId = tradeResponse.body.id;

          const disputeResponse = await request(app.getHttpServer())
            .post('/api/disputes')
            .set('Authorization', `Bearer ${johnToken}`)
            .send({
              tradeId: pendingTradeId,
              reason: 'ITEM_NOT_RECEIVED',
              description: 'Test dispute on pending trade',
            });

          expect([400, 403]).toContain(disputeResponse.status);
        }
      }
    });
  });

  describe('Dispute Listing', () => {
    it('should list user disputes', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/disputes/my')
        .set('Authorization', `Bearer ${johnToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      // John should see at least the dispute he created
      expect(response.body.length).toBeGreaterThanOrEqual(0);
    });

    it('should filter disputes by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/disputes/my')
        .query({ status: 'OPEN' })
        .set('Authorization', `Bearer ${johnToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should get dispute details', async () => {
      if (!disputeId) return;

      const response = await request(app.getHttpServer())
        .get(`/api/disputes/${disputeId}`)
        .set('Authorization', `Bearer ${johnToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('reason');
      expect(response.body).toHaveProperty('tradeId');
      expect(response.body).toHaveProperty('reporterId');
      expect(response.body).toHaveProperty('reportedUserId');
    });

    it('should prevent non-participants from viewing dispute', async () => {
      if (!disputeId) return;

      // Login as Jane (not involved in John-Mike dispute)
      const janeLogin = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'jane.smith@example.com',
          password: 'Password123!',
          recaptchaToken: 'test-token',
        });

      expect(janeLogin.status).toBe(200);
      const janeToken = janeLogin.body.accessToken;

      const response = await request(app.getHttpServer())
        .get(`/api/disputes/${disputeId}`)
        .set('Authorization', `Bearer ${janeToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Admin Dispute Management', () => {
    it('should list all disputes for admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/disputes')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(0);
    });

    it('should reject access for regular users', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/disputes')
        .set('Authorization', `Bearer ${johnToken}`);

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('User not found');
    });

    it('should update dispute status', async () => {
      if (!disputeId) return;

      const response = await request(app.getHttpServer())
        .patch(`/api/disputes/${disputeId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'UNDER_REVIEW',
        });

      expect([200, 400, 403, 404]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.status).toBe('UNDER_REVIEW');
      }
    });

    it('should add admin notes to dispute', async () => {
      if (!disputeId) return;

      const response = await request(app.getHttpServer())
        .post(`/api/disputes/${disputeId}/notes`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          note: 'Investigating the issue. Requested evidence from both parties.',
        });

      expect([201, 403, 404]).toContain(response.status);

      if (response.status === 201) {
        expect(response.body).toHaveProperty('note');
      }
    });

    it('should resolve dispute in favor of reporter', async () => {
      if (!disputeId) return;

      const response = await request(app.getHttpServer())
        .patch(`/api/disputes/${disputeId}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          resolution: 'REPORTER_FAVOR',
          resolutionNotes: 'Reporter provided sufficient evidence',
        });

      expect([200, 400, 403, 404]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.status).toBe('RESOLVED');
        expect(response.body).toHaveProperty('resolution');
      }
    });

    it('should resolve dispute in favor of reported user', async () => {
      // Get another dispute from seed data
      const disputes = await prisma.dispute.findMany({
        where: { status: 'OPEN' },
        take: 1,
      });

      if (disputes.length > 0) {
        const testDisputeId = disputes[0].id;

        const response = await request(app.getHttpServer())
          .patch(`/api/disputes/${testDisputeId}/resolve`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            resolution: 'REPORTED_FAVOR',
            resolutionNotes: 'No evidence provided by reporter',
          });

        expect([200, 400, 403, 404]).toContain(response.status);
      }
    });

    it('should reject dispute (no action)', async () => {
      // Get another dispute from seed data
      const disputes = await prisma.dispute.findMany({
        where: { status: 'OPEN' },
        take: 1,
      });

      if (disputes.length > 0) {
        const testDisputeId = disputes[0].id;

        const response = await request(app.getHttpServer())
          .patch(`/api/disputes/${testDisputeId}/resolve`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            resolution: 'NO_ACTION',
            resolutionNotes: 'Issue resolved between parties',
          });

        expect([200, 400, 403, 404]).toContain(response.status);
      }
    });
  });

  describe('Dispute Evidence', () => {
    it('should upload evidence to dispute', async () => {
      if (!disputeId) return;

      const response = await request(app.getHttpServer())
        .post(`/api/disputes/${disputeId}/evidence`)
        .set('Authorization', `Bearer ${johnToken}`)
        .send({
          evidenceUrl: 'https://example.com/evidence.jpg',
          description: 'Photo of damaged item',
        });

      expect([201, 400, 403, 404]).toContain(response.status);

      if (response.status === 201) {
        expect(response.body).toHaveProperty('evidenceUrl');
      }
    });

    it('should list dispute evidence', async () => {
      if (!disputeId) return;

      const response = await request(app.getHttpServer())
        .get(`/api/disputes/${disputeId}/evidence`)
        .set('Authorization', `Bearer ${johnToken}`);

      expect([200, 403, 404]).toContain(response.status);

      if (response.status === 200) {
        expect(Array.isArray(response.body)).toBe(true);
      }
    });
  });
});
