import {
  mockAdminAuthService,
  mockAdminUser,
  resetAdminUserMocks,
} from '@/test/mocks/admin-user.mock';
import { Test, TestingModule } from '@nestjs/testing';
import { AdminRole } from '@prisma/client';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminRegisterDto } from './dto/admin-register.dto';

describe('AdminAuthController', () => {
  let controller: AdminAuthController;
  let adminAuthService: AdminAuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminAuthController],
      providers: [
        {
          provide: AdminAuthService,
          useValue: mockAdminAuthService,
        },
      ],
    }).compile();

    controller = module.get<AdminAuthController>(AdminAuthController);
    adminAuthService = module.get<AdminAuthService>(AdminAuthService);
  });

  afterEach(() => {
    resetAdminUserMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should login admin without MFA', async () => {
      const loginDto: AdminLoginDto = {
        email: 'admin@swapbuds.com',
        password: 'AdminPass123!',
      };

      const expectedResult = {
        accessToken: 'admin-jwt-token',
        adminUser: mockAdminUser,
      };

      mockAdminAuthService.login.mockResolvedValue(expectedResult);

      const result = await controller.login(loginDto);

      expect(result).toEqual(expectedResult);
      expect(adminAuthService.login).toHaveBeenCalledWith(loginDto);
      expect(adminAuthService.login).toHaveBeenCalledTimes(1);
    });

    it('should require MFA code for admin with MFA enabled', async () => {
      const loginDto: AdminLoginDto = {
        email: 'admin@swapbuds.com',
        password: 'AdminPass123!',
        mfaCode: '123456',
      };

      const expectedResult = {
        accessToken: 'admin-jwt-token',
        adminUser: { ...mockAdminUser, mfaEnabled: true },
      };

      mockAdminAuthService.login.mockResolvedValue(expectedResult);

      const result = await controller.login(loginDto);

      expect(result).toEqual(expectedResult);
      expect(adminAuthService.login).toHaveBeenCalledWith(loginDto);
    });

    it('should return requireMfa flag when MFA is enabled but code not provided', async () => {
      const loginDto: AdminLoginDto = {
        email: 'admin@swapbuds.com',
        password: 'AdminPass123!',
      };

      const expectedResult = {
        requireMfa: true,
        message: 'MFA code required',
      };

      mockAdminAuthService.login.mockResolvedValue(expectedResult);

      const result = await controller.login(loginDto);

      expect(result).toEqual(expectedResult);
      expect(adminAuthService.login).toHaveBeenCalledWith(loginDto);
    });
  });

  describe('register', () => {
    it('should register new admin user', async () => {
      const registerDto: AdminRegisterDto = {
        email: 'newadmin@swapbuds.com',
        username: 'newadmin',
        password: 'NewAdmin123!',
        role: AdminRole.SUPPORT,
      };

      const mockRequest = {
        user: mockAdminUser,
      };

      const expectedResult = {
        id: 'admin-2',
        email: registerDto.email,
        username: registerDto.username,
        role: registerDto.role,
      };

      mockAdminAuthService.register.mockResolvedValue(expectedResult);

      const result = await controller.register(registerDto, mockRequest);

      expect(result).toEqual(expectedResult);
      expect(adminAuthService.register).toHaveBeenCalledWith(
        registerDto,
        mockAdminUser.id,
      );
      expect(adminAuthService.register).toHaveBeenCalledTimes(1);
    });

    it('should register moderator', async () => {
      const registerDto: AdminRegisterDto = {
        email: 'moderator@swapbuds.com',
        username: 'moderator',
        password: 'Mod123!',
        role: AdminRole.MODERATOR,
      };

      const mockRequest = {
        user: mockAdminUser,
      };

      const expectedResult = {
        id: 'admin-3',
        email: registerDto.email,
        username: registerDto.username,
        role: AdminRole.MODERATOR,
      };

      mockAdminAuthService.register.mockResolvedValue(expectedResult);

      const result = await controller.register(registerDto, mockRequest);

      expect(result).toEqual(expectedResult);
      expect(adminAuthService.register).toHaveBeenCalledWith(
        registerDto,
        mockAdminUser.id,
      );
    });

    it('should register another admin', async () => {
      const registerDto: AdminRegisterDto = {
        email: 'admin2@swapbuds.com',
        username: 'admin2',
        password: 'Admin2Pass123!',
        role: AdminRole.ADMIN,
      };

      const mockRequest = {
        user: mockAdminUser,
      };

      const expectedResult = {
        id: 'admin-4',
        email: registerDto.email,
        username: registerDto.username,
        role: AdminRole.ADMIN,
      };

      mockAdminAuthService.register.mockResolvedValue(expectedResult);

      const result = await controller.register(registerDto, mockRequest);

      expect(result).toEqual(expectedResult);
      expect(adminAuthService.register).toHaveBeenCalledWith(
        registerDto,
        mockAdminUser.id,
      );
    });
  });

  describe('setupMFA', () => {
    it('should setup MFA for admin user', async () => {
      const mockRequest = {
        user: mockAdminUser,
      };

      const expectedResult = {
        secret: 'JBSWY3DPEHPK3PXP',
        qrCodeUrl: 'data:image/png;base64,iVBORw0KGgoAAAA...',
      };

      mockAdminAuthService.setupMFA.mockResolvedValue(expectedResult);

      const result = await controller.setupMFA(mockRequest);

      expect(result).toEqual(expectedResult);
      expect(adminAuthService.setupMFA).toHaveBeenCalledWith(mockAdminUser.id);
      expect(adminAuthService.setupMFA).toHaveBeenCalledTimes(1);
    });

    it('should return secret and QR code for different admin', async () => {
      const mockRequest = {
        user: {
          id: 'admin-5',
          email: 'another@swapbuds.com',
          username: 'another',
          role: AdminRole.MODERATOR,
        },
      };

      const expectedResult = {
        secret: 'DIFFERENT_SECRET',
        qrCodeUrl: 'data:image/png;base64,different...',
      };

      mockAdminAuthService.setupMFA.mockResolvedValue(expectedResult);

      const result = await controller.setupMFA(mockRequest);

      expect(result).toEqual(expectedResult);
      expect(adminAuthService.setupMFA).toHaveBeenCalledWith('admin-5');
    });
  });

  describe('verifyMFA', () => {
    it('should verify and enable MFA', async () => {
      const mockRequest = {
        user: mockAdminUser,
      };

      const mfaCode = '123456';

      const expectedResult = {
        success: true,
        message: 'MFA enabled successfully',
      };

      mockAdminAuthService.verifyAndEnableMFA.mockResolvedValue(expectedResult);

      const result = await controller.verifyMFA(mfaCode, mockRequest);

      expect(result).toEqual(expectedResult);
      expect(adminAuthService.verifyAndEnableMFA).toHaveBeenCalledWith(
        mockAdminUser.id,
        mfaCode,
      );
      expect(adminAuthService.verifyAndEnableMFA).toHaveBeenCalledTimes(1);
    });

    it('should verify MFA with different code', async () => {
      const mockRequest = {
        user: {
          id: 'admin-6',
          email: 'test@swapbuds.com',
          username: 'test',
          role: AdminRole.SUPPORT,
        },
      };

      const mfaCode = '654321';

      const expectedResult = {
        success: true,
        message: 'MFA enabled successfully',
      };

      mockAdminAuthService.verifyAndEnableMFA.mockResolvedValue(expectedResult);

      const result = await controller.verifyMFA(mfaCode, mockRequest);

      expect(result).toEqual(expectedResult);
      expect(adminAuthService.verifyAndEnableMFA).toHaveBeenCalledWith(
        'admin-6',
        mfaCode,
      );
    });
  });

  describe('getProfile', () => {
    it('should return admin profile', async () => {
      const mockRequest = {
        user: {
          id: 'admin-1',
          email: 'admin@swapbuds.com',
          username: 'admin',
          role: AdminRole.ADMIN,
          mfaEnabled: false,
          avatarUrl: null,
          isActive: true,
        },
      };

      const result = await controller.getProfile(mockRequest);

      expect(result).toEqual({
        id: mockRequest.user.id,
        email: mockRequest.user.email,
        username: mockRequest.user.username,
        role: mockRequest.user.role,
        mfaEnabled: mockRequest.user.mfaEnabled,
      });
    });

    it('should return profile with MFA enabled', async () => {
      const mockRequest = {
        user: {
          id: 'admin-2',
          email: 'secure@swapbuds.com',
          username: 'secure',
          role: AdminRole.MODERATOR,
          mfaEnabled: true,
          avatarUrl: 'https://example.com/avatar.jpg',
          isActive: true,
        },
      };

      const result = await controller.getProfile(mockRequest);

      expect(result).toEqual({
        id: 'admin-2',
        email: 'secure@swapbuds.com',
        username: 'secure',
        role: AdminRole.MODERATOR,
        mfaEnabled: true,
      });
    });

    it('should return profile for support role', async () => {
      const mockRequest = {
        user: {
          id: 'admin-3',
          email: 'support@swapbuds.com',
          username: 'support',
          role: AdminRole.SUPPORT,
          mfaEnabled: true,
          avatarUrl: null,
          isActive: true,
        },
      };

      const result = await controller.getProfile(mockRequest);

      expect(result).toEqual({
        id: 'admin-3',
        email: 'support@swapbuds.com',
        username: 'support',
        role: AdminRole.SUPPORT,
        mfaEnabled: true,
      });
    });
  });
});
