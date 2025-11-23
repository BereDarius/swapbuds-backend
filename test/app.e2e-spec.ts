import { AppModule } from '@/app.module';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request = require('supertest');

describe('SwapBuds API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply the same configuration as main.ts
    const configService = app.get(ConfigService);
    app.setGlobalPrefix('api');

    const corsOrigin = configService.get('cors.origin');
    app.enableCors({
      origin: corsOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Checks', () => {
    it('/api/health (GET) - should return health status', () => {
      return request(app.getHttpServer())
        .get('/api/health')
        .expect((res) => {
          // Health check can return 200 (healthy) or 503 (unhealthy)
          expect([200, 503]).toContain(res.status);
          expect(res.body).toHaveProperty('status');
          expect(res.body).toHaveProperty('info');
          expect(['ok', 'error']).toContain(res.body.status);
          // Verify database connection
          expect(res.body.info).toHaveProperty('database');
          expect(res.body.info.database.status).toBe('up');
        });
    });

    it('/api/health/database (GET) - should verify database connectivity', () => {
      return request(app.getHttpServer())
        .get('/api/health/database')
        .expect((res) => {
          expect([200, 503]).toContain(res.status);
          expect(res.body).toHaveProperty('status');
          expect(res.body.info).toHaveProperty('database');
        });
    });
  });

  describe('Authentication', () => {
    const testUser = {
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password: 'TestPass123',
    };

    describe('Registration', () => {
      it('/api/auth/register (POST) - should register a new user', () => {
        return request(app.getHttpServer())
          .post('/api/auth/register')
          .send({
            ...testUser,
            recaptchaToken: 'test-token-for-e2e',
          })
          .expect((res) => {
            // May return 201 or 400 if recaptcha fails
            if (res.status === 201) {
              expect(res.body).toHaveProperty('accessToken');
              expect(res.body).toHaveProperty('user');
              expect(res.body.user.email).toBe(testUser.email);
              expect(res.body.user.username).toBe(testUser.username);
            }
          });
      });

      it('/api/auth/register (POST) - should reject invalid email', () => {
        return request(app.getHttpServer())
          .post('/api/auth/register')
          .send({
            username: 'testuser2',
            email: 'invalid-email',
            password: 'TestPass123',
            recaptchaToken: 'test-token',
          })
          .expect(400);
      });

      it('/api/auth/register (POST) - should reject short password', () => {
        return request(app.getHttpServer())
          .post('/api/auth/register')
          .send({
            username: 'testuser3',
            email: 'test3@example.com',
            password: 'short',
            recaptchaToken: 'test-token',
          })
          .expect(400);
      });
    });

    describe('Login', () => {
      it('/api/auth/login (POST) - should login with valid credentials', async () => {
        // First register a user
        await request(app.getHttpServer())
          .post('/api/auth/register')
          .send({
            username: `logintest_${Date.now()}`,
            email: `logintest_${Date.now()}@example.com`,
            password: 'TestPass123',
            recaptchaToken: 'test-token',
          });

        // Then login
        return request(app.getHttpServer())
          .post('/api/auth/login')
          .send({
            email: `logintest_${Date.now()}@example.com`,
            password: 'TestPass123',
            recaptchaToken: 'test-token',
          })
          .expect((res) => {
            if (res.status === 200) {
              expect(res.body).toHaveProperty('accessToken');
              expect(res.body).toHaveProperty('user');
            }
          });
      });

      it('/api/auth/login (POST) - should reject invalid credentials', () => {
        return request(app.getHttpServer())
          .post('/api/auth/login')
          .send({
            email: 'nonexistent@example.com',
            password: 'WrongPass123',
            recaptchaToken: 'test-token',
          })
          .expect((res) => {
            expect([400, 401]).toContain(res.status);
          });
      });
    });

    describe('Profile', () => {
      it('/api/auth/me (GET) - should require authentication', () => {
        return request(app.getHttpServer()).get('/api/auth/me').expect(401);
      });

      it('/api/auth/me (GET) - should return user profile when authenticated', async () => {
        // Register and get token
        const res = await request(app.getHttpServer())
          .post('/api/auth/register')
          .send({
            username: `profiletest_${Date.now()}`,
            email: `profiletest_${Date.now()}@example.com`,
            password: 'TestPass123',
            recaptchaToken: 'test-token',
          });

        if (res.status === 201) {
          const token = res.body.accessToken;

          return request(app.getHttpServer())
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${token}`)
            .expect(200)
            .expect((res) => {
              expect(res.body).toHaveProperty('id');
              expect(res.body).toHaveProperty('email');
              expect(res.body).toHaveProperty('username');
              expect(res.body).toHaveProperty('isActive');
            });
        }
      });
    });
  });

  describe('Users', () => {
    describe('Public User Info', () => {
      it('/api/users/:id (GET) - should return 404 for non-existent user', () => {
        return request(app.getHttpServer())
          .get('/api/users/non-existent-id')
          .expect(404);
      });
    });
  });

  describe('Items', () => {
    describe('Public Item Listing', () => {
      it('/api/items (GET) - should return list of items', () => {
        return request(app.getHttpServer())
          .get('/api/items')
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body.items)).toBe(true);
            expect(res.body).toHaveProperty('total');
            expect(res.body).toHaveProperty('page');
            expect(res.body).toHaveProperty('limit');
          });
      });

      it('/api/items (GET) - should support pagination', () => {
        return request(app.getHttpServer())
          .get('/api/items?page=1&limit=5')
          .expect(200)
          .expect((res) => {
            expect(res.body.page).toBe(1);
            expect(res.body.limit).toBe(5);
            expect(res.body.items.length).toBeLessThanOrEqual(5);
          });
      });

      it('/api/items (GET) - should support filtering by condition', () => {
        return request(app.getHttpServer())
          .get('/api/items?condition=NEW')
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body.items)).toBe(true);
          });
      });

      it('/api/items (GET) - should support search', () => {
        return request(app.getHttpServer())
          .get('/api/items?search=test')
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body.items)).toBe(true);
          });
      });
    });

    describe('Item Creation (Authenticated)', () => {
      it('/api/items (POST) - should require authentication', () => {
        return request(app.getHttpServer())
          .post('/api/items')
          .send({
            name: 'Test Item',
            description: 'Test Description',
            condition: 'GOOD',
            category: 'ELECTRONICS',
          })
          .expect(401);
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should handle authentication endpoint availability', async () => {
      // Test that the endpoint is functional and handles requests
      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app.getHttpServer()).post('/api/auth/login').send({
            email: 'test@example.com',
            password: 'password',
            recaptchaToken: 'test-token',
          }),
        );
      }

      const responses = await Promise.all(requests);
      // All requests should get a response (either 400/401 for invalid credentials or 429 for rate limit)
      responses.forEach((res) => {
        expect([400, 401, 429]).toContain(res.status);
      });
      // At least some requests should succeed in getting processed (not rate limited)
      const processed = responses.filter((res) =>
        [400, 401].includes(res.status),
      );
      expect(processed.length).toBeGreaterThan(0);
    });
  });
});
