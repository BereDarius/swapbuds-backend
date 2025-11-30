import { EmailService } from '@/auth/email.service';
import { MFAService } from '@/auth/mfa.service';
import { PrismaService } from '@/prisma/prisma.service';
import { RecaptchaService } from '@/recaptcha/recaptcha.service';
import { mockUser } from '@/test/fixtures/user.fixture';
import { mockConfigService } from '@/test/mocks/config.mock';
import { mockEmailService } from '@/test/mocks/email.mock';
import { mockJwtService } from '@/test/mocks/jwt.mock';
import { mockMfaService } from '@/test/mocks/mfa.mock';
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
  let jwtService: jest.Mocked<JwtService>;
  let recaptchaService: jest.Mocked<RecaptchaService>;
  let emailService: jest.Mocked<EmailService>;
  let mfaService: jest.Mocked<MFAService>;

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
          useValue: mockMfaService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = mockPrismaService;
    jwtService = module.get(JwtService);
    recaptchaService = module.get(RecaptchaService);
    emailService = module.get(EmailService);
    mfaService = module.get(MFAService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto = {
      username: 'newuser',
      email: 'newuser@example.com',
      password: 'password123',
      dateOfBirth: '1995-06-15',
      selfDeclaredAge18: true,
      tosVersion: '1.0.0',
      privacyVersion: '1.0.0',
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

    it('should send verification email upon successful registration', async () => {
      const hashedPassword = 'hashedPassword123';
      const token = 'jwt-token';
      const createdUser = {
        ...mockUser,
        username: registerDto.username,
        email: registerDto.email,
        password: hashedPassword,
        emailVerificationToken: 'mock-verification-token',
      };

      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(createdUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      jwtService.sign.mockReturnValue(token);

      await service.register(registerDto);

      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        registerDto.email,
        registerDto.username,
        expect.any(String), // verification token
      );
    });

    it('should still register user even if verification email fails to send', async () => {
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
      emailService.sendVerificationEmail.mockRejectedValue(
        new Error('Email service error'),
      );

      // Should not throw despite email error
      const result = await service.register(registerDto);

      expect(result.accessToken).toBe(token);
      expect(result.user.email).toBe(registerDto.email);
      expect(emailService.sendVerificationEmail).toHaveBeenCalled();
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

    // Age Verification Tests
    it('should reject registration if user is under 18 years old', async () => {
      // Create a date exactly 17 years ago from today
      const seventeenYearsAgo = new Date();
      seventeenYearsAgo.setFullYear(seventeenYearsAgo.getFullYear() - 17);

      const underageDto = {
        ...registerDto,
        dateOfBirth: seventeenYearsAgo.toISOString().split('T')[0], // YYYY-MM-DD format
      };

      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.register(underageDto)).rejects.toThrow(
        'You must be at least 18 years old to register',
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('should reject registration if selfDeclaredAge18 is false', async () => {
      const noDeclarationDto = {
        ...registerDto,
        selfDeclaredAge18: false,
      };

      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.register(noDeclarationDto)).rejects.toThrow(
        'You must confirm that you are 18 years or older',
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('should accept registration if user is exactly 18 years old', async () => {
      // Create a date exactly 18 years ago from today
      const eighteenYearsAgo = new Date();
      eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);

      const exactlyEighteenDto = {
        ...registerDto,
        dateOfBirth: eighteenYearsAgo.toISOString().split('T')[0], // YYYY-MM-DD format
      };
      const hashedPassword = 'hashedPassword123';
      const token = 'jwt-token';

      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        ...mockUser,
        username: exactlyEighteenDto.username,
        email: exactlyEighteenDto.email,
        password: hashedPassword,
        dateOfBirth: new Date(exactlyEighteenDto.dateOfBirth),
        selfDeclaredAge18: true,
        ageVerifiedAt: new Date(),
        tosAcceptedAt: new Date(),
        tosVersion: exactlyEighteenDto.tosVersion,
        privacyAcceptedAt: new Date(),
        privacyVersion: exactlyEighteenDto.privacyVersion,
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      jwtService.sign.mockReturnValue(token);

      const result = await service.register(exactlyEighteenDto);

      expect(result.accessToken).toBe(token);
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dateOfBirth: expect.any(Date),
            selfDeclaredAge18: true,
            ageVerifiedAt: expect.any(Date),
            tosAcceptedAt: expect.any(Date),
            tosVersion: exactlyEighteenDto.tosVersion,
            privacyAcceptedAt: expect.any(Date),
            privacyVersion: exactlyEighteenDto.privacyVersion,
          }),
        }),
      );
    });

    it('should accept registration if user is over 18 years old (25 years)', async () => {
      // Create a date exactly 25 years ago from today
      const twentyFiveYearsAgo = new Date();
      twentyFiveYearsAgo.setFullYear(twentyFiveYearsAgo.getFullYear() - 25);

      const olderUserDto = {
        ...registerDto,
        dateOfBirth: twentyFiveYearsAgo.toISOString().split('T')[0], // YYYY-MM-DD format
      };
      const hashedPassword = 'hashedPassword123';
      const token = 'jwt-token';

      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        ...mockUser,
        username: olderUserDto.username,
        email: olderUserDto.email,
        password: hashedPassword,
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      jwtService.sign.mockReturnValue(token);

      const result = await service.register(olderUserDto);

      expect(result.accessToken).toBe(token);
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it('should store legal consent versions during registration', async () => {
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

      await service.register(registerDto);

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tosVersion: '1.0.0',
            privacyVersion: '1.0.0',
            tosAcceptedAt: expect.any(Date),
            privacyAcceptedAt: expect.any(Date),
          }),
        }),
      );
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

    it('should return MFA challenge when user has MFA enabled and no MFA code/token provided', async () => {
      const userWithMFA = { ...mockUser, mfaEnabled: true };

      prisma.user.findUnique.mockResolvedValue(userWithMFA);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue('mfa-temp-token');

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('mfaRequired', true);
      expect(result).toHaveProperty('mfaToken', 'mfa-temp-token');
      expect(jwtService.sign).toHaveBeenCalledWith(
        { sub: userWithMFA.id, type: 'mfa' },
        { expiresIn: '5m' },
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should login successfully when user has MFA enabled and valid MFA code provided', async () => {
      const loginDtoWithMFA = { ...loginDto, mfaCode: '123456' };
      const userWithMFA = { ...mockUser, mfaEnabled: true };
      const token = 'jwt-token';

      prisma.user.findUnique.mockResolvedValue(userWithMFA);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mfaService.verifyMFACode.mockResolvedValue(true);
      prisma.user.update.mockResolvedValue({
        ...userWithMFA,
        lastLoginAt: new Date(),
      });
      jwtService.sign.mockReturnValue(token);

      const result = await service.login(loginDtoWithMFA);

      expect(mfaService.verifyMFACode).toHaveBeenCalledWith(
        userWithMFA.id,
        '123456',
        false,
      );
      expect('accessToken' in result && result.accessToken).toBe(token);
      expect('user' in result && result.user.email).toBe(userWithMFA.email);
    });

    it('should throw UnauthorizedException when user has MFA enabled and invalid MFA code provided', async () => {
      const loginDtoWithMFA = { ...loginDto, mfaCode: 'invalid' };
      const userWithMFA = { ...mockUser, mfaEnabled: true };

      prisma.user.findUnique.mockResolvedValue(userWithMFA);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mfaService.verifyMFACode.mockResolvedValue(false);

      await expect(service.login(loginDtoWithMFA)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDtoWithMFA)).rejects.toThrow(
        'Invalid MFA code',
      );
    });

    it('should login successfully when user has MFA enabled and valid MFA token provided', async () => {
      const loginDtoWithMFAToken = { ...loginDto, mfaToken: 'valid-mfa-token' };
      const userWithMFA = { ...mockUser, mfaEnabled: true };
      const token = 'jwt-token';

      prisma.user.findUnique.mockResolvedValue(userWithMFA);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.verify.mockReturnValue({
        sub: userWithMFA.id,
        type: 'mfa',
      });
      prisma.user.update.mockResolvedValue({
        ...userWithMFA,
        lastLoginAt: new Date(),
      });
      jwtService.sign.mockReturnValue(token);

      const result = await service.login(loginDtoWithMFAToken);

      expect(jwtService.verify).toHaveBeenCalledWith('valid-mfa-token');
      expect('accessToken' in result && result.accessToken).toBe(token);
      expect('user' in result && result.user.email).toBe(userWithMFA.email);
    });

    it('should throw UnauthorizedException when MFA token has wrong type', async () => {
      const loginDtoWithMFAToken = {
        ...loginDto,
        mfaToken: 'wrong-type-token',
      };
      const userWithMFA = { ...mockUser, mfaEnabled: true };

      prisma.user.findUnique.mockResolvedValue(userWithMFA);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.verify.mockReturnValue({
        sub: userWithMFA.id,
        type: 'access', // Wrong type
      });

      await expect(service.login(loginDtoWithMFAToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDtoWithMFAToken)).rejects.toThrow(
        'Invalid or expired MFA token',
      );
    });

    it('should throw UnauthorizedException when MFA token has wrong user ID', async () => {
      const loginDtoWithMFAToken = {
        ...loginDto,
        mfaToken: 'wrong-user-token',
      };
      const userWithMFA = { ...mockUser, mfaEnabled: true };

      prisma.user.findUnique.mockResolvedValue(userWithMFA);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.verify.mockReturnValue({
        sub: 'different-user-id',
        type: 'mfa',
      });

      await expect(service.login(loginDtoWithMFAToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDtoWithMFAToken)).rejects.toThrow(
        'Invalid or expired MFA token',
      );
    });

    it('should throw UnauthorizedException when MFA token is expired or invalid', async () => {
      const loginDtoWithMFAToken = { ...loginDto, mfaToken: 'expired-token' };
      const userWithMFA = { ...mockUser, mfaEnabled: true };

      prisma.user.findUnique.mockResolvedValue(userWithMFA);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.verify.mockImplementation(() => {
        throw new Error('Token expired');
      });

      await expect(service.login(loginDtoWithMFAToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDtoWithMFAToken)).rejects.toThrow(
        'Invalid or expired MFA token',
      );
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
