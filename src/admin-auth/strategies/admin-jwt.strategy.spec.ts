import { PrismaService } from '@/prisma/prisma.service';
import { mockConfigService, resetConfigMocks } from '@/test/mocks/config.mock';
import { mockPrismaService } from '@/test/mocks/prisma.mock';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AdminRole } from '@prisma/client';
import { AdminJwtPayload, AdminJwtStrategy } from './admin-jwt.strategy';

describe('AdminJwtStrategy', () => {
  let strategy: AdminJwtStrategy;
  let prismaService: PrismaService;
  let configService: ConfigService;

  beforeEach(async () => {
    // Reset mocks before each test
    resetConfigMocks();
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'jwt.adminSecret') return 'test-admin-secret';
      if (key === 'jwt.secret') return 'test-fallback-secret';
      return null;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminJwtStrategy,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    strategy = module.get<AdminJwtStrategy>(AdminJwtStrategy);
    prismaService = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should validate and return admin user for valid payload', async () => {
      const payload: AdminJwtPayload = {
        sub: 'admin-1',
        email: 'admin@swapbuds.com',
        username: 'admin',
        role: AdminRole.ADMIN,
      };

      const mockAdminUser = {
        id: 'admin-1',
        email: 'admin@swapbuds.com',
        username: 'admin',
        avatarUrl: null,
        role: AdminRole.ADMIN,
        isActive: true,
        mfaEnabled: false,
      };

      mockPrismaService.adminUser.findUnique.mockResolvedValue(mockAdminUser);

      const result = await strategy.validate(payload);

      expect(result).toEqual(mockAdminUser);
      expect(prismaService.adminUser.findUnique).toHaveBeenCalledWith({
        where: { id: 'admin-1' },
        select: {
          id: true,
          email: true,
          username: true,
          avatarUrl: true,
          role: true,
          isActive: true,
          mfaEnabled: true,
        },
      });
    });

    it('should validate MODERATOR admin', async () => {
      const payload: AdminJwtPayload = {
        sub: 'admin-2',
        email: 'mod@swapbuds.com',
        username: 'moderator',
        role: AdminRole.MODERATOR,
      };

      const mockAdminUser = {
        id: 'admin-2',
        email: 'mod@swapbuds.com',
        username: 'moderator',
        avatarUrl: 'https://example.com/avatar.jpg',
        role: AdminRole.MODERATOR,
        isActive: true,
        mfaEnabled: true,
      };

      mockPrismaService.adminUser.findUnique.mockResolvedValue(mockAdminUser);

      const result = await strategy.validate(payload);

      expect(result).toEqual(mockAdminUser);
      expect(prismaService.adminUser.findUnique).toHaveBeenCalledWith({
        where: { id: 'admin-2' },
        select: {
          id: true,
          email: true,
          username: true,
          avatarUrl: true,
          role: true,
          isActive: true,
          mfaEnabled: true,
        },
      });
    });

    it('should validate SUPPORT admin', async () => {
      const payload: AdminJwtPayload = {
        sub: 'admin-3',
        email: 'support@swapbuds.com',
        username: 'support',
        role: AdminRole.SUPPORT,
      };

      const mockAdminUser = {
        id: 'admin-3',
        email: 'support@swapbuds.com',
        username: 'support',
        avatarUrl: null,
        role: AdminRole.SUPPORT,
        isActive: true,
        mfaEnabled: true,
      };

      mockPrismaService.adminUser.findUnique.mockResolvedValue(mockAdminUser);

      const result = await strategy.validate(payload);

      expect(result).toEqual(mockAdminUser);
    });

    it('should throw UnauthorizedException when admin not found', async () => {
      const payload: AdminJwtPayload = {
        sub: 'nonexistent-admin',
        email: 'fake@swapbuds.com',
        username: 'fake',
        role: AdminRole.ADMIN,
      };

      mockPrismaService.adminUser.findUnique.mockResolvedValue(null);

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(payload)).rejects.toThrow(
        'Admin user not found or inactive',
      );
    });

    it('should throw UnauthorizedException when admin is inactive', async () => {
      const payload: AdminJwtPayload = {
        sub: 'admin-4',
        email: 'inactive@swapbuds.com',
        username: 'inactive',
        role: AdminRole.ADMIN,
      };

      const mockInactiveAdmin = {
        id: 'admin-4',
        email: 'inactive@swapbuds.com',
        username: 'inactive',
        avatarUrl: null,
        role: AdminRole.ADMIN,
        isActive: false,
        mfaEnabled: false,
      };

      mockPrismaService.adminUser.findUnique.mockResolvedValue(
        mockInactiveAdmin,
      );

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(payload)).rejects.toThrow(
        'Admin user not found or inactive',
      );
    });

    it('should throw UnauthorizedException when database query fails', async () => {
      const payload: AdminJwtPayload = {
        sub: 'admin-5',
        email: 'error@swapbuds.com',
        username: 'error',
        role: AdminRole.ADMIN,
      };

      mockPrismaService.adminUser.findUnique.mockRejectedValue(
        new Error('Database connection error'),
      );

      await expect(strategy.validate(payload)).rejects.toThrow(
        'Database connection error',
      );
    });

    it('should validate admin with MFA enabled', async () => {
      const payload: AdminJwtPayload = {
        sub: 'admin-6',
        email: 'secure@swapbuds.com',
        username: 'secure',
        role: AdminRole.ADMIN,
      };

      const mockAdminUser = {
        id: 'admin-6',
        email: 'secure@swapbuds.com',
        username: 'secure',
        avatarUrl: 'https://example.com/secure.jpg',
        role: AdminRole.ADMIN,
        isActive: true,
        mfaEnabled: true,
      };

      mockPrismaService.adminUser.findUnique.mockResolvedValue(mockAdminUser);

      const result = await strategy.validate(payload);

      expect(result).toEqual(mockAdminUser);
      expect(result.mfaEnabled).toBe(true);
    });

    it('should call prisma with correct admin ID', async () => {
      const payload: AdminJwtPayload = {
        sub: 'specific-admin-id-123',
        email: 'test@swapbuds.com',
        username: 'test',
        role: AdminRole.MODERATOR,
      };

      const mockAdminUser = {
        id: 'specific-admin-id-123',
        email: 'test@swapbuds.com',
        username: 'test',
        avatarUrl: null,
        role: AdminRole.MODERATOR,
        isActive: true,
        mfaEnabled: false,
      };

      mockPrismaService.adminUser.findUnique.mockResolvedValue(mockAdminUser);

      await strategy.validate(payload);

      expect(prismaService.adminUser.findUnique).toHaveBeenCalledWith({
        where: { id: 'specific-admin-id-123' },
        select: expect.any(Object),
      });
    });
  });

  describe('constructor', () => {
    it('should use admin secret from config', () => {
      expect(configService.get).toHaveBeenCalledWith('jwt.adminSecret');
    });

    it('should fallback to regular jwt secret if admin secret not available', async () => {
      resetConfigMocks();
      const mockConfigFallback = {
        get: jest.fn((key: string) => {
          if (key === 'jwt.adminSecret') return null;
          if (key === 'jwt.secret') return 'fallback-secret';
          return null;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AdminJwtStrategy,
          {
            provide: PrismaService,
            useValue: mockPrismaService,
          },
          {
            provide: ConfigService,
            useValue: mockConfigFallback,
          },
        ],
      }).compile();

      const newStrategy = module.get<AdminJwtStrategy>(AdminJwtStrategy);

      expect(newStrategy).toBeDefined();
      expect(mockConfigFallback.get).toHaveBeenCalledWith('jwt.adminSecret');
      expect(mockConfigFallback.get).toHaveBeenCalledWith('jwt.secret');
    });
  });
});
