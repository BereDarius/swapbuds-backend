import { OAuthService } from '@/auth/oauth.service';
import { PrismaService } from '@/prisma/prisma.service';
import {
  mockAppleOAuthCallbackData,
  mockFacebookOAuthCallbackData,
  mockOAuthCallbackData,
} from '@/test/fixtures/oauth.fixture';
import { mockUser } from '@/test/fixtures/user.fixture';
import { mockConfigService } from '@/test/mocks/config.mock';
import { mockJwtService } from '@/test/mocks/jwt.mock';
import { mockPrismaService } from '@/test/mocks/prisma.mock';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { OAuthProvider } from '@prisma/client';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('OAuthService', () => {
  let service: OAuthService;
  let prisma: typeof mockPrismaService;
  let jwtService: typeof mockJwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OAuthService,
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

    service = module.get<OAuthService>(OAuthService);
    prisma = mockPrismaService;
    jwtService = mockJwtService;

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleOAuthCallback', () => {
    it('should create new user with Google OAuth', async () => {
      prisma.oAuthAccount.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        ...mockUser,
        email: mockOAuthCallbackData.email,
        username: 'oauth_user',
        avatarUrl: mockOAuthCallbackData.picture,
        isVerified: true,
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-random-password');

      const result = await service.handleOAuthCallback(mockOAuthCallbackData);

      expect(prisma.oAuthAccount.findUnique).toHaveBeenCalledWith({
        where: {
          provider_providerId: {
            provider: OAuthProvider.GOOGLE,
            providerId: mockOAuthCallbackData.providerId,
          },
        },
        include: { user: true },
      });
      expect(prisma.user.create).toHaveBeenCalled();
      expect(result.isNewUser).toBe(true);
      expect(result.user.isVerified).toBe(true);
    });

    it('should login existing OAuth user', async () => {
      const existingOAuthAccount = {
        id: 'oauth-123',
        userId: mockUser.id,
        provider: OAuthProvider.GOOGLE,
        providerId: mockOAuthCallbackData.providerId,
        email: mockOAuthCallbackData.email,
        user: mockUser,
      };

      prisma.oAuthAccount.findUnique.mockResolvedValue(existingOAuthAccount);
      prisma.oAuthAccount.update.mockResolvedValue(existingOAuthAccount);
      prisma.user.update.mockResolvedValue({
        ...mockUser,
        lastLoginAt: new Date(),
      });

      const result = await service.handleOAuthCallback(mockOAuthCallbackData);

      expect(prisma.oAuthAccount.update).toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { lastLoginAt: expect.any(Date) },
      });
      expect(result.isNewUser).toBe(false);
      expect(result.user).toEqual(mockUser);
    });

    it('should link OAuth account to existing user with same email', async () => {
      prisma.oAuthAccount.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.oAuthAccount.create.mockResolvedValue({
        id: 'oauth-new',
        userId: mockUser.id,
        provider: OAuthProvider.GOOGLE,
        providerId: mockOAuthCallbackData.providerId,
        email: mockOAuthCallbackData.email,
      } as any);

      const result = await service.handleOAuthCallback(mockOAuthCallbackData);

      expect(prisma.oAuthAccount.create).toHaveBeenCalled();
      expect(result.isNewUser).toBe(false);
      expect(result.linkedAccount).toBe(true);
      expect(result.user).toEqual(mockUser);
    });

    it('should handle Facebook OAuth callback', async () => {
      prisma.oAuthAccount.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        ...mockUser,
        email: mockFacebookOAuthCallbackData.email,
        username: 'facebook_user',
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-random-password');

      const result = await service.handleOAuthCallback(
        mockFacebookOAuthCallbackData,
      );

      expect(prisma.user.create).toHaveBeenCalled();
      expect(result.isNewUser).toBe(true);
    });

    it('should handle Apple OAuth callback', async () => {
      prisma.oAuthAccount.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        ...mockUser,
        email: mockAppleOAuthCallbackData.email,
        username: 'apple_user',
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-random-password');

      const result = await service.handleOAuthCallback(
        mockAppleOAuthCallbackData,
      );

      expect(prisma.user.create).toHaveBeenCalled();
      expect(result.isNewUser).toBe(true);
    });
  });

  describe('generateOAuthToken', () => {
    it('should generate JWT token for OAuth user', async () => {
      const token = 'oauth-jwt-token';
      prisma.user.findUnique.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue(token);

      const result = await service.generateOAuthToken(mockUser.id);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        select: { id: true, email: true, username: true },
      });
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        username: mockUser.username,
      });
      expect(result).toBe(token);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.generateOAuthToken('non-existent-user'),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.generateOAuthToken('non-existent-user'),
      ).rejects.toThrow('User not found');
    });
  });

  describe('linkOAuthAccount', () => {
    it('should link OAuth account to existing user', async () => {
      const password = 'password123';
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prisma.oAuthAccount.findFirst.mockResolvedValue(null);
      prisma.oAuthAccount.create.mockResolvedValue({
        id: 'oauth-new',
        userId: mockUser.id,
        provider: OAuthProvider.GOOGLE,
        providerId: mockOAuthCallbackData.providerId,
      } as any);

      await service.linkOAuthAccount(
        mockUser.id,
        password,
        mockOAuthCallbackData,
      );

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(password, mockUser.password);
      expect(prisma.oAuthAccount.create).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException with invalid password', async () => {
      const password = 'wrongpassword';
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.linkOAuthAccount(mockUser.id, password, mockOAuthCallbackData),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.linkOAuthAccount(mockUser.id, password, mockOAuthCallbackData),
      ).rejects.toThrow('Invalid password');
    });

    it('should throw error if OAuth account already linked to another user', async () => {
      const password = 'password123';
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prisma.oAuthAccount.findUnique.mockResolvedValue({
        id: 'existing-oauth',
        userId: 'different-user-id',
        provider: OAuthProvider.GOOGLE,
        providerId: mockOAuthCallbackData.providerId,
      } as any);

      await expect(
        service.linkOAuthAccount(mockUser.id, password, mockOAuthCallbackData),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.linkOAuthAccount(mockUser.id, password, mockOAuthCallbackData),
      ).rejects.toThrow('This OAuth account is already linked to another user');
    });
  });

  describe('unlinkOAuthAccount', () => {
    it('should unlink OAuth account successfully', async () => {
      const password = 'password123';
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        password: 'hashed-password',
        oauthAccounts: [
          {
            id: 'oauth-123',
            provider: OAuthProvider.GOOGLE,
            providerId: 'google-user-123',
          },
          {
            id: 'oauth-456',
            provider: OAuthProvider.FACEBOOK,
            providerId: 'facebook-user-456',
          },
        ],
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prisma.oAuthAccount.findFirst.mockResolvedValue({
        id: 'oauth-123',
      } as any);
      prisma.oAuthAccount.delete.mockResolvedValue({} as any);

      await service.unlinkOAuthAccount(
        mockUser.id,
        OAuthProvider.GOOGLE,
        password,
      );

      expect(prisma.oAuthAccount.delete).toHaveBeenCalledWith({
        where: { id: 'oauth-123' },
      });
    });

    it('should throw error when trying to unlink last authentication method', async () => {
      const password = 'password123';
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        password: null, // No password set (only OAuth)
        oauthAccounts: [
          {
            id: 'oauth-123',
            provider: OAuthProvider.GOOGLE,
            providerId: 'google-user-123',
          },
        ],
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.unlinkOAuthAccount(mockUser.id, OAuthProvider.GOOGLE, password),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.unlinkOAuthAccount(mockUser.id, OAuthProvider.GOOGLE, password),
      ).rejects.toThrow(
        'Cannot unlink the only authentication method. Please set a password first.',
      );
    });

    it('should throw UnauthorizedException with invalid password', async () => {
      const password = 'wrongpassword';
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.unlinkOAuthAccount(mockUser.id, OAuthProvider.GOOGLE, password),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getLinkedAccounts', () => {
    it('should return list of linked OAuth accounts', async () => {
      const oauthAccounts = [
        {
          id: 'oauth-123',
          provider: OAuthProvider.GOOGLE,
          email: 'google@example.com',
          name: 'Google User',
          picture: 'https://google.com/avatar.jpg',
          createdAt: new Date(),
        },
        {
          id: 'oauth-456',
          provider: OAuthProvider.FACEBOOK,
          email: 'facebook@example.com',
          name: 'Facebook User',
          picture: 'https://facebook.com/avatar.jpg',
          createdAt: new Date(),
        },
      ];

      prisma.oAuthAccount.findMany.mockResolvedValue(oauthAccounts as any);

      const result = await service.getLinkedAccounts(mockUser.id);

      expect(prisma.oAuthAccount.findMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
        select: {
          id: true,
          provider: true,
          email: true,
          name: true,
          picture: true,
          createdAt: true,
        },
      });
      expect(result).toEqual(oauthAccounts);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no accounts linked', async () => {
      prisma.oAuthAccount.findMany.mockResolvedValue([]);

      const result = await service.getLinkedAccounts(mockUser.id);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });
});
