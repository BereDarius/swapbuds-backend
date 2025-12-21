import { PrismaService } from '@/prisma/prisma.service';
import { mockPrismaService } from '@/test/mocks/prisma.mock';
import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AdminRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import { AdminAuthService } from './admin-auth.service';

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// Mock otplib
jest.mock('otplib', () => ({
  authenticator: {
    generate: jest.fn(),
    generateSecret: jest.fn(),
    verify: jest.fn(),
    keyuri: jest.fn(),
  },
}));

describe('AdminAuthService', () => {
  let service: AdminAuthService;

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'jwt.adminSecret') return 'test-admin-secret';
      if (key === 'jwt.adminExpiresIn') return '8h';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AdminAuthService>(AdminAuthService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a new admin user successfully', async () => {
      const registerDto = {
        email: 'admin@swapbuds.com',
        username: 'admin_user',
        password: 'SecurePass123!',
        role: AdminRole.ADMIN,
      };

      mockPrismaService.adminUser.findUnique.mockResolvedValue(null);
      mockPrismaService.adminUser.findFirst.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue('hashed_password' as never);

      const createdAdmin = {
        id: 'admin-1',
        email: registerDto.email,
        username: registerDto.username,
        password: 'hashed_password',
        role: registerDto.role,
        isActive: true,
        mfaEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
        avatarUrl: null,
        createdBy: null,
      };

      mockPrismaService.adminUser.create.mockResolvedValue(createdAdmin);

      const result = await service.register(registerDto, 'existing-admin-1');

      expect(result).toEqual(createdAdmin);

      expect(mockPrismaService.adminUser.create).toHaveBeenCalledWith({
        data: {
          email: registerDto.email,
          username: registerDto.username,
          password: 'hashed_password',
          role: registerDto.role,
          isActive: true,
          mfaEnabled: false,
          createdBy: 'existing-admin-1',
        },
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          createdAt: true,
          createdBy: true,
        },
      });
    });

    it('should throw ConflictException if email already exists', async () => {
      const registerDto = {
        email: 'admin@swapbuds.com',
        username: 'admin_user',
        password: 'SecurePass123!',
        role: AdminRole.ADMIN,
      };

      mockPrismaService.adminUser.findUnique.mockResolvedValue({
        id: 'existing-admin',
      } as any);

      await expect(service.register(registerDto, 'creator-id')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException if username already exists', async () => {
      const registerDto = {
        email: 'admin@swapbuds.com',
        username: 'admin_user',
        password: 'SecurePass123!',
        role: AdminRole.ADMIN,
      };

      mockPrismaService.adminUser.findUnique
        .mockResolvedValueOnce(null) // email check
        .mockResolvedValueOnce({ id: 'existing-admin' } as any); // username check

      await expect(service.register(registerDto, 'creator-id')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('login', () => {
    it('should login admin without MFA successfully', async () => {
      const loginDto = {
        email: 'admin@swapbuds.com',
        password: 'SecurePass123!',
      };

      const adminUser = {
        id: 'admin-1',
        email: loginDto.email,
        username: 'admin_user',
        password: 'hashed_password',
        role: AdminRole.ADMIN,
        isActive: true,
        mfaEnabled: false,
        mfaSecret: null,
      };

      mockPrismaService.adminUser.findUnique.mockResolvedValue(adminUser);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      mockJwtService.sign.mockReturnValue('jwt_token');
      mockPrismaService.adminUser.update.mockResolvedValue({
        ...adminUser,
        lastLoginAt: new Date(),
      });

      const result = await service.login(loginDto);

      expect(result).toEqual({
        accessToken: 'jwt_token',
        adminUser: {
          id: adminUser.id,
          email: adminUser.email,
          username: adminUser.username,
          role: adminUser.role,
          mfaEnabled: false,
        },
      });

      expect(mockPrismaService.adminUser.update).toHaveBeenCalledWith({
        where: { id: adminUser.id },
        data: { lastLoginAt: expect.any(Date) },
      });
    });

    it('should login admin with MFA successfully', async () => {
      const loginDto = {
        email: 'admin@swapbuds.com',
        password: 'SecurePass123!',
        mfaCode: '123456',
      };

      const adminUser = {
        id: 'admin-1',
        email: loginDto.email,
        username: 'admin_user',
        password: 'hashed_password',
        role: AdminRole.ADMIN,
        isActive: true,
        mfaEnabled: true,
        mfaSecret: {
          secret: 'mfa_secret',
        },
      };

      mockPrismaService.adminUser.findUnique.mockResolvedValue(adminUser);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      (authenticator.verify as jest.Mock).mockReturnValue(true);
      mockJwtService.sign.mockReturnValue('jwt_token');
      mockPrismaService.adminUser.update.mockResolvedValue({
        ...adminUser,
        lastLoginAt: new Date(),
      });

      const result = await service.login(loginDto);

      expect(result.accessToken).toBe('jwt_token');
      expect(authenticator.verify).toHaveBeenCalledWith({
        token: loginDto.mfaCode,
        secret: adminUser.mfaSecret.secret,
      });
    });

    it('should throw UnauthorizedException if email not found', async () => {
      mockPrismaService.adminUser.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nonexistent@test.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if admin is inactive', async () => {
      const adminUser = {
        id: 'admin-1',
        email: 'admin@swapbuds.com',
        isActive: false,
      };

      mockPrismaService.adminUser.findUnique.mockResolvedValue(
        adminUser as any,
      );

      await expect(
        service.login({ email: 'admin@swapbuds.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      const adminUser = {
        id: 'admin-1',
        email: 'admin@swapbuds.com',
        password: 'hashed_password',
        isActive: true,
        mfaEnabled: false,
      };

      mockPrismaService.adminUser.findUnique.mockResolvedValue(
        adminUser as any,
      );
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(
        service.login({ email: 'admin@swapbuds.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if MFA code is missing when required', async () => {
      const adminUser = {
        id: 'admin-1',
        email: 'admin@swapbuds.com',
        password: 'hashed_password',
        isActive: true,
        mfaEnabled: true,
        mfaSecret: { secret: 'mfa_secret' },
      };

      mockPrismaService.adminUser.findUnique.mockResolvedValue(
        adminUser as any,
      );
      mockedBcrypt.compare.mockResolvedValue(true as never);

      await expect(
        service.login({ email: 'admin@swapbuds.com', password: 'pass' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException if MFA code is invalid', async () => {
      const loginDto = {
        email: 'admin@swapbuds.com',
        password: 'SecurePass123!',
        mfaCode: '000000',
      };

      const adminUser = {
        id: 'admin-1',
        email: loginDto.email,
        password: 'hashed_password',
        isActive: true,
        mfaEnabled: true,
        mfaSecret: { secret: 'mfa_secret' },
      };

      mockPrismaService.adminUser.findUnique.mockResolvedValue(
        adminUser as any,
      );
      mockedBcrypt.compare.mockResolvedValue(true as never);
      (authenticator.verify as jest.Mock).mockReturnValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('setupMFA', () => {
    it('should generate MFA secret and QR code successfully', async () => {
      const adminId = 'admin-1';
      const adminUser = {
        id: adminId,
        email: 'admin@swapbuds.com',
        username: 'admin_user',
        mfaEnabled: false,
        mfaSecret: null,
      };

      mockPrismaService.adminUser.findUnique.mockResolvedValue(
        adminUser as any,
      );
      (authenticator.generateSecret as jest.Mock).mockReturnValue('new_secret');
      (authenticator.keyuri as jest.Mock).mockReturnValue(
        'otpauth://totp/SwapBuds:admin_user?secret=new_secret&issuer=SwapBuds%20Admin',
      );

      mockPrismaService.adminMFASecret.create.mockResolvedValue({
        id: 'mfa-1',
        adminUserId: adminId,
        secret: 'new_secret',
        createdAt: new Date(),
      });

      const result = await service.setupMFA(adminId);

      expect(result).toEqual({
        secret: 'new_secret',
        qrCodeUri: expect.stringContaining('otpauth://totp/SwapBuds'),
      });

      expect(mockPrismaService.adminMFASecret.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if MFA already set up', async () => {
      const adminUser = {
        id: 'admin-1',
        mfaSecret: { secret: 'existing_secret' },
      };

      mockPrismaService.adminUser.findUnique.mockResolvedValue(
        adminUser as any,
      );

      await expect(service.setupMFA('admin-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('verifyAndEnableMFA', () => {
    it('should verify MFA code and enable MFA successfully', async () => {
      const adminId = 'admin-1';
      const mfaCode = '123456';

      const adminUser = {
        id: adminId,
        mfaEnabled: false,
        mfaSecret: { secret: 'mfa_secret' },
      };

      mockPrismaService.adminUser.findUnique.mockResolvedValue(
        adminUser as any,
      );
      (authenticator.verify as jest.Mock).mockReturnValue(true);
      mockPrismaService.adminUser.update.mockResolvedValue({
        ...adminUser,
        mfaEnabled: true,
      });

      const result = await service.verifyAndEnableMFA(adminId, mfaCode);

      expect(result).toEqual({ message: 'MFA enabled successfully' });
      expect(mockPrismaService.adminUser.update).toHaveBeenCalledWith({
        where: { id: adminId },
        data: { mfaEnabled: true },
      });
    });

    it('should throw BadRequestException if MFA code is invalid', async () => {
      const adminUser = {
        id: 'admin-1',
        mfaEnabled: false,
        mfaSecret: { secret: 'mfa_secret' },
      };

      mockPrismaService.adminUser.findUnique.mockResolvedValue(
        adminUser as any,
      );
      (authenticator.verify as jest.Mock).mockReturnValue(false);

      await expect(
        service.verifyAndEnableMFA('admin-1', '000000'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if MFA secret not found', async () => {
      const adminUser = {
        id: 'admin-1',
        mfaEnabled: false,
        mfaSecret: null,
      };

      mockPrismaService.adminUser.findUnique.mockResolvedValue(
        adminUser as any,
      );

      await expect(
        service.verifyAndEnableMFA('admin-1', '123456'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
