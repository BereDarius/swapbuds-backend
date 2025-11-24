import { MFAService } from '@/auth/mfa.service';
import { PrismaService } from '@/prisma/prisma.service';
import { RecaptchaService } from '@/recaptcha/recaptcha.service';
import { mockUser } from '@/test/fixtures/user.fixture';
import { mockConfigService } from '@/test/mocks/config.mock';
import { mockJwtService } from '@/test/mocks/jwt.mock';
import { mockPrismaService } from '@/test/mocks/prisma.mock';
import { mockRecaptchaService } from '@/test/mocks/recaptcha.mock';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: typeof mockPrismaService;
  let jwtService: typeof mockJwtService;
  let recaptchaService: jest.Mocked<RecaptchaService>;

  const mockMFAService = {
    setupMFA: jest.fn(),
    verifyAndEnableMFA: jest.fn(),
    verifyMFACode: jest.fn(),
    disableMFA: jest.fn(),
    regenerateBackupCodes: jest.fn(),
    isMFAEnabled: jest.fn().mockResolvedValue(false),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
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
        {
          provide: RecaptchaService,
          useValue: mockRecaptchaService,
        },
        {
          provide: MFAService,
          useValue: mockMFAService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = mockPrismaService;
    jwtService = mockJwtService;
    recaptchaService = module.get(RecaptchaService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto = {
      username: 'newuser',
      email: 'newuser@example.com',
      password: 'password123',
    };

    it('should register a new user successfully', async () => {
      const hashedPassword = 'hashedPassword123';
      const token = 'jwt-token';

      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        ...mockUser,
        username: registerDto.username,
        email: registerDto.email,
        password: hashedPassword,
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      jwtService.sign.mockReturnValue(token);

      const result = await service.register(registerDto);

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { email: registerDto.email },
            { username: registerDto.username },
          ],
        },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(prisma.user.create).toHaveBeenCalled();
      expect(result.accessToken).toBe(token);
      expect(result.user.email).toBe(registerDto.email);
    });

    it('should throw ConflictException if email already exists', async () => {
      prisma.user.findFirst.mockResolvedValue({
        ...mockUser,
        email: registerDto.email,
      });

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.register(registerDto)).rejects.toThrow(
        'Email already registered',
      );
    });

    it('should throw ConflictException if username already exists', async () => {
      prisma.user.findFirst.mockResolvedValue({
        ...mockUser,
        username: registerDto.username,
      });

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.register(registerDto)).rejects.toThrow(
        'Username already taken',
      );
    });

    it('should register successfully with valid reCAPTCHA token', async () => {
      const registerDtoWithToken = {
        ...registerDto,
        recaptchaToken: 'valid-token',
      };
      const hashedPassword = 'hashedPassword123';
      const token = 'jwt-token';

      recaptchaService.verifyToken.mockResolvedValue({
        success: true,
        score: 0.9,
        action: 'register',
      });
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        ...mockUser,
        username: registerDto.username,
        email: registerDto.email,
        password: hashedPassword,
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      jwtService.sign.mockReturnValue(token);

      const result = await service.register(registerDtoWithToken);

      expect(recaptchaService.verifyToken).toHaveBeenCalledWith(
        'valid-token',
        'register',
      );
      expect(result.accessToken).toBe(token);
      expect(result.user.email).toBe(registerDto.email);
    });

    it('should register successfully even with low reCAPTCHA score (graceful handling)', async () => {
      const registerDtoWithToken = {
        ...registerDto,
        recaptchaToken: 'low-score-token',
      };
      const hashedPassword = 'hashedPassword123';
      const token = 'jwt-token';

      recaptchaService.verifyToken.mockResolvedValue({
        success: false,
        score: 0.3,
        action: 'register',
        reason: 'Score below threshold',
      });
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        ...mockUser,
        username: registerDto.username,
        email: registerDto.email,
        password: hashedPassword,
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      jwtService.sign.mockReturnValue(token);

      const result = await service.register(registerDtoWithToken);

      expect(recaptchaService.verifyToken).toHaveBeenCalled();
      expect(result.accessToken).toBe(token);
      // Should still allow registration despite low score
    });

    it('should register successfully without reCAPTCHA token', async () => {
      const hashedPassword = 'hashedPassword123';
      const token = 'jwt-token';

      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        ...mockUser,
        username: registerDto.username,
        email: registerDto.email,
        password: hashedPassword,
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      jwtService.sign.mockReturnValue(token);

      const result = await service.register(registerDto);

      expect(recaptchaService.verifyToken).not.toHaveBeenCalled();
      expect(result.accessToken).toBe(token);
    });

    it('should register successfully when reCAPTCHA verification fails due to network error', async () => {
      const registerDtoWithToken = {
        ...registerDto,
        recaptchaToken: 'token-with-network-error',
      };
      const hashedPassword = 'hashedPassword123';
      const token = 'jwt-token';

      recaptchaService.verifyToken.mockResolvedValue({
        success: true,
        score: 0.5,
        action: 'register',
        reason: 'Verification error, allowed by default',
      });
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        ...mockUser,
        username: registerDto.username,
        email: registerDto.email,
        password: hashedPassword,
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      jwtService.sign.mockReturnValue(token);

      const result = await service.register(registerDtoWithToken);

      expect(result.accessToken).toBe(token);
      // Should allow registration on network errors
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login user successfully with valid credentials', async () => {
      const token = 'jwt-token';

      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({
        ...mockUser,
        lastLoginAt: new Date(),
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue(token);

      const result = await service.login(loginDto);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginDto.email },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.password,
      );
      expect(prisma.user.update).toHaveBeenCalled();
      expect('accessToken' in result && result.accessToken).toBe(token);
      expect('user' in result && result.user.email).toBe(mockUser.email);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('should throw UnauthorizedException if user is not active', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        'Account is deactivated',
      );
    });

    it('should login successfully with valid reCAPTCHA token', async () => {
      const loginDtoWithToken = {
        ...loginDto,
        recaptchaToken: 'valid-token',
      };
      const token = 'jwt-token';

      recaptchaService.verifyToken.mockResolvedValue({
        success: true,
        score: 0.9,
        action: 'login',
      });
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({
        ...mockUser,
        lastLoginAt: new Date(),
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue(token);

      const result = await service.login(loginDtoWithToken);

      expect(recaptchaService.verifyToken).toHaveBeenCalledWith(
        'valid-token',
        'login',
      );
      expect('accessToken' in result && result.accessToken).toBe(token);
      expect('user' in result && result.user.email).toBe(mockUser.email);
    });

    it('should login successfully even with low reCAPTCHA score (graceful handling)', async () => {
      const loginDtoWithToken = {
        ...loginDto,
        recaptchaToken: 'low-score-token',
      };
      const token = 'jwt-token';

      recaptchaService.verifyToken.mockResolvedValue({
        success: false,
        score: 0.2,
        action: 'login',
        reason: 'Score below threshold',
      });
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({
        ...mockUser,
        lastLoginAt: new Date(),
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue(token);

      const result = await service.login(loginDtoWithToken);

      expect(recaptchaService.verifyToken).toHaveBeenCalled();
      expect('accessToken' in result && result.accessToken).toBe(token);
      // Should still allow login despite low score (graceful handling)
    });

    it('should login successfully without reCAPTCHA token', async () => {
      const token = 'jwt-token';

      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({
        ...mockUser,
        lastLoginAt: new Date(),
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue(token);

      const result = await service.login(loginDto);

      expect(recaptchaService.verifyToken).not.toHaveBeenCalled();
      expect('accessToken' in result && result.accessToken).toBe(token);
    });

    it('should login successfully when reCAPTCHA verification fails due to network error', async () => {
      const loginDtoWithToken = {
        ...loginDto,
        recaptchaToken: 'token-with-network-error',
      };
      const token = 'jwt-token';

      recaptchaService.verifyToken.mockResolvedValue({
        success: true,
        score: 0.5,
        action: 'login',
        reason: 'Verification error, allowed by default',
      });
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({
        ...mockUser,
        lastLoginAt: new Date(),
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue(token);

      const result = await service.login(loginDtoWithToken);

      expect('accessToken' in result && result.accessToken).toBe(token);
      // Should allow login on network errors
    });

    it('should login successfully with high reCAPTCHA score and verify action', async () => {
      const loginDtoWithToken = {
        ...loginDto,
        recaptchaToken: 'high-score-token',
      };
      const token = 'jwt-token';

      recaptchaService.verifyToken.mockResolvedValue({
        success: true,
        score: 0.95,
        action: 'login',
      });
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({
        ...mockUser,
        lastLoginAt: new Date(),
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue(token);

      const result = await service.login(loginDtoWithToken);

      expect(recaptchaService.verifyToken).toHaveBeenCalledWith(
        'high-score-token',
        'login',
      );
      expect('accessToken' in result && result.accessToken).toBe(token);
    });
  });

  describe('validateUser', () => {
    it('should return user if user is valid and active', async () => {
      const userId = mockUser.id;

      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.validateUser(userId);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          username: true,
          avatarUrl: true,
          isActive: true,
        },
      });
      expect(result.id).toBe(mockUser.id);
      expect(result.email).toBe(mockUser.email);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const userId = 'non-existent';

      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.validateUser(userId)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.validateUser(userId)).rejects.toThrow(
        'User not found or inactive',
      );
    });

    it('should throw UnauthorizedException if user is not active', async () => {
      const userId = mockUser.id;

      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await expect(service.validateUser(userId)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.validateUser(userId)).rejects.toThrow(
        'User not found or inactive',
      );
    });
  });
});
