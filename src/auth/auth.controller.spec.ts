import { AuthController } from '@/auth/auth.controller';
import { AuthService } from '@/auth/auth.service';
import { LoginDto, RegisterDto } from '@/auth/dto/auth.dto';
import { UnlinkOAuthAccountDto } from '@/auth/dto/oauth.dto';
import { mockOAuthAccount } from '@/test/fixtures/oauth.fixture';
import { mockUser } from '@/test/fixtures/user.fixture';
import { mockAuthService } from '@/test/mocks/auth.mock';
import { mockMfaService } from '@/test/mocks/mfa.mock';
import { mockOAuthService } from '@/test/mocks/oauth.mock';
import { Test, TestingModule } from '@nestjs/testing';
import { OAuthProvider } from '@prisma/client';
import { MFAService } from './mfa.service';
import { OAuthService } from './oauth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;
  let oauthService: OAuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: MFAService,
          useValue: mockMfaService,
        },
        {
          provide: OAuthService,
          useValue: mockOAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    oauthService = module.get<OAuthService>(OAuthService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const registerDto: RegisterDto = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        dateOfBirth: '1995-06-15',
        selfDeclaredAge18: true,
        tosVersion: '1.0.0',
        privacyVersion: '1.0.0',
      };

      const expectedResult = {
        access_token: 'jwt-token',
        user: {
          id: mockUser.id,
          username: registerDto.username,
          email: registerDto.email,
          isActive: true,
          createdAt: mockUser.createdAt,
          updatedAt: mockUser.updatedAt,
        },
      };

      mockAuthService.register.mockResolvedValue(expectedResult);

      const result = await controller.register(registerDto);

      expect(result).toEqual(expectedResult);
      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(authService.register).toHaveBeenCalledTimes(1);
    });

    it('should throw error when email already exists', async () => {
      const registerDto: RegisterDto = {
        username: 'newuser',
        email: 'existing@example.com',
        password: 'SecurePass123!',
        dateOfBirth: '1995-06-15',
        selfDeclaredAge18: true,
        tosVersion: '1.0.0',
        privacyVersion: '1.0.0',
      };

      mockAuthService.register.mockRejectedValue(
        new Error('Email already exists'),
      );

      await expect(controller.register(registerDto)).rejects.toThrow(
        'Email already exists',
      );
      expect(authService.register).toHaveBeenCalledWith(registerDto);
    });

    it('should throw error when username already exists', async () => {
      const registerDto: RegisterDto = {
        username: 'existinguser',
        email: 'new@example.com',
        password: 'SecurePass123!',
        dateOfBirth: '1995-06-15',
        selfDeclaredAge18: true,
        tosVersion: '1.0.0',
        privacyVersion: '1.0.0',
      };

      mockAuthService.register.mockRejectedValue(
        new Error('Username already taken'),
      );

      await expect(controller.register(registerDto)).rejects.toThrow(
        'Username already taken',
      );
      expect(authService.register).toHaveBeenCalledWith(registerDto);
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const expectedResult = {
        access_token: 'jwt-token',
        user: {
          id: mockUser.id,
          username: mockUser.username,
          email: mockUser.email,
          isActive: mockUser.isActive,
          createdAt: mockUser.createdAt,
          updatedAt: mockUser.updatedAt,
        },
      };

      mockAuthService.login.mockResolvedValue(expectedResult);

      const result = await controller.login(loginDto);

      expect(result).toEqual(expectedResult);
      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(authService.login).toHaveBeenCalledTimes(1);
    });

    it('should throw error with invalid credentials', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'));

      await expect(controller.login(loginDto)).rejects.toThrow(
        'Invalid credentials',
      );
      expect(authService.login).toHaveBeenCalledWith(loginDto);
    });

    it('should throw error when user not found', async () => {
      const loginDto: LoginDto = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      mockAuthService.login.mockRejectedValue(new Error('User not found'));

      await expect(controller.login(loginDto)).rejects.toThrow(
        'User not found',
      );
      expect(authService.login).toHaveBeenCalledWith(loginDto);
    });
  });

  describe('getMe', () => {
    it('should return current user', async () => {
      const currentUser = {
        id: mockUser.id,
        username: mockUser.username,
        email: mockUser.email,
        isActive: mockUser.isActive,
      };

      const result = await controller.getMe(currentUser);

      expect(result).toEqual(currentUser);
    });

    it('should return user with all fields', async () => {
      const currentUser = {
        id: mockUser.id,
        username: mockUser.username,
        email: mockUser.email,
        isActive: mockUser.isActive,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      };

      const result = await controller.getMe(currentUser);

      expect(result).toEqual(currentUser);
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('username');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('isActive');
    });
  });

  describe('OAuth - googleCallback', () => {
    it('should handle Google OAuth callback successfully', async () => {
      const req: any = {
        user: { id: mockUser.id },
      };
      const res: any = {
        redirect: jest.fn(),
      };
      const token = 'oauth-jwt-token';

      mockOAuthService.generateOAuthToken.mockResolvedValue(token);

      await controller.googleCallback(req, res);

      expect(oauthService.generateOAuthToken).toHaveBeenCalledWith(mockUser.id);
      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining(`token=${token}`),
      );
    });

    it('should redirect to frontend with token', async () => {
      const req: any = {
        user: { id: 'user-123' },
      };
      const res: any = {
        redirect: jest.fn(),
      };
      const token = 'generated-token';

      mockOAuthService.generateOAuthToken.mockResolvedValue(token);

      await controller.googleCallback(req, res);

      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringMatching(/\/auth\/callback\?token=generated-token$/),
      );
    });
  });

  describe('OAuth - facebookCallback', () => {
    it('should handle Facebook OAuth callback successfully', async () => {
      const req: any = {
        user: { id: mockUser.id },
      };
      const res: any = {
        redirect: jest.fn(),
      };
      const token = 'facebook-jwt-token';

      mockOAuthService.generateOAuthToken.mockResolvedValue(token);

      await controller.facebookCallback(req, res);

      expect(oauthService.generateOAuthToken).toHaveBeenCalledWith(mockUser.id);
      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining(`token=${token}`),
      );
    });
  });

  describe('OAuth - appleCallback', () => {
    it('should handle Apple OAuth callback successfully', async () => {
      const req: any = {
        user: { id: mockUser.id },
      };
      const res: any = {
        redirect: jest.fn(),
      };
      const token = 'apple-jwt-token';

      mockOAuthService.generateOAuthToken.mockResolvedValue(token);

      await controller.appleCallback(req, res);

      expect(oauthService.generateOAuthToken).toHaveBeenCalledWith(mockUser.id);
      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining(`token=${token}`),
      );
    });
  });

  describe('OAuth - unlinkOAuthAccount', () => {
    it('should unlink OAuth account successfully', async () => {
      const currentUser = { id: mockUser.id };
      const unlinkDto: UnlinkOAuthAccountDto = {
        provider: OAuthProvider.GOOGLE,
        password: 'password123',
      };

      mockOAuthService.unlinkOAuthAccount.mockResolvedValue(undefined);

      const result = await controller.unlinkOAuthAccount(
        currentUser,
        unlinkDto,
      );

      expect(result).toEqual({
        success: true,
        message: 'OAuth account unlinked successfully',
      });
      expect(oauthService.unlinkOAuthAccount).toHaveBeenCalledWith(
        mockUser.id,
        OAuthProvider.GOOGLE,
        'password123',
      );
    });

    it('should throw error with invalid password', async () => {
      const currentUser = { id: mockUser.id };
      const unlinkDto: UnlinkOAuthAccountDto = {
        provider: OAuthProvider.GOOGLE,
        password: 'wrongpassword',
      };

      mockOAuthService.unlinkOAuthAccount.mockRejectedValue(
        new Error('Invalid password'),
      );

      await expect(
        controller.unlinkOAuthAccount(currentUser, unlinkDto),
      ).rejects.toThrow('Invalid password');
    });
  });

  describe('OAuth - getLinkedAccounts', () => {
    it('should return list of linked OAuth accounts', async () => {
      const currentUser = { id: mockUser.id };
      const linkedAccounts = [
        mockOAuthAccount,
        {
          ...mockOAuthAccount,
          id: 'oauth-456',
          provider: OAuthProvider.FACEBOOK,
        },
      ];

      mockOAuthService.getLinkedAccounts.mockResolvedValue(linkedAccounts);

      const result = await controller.getLinkedAccounts(currentUser);

      expect(result).toEqual(linkedAccounts);
      expect(oauthService.getLinkedAccounts).toHaveBeenCalledWith(mockUser.id);
    });

    it('should return empty array when no accounts linked', async () => {
      const currentUser = { id: mockUser.id };

      mockOAuthService.getLinkedAccounts.mockResolvedValue([]);

      const result = await controller.getLinkedAccounts(currentUser);

      expect(result).toEqual([]);
      expect(oauthService.getLinkedAccounts).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('MFA - setupMFA', () => {
    it('should setup MFA successfully', async () => {
      const currentUser = { id: mockUser.id };
      const enableMFADto = { password: 'password123' };
      const mfaSetup = {
        qrCode: 'data:image/png;base64...',
        secret: 'JBSWY3DPEHPK3PXP',
        backupCodes: ['code1', 'code2', 'code3'],
      };

      mockMfaService.setupMFA.mockResolvedValue(mfaSetup);

      const result = await controller.setupMFA(currentUser, enableMFADto);

      expect(result).toEqual(mfaSetup);
      expect(mockMfaService.setupMFA).toHaveBeenCalledWith(
        mockUser.id,
        'password123',
      );
    });

    it('should throw error with invalid password', async () => {
      const currentUser = { id: mockUser.id };
      const enableMFADto = { password: 'wrongpassword' };

      mockMfaService.setupMFA.mockRejectedValue(new Error('Invalid password'));

      await expect(
        controller.setupMFA(currentUser, enableMFADto),
      ).rejects.toThrow('Invalid password');
    });
  });

  describe('MFA - verifyMFASetup', () => {
    it('should verify and enable MFA successfully', async () => {
      const currentUser = { id: mockUser.id };
      const verifyMFASetupDto = { code: '123456' };

      mockMfaService.verifyAndEnableMFA.mockResolvedValue(true);

      const result = await controller.verifyMFASetup(
        currentUser,
        verifyMFASetupDto,
      );

      expect(result).toEqual({
        success: true,
        message: 'MFA enabled successfully',
      });
      expect(mockMfaService.verifyAndEnableMFA).toHaveBeenCalledWith(
        mockUser.id,
        '123456',
      );
    });

    it('should throw error with invalid code', async () => {
      const currentUser = { id: mockUser.id };
      const verifyMFASetupDto = { code: 'invalid' };

      mockMfaService.verifyAndEnableMFA.mockRejectedValue(
        new Error('Invalid authentication code'),
      );

      await expect(
        controller.verifyMFASetup(currentUser, verifyMFASetupDto),
      ).rejects.toThrow('Invalid authentication code');
    });
  });

  describe('MFA - disableMFA', () => {
    it('should disable MFA successfully', async () => {
      const currentUser = { id: mockUser.id };
      const disableMFADto = { password: 'password123', code: '123456' };

      mockMfaService.disableMFA.mockResolvedValue(true);

      const result = await controller.disableMFA(currentUser, disableMFADto);

      expect(result).toEqual({
        success: true,
        message: 'MFA disabled successfully',
      });
      expect(mockMfaService.disableMFA).toHaveBeenCalledWith(
        mockUser.id,
        'password123',
        '123456',
      );
    });

    it('should throw error with invalid credentials', async () => {
      const currentUser = { id: mockUser.id };
      const disableMFADto = { password: 'wrongpassword', code: '123456' };

      mockMfaService.disableMFA.mockRejectedValue(
        new Error('Invalid password'),
      );

      await expect(
        controller.disableMFA(currentUser, disableMFADto),
      ).rejects.toThrow('Invalid password');
    });
  });

  describe('MFA - regenerateBackupCodes', () => {
    it('should regenerate backup codes successfully', async () => {
      const currentUser = { id: mockUser.id };
      const regenerateDto = { password: 'password123', code: '123456' };
      const backupCodes = ['code1', 'code2', 'code3', 'code4', 'code5'];

      mockMfaService.regenerateBackupCodes.mockResolvedValue(backupCodes);

      const result = await controller.regenerateBackupCodes(
        currentUser,
        regenerateDto,
      );

      expect(result).toEqual({ backupCodes });
      expect(mockMfaService.regenerateBackupCodes).toHaveBeenCalledWith(
        mockUser.id,
        'password123',
        '123456',
      );
    });

    it('should throw error with invalid credentials', async () => {
      const currentUser = { id: mockUser.id };
      const regenerateDto = { password: 'wrongpassword', code: '123456' };

      mockMfaService.regenerateBackupCodes.mockRejectedValue(
        new Error('Invalid password'),
      );

      await expect(
        controller.regenerateBackupCodes(currentUser, regenerateDto),
      ).rejects.toThrow('Invalid password');
    });
  });
});
