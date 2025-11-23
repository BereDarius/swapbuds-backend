import { AuthController } from '@/auth/auth.controller';
import { AuthService } from '@/auth/auth.service';
import { LoginDto, RegisterDto } from '@/auth/dto/auth.dto';
import { mockUser } from '@/test/fixtures/user.fixture';
import { mockAuthService } from '@/test/mocks/auth.mock';
import { Test, TestingModule } from '@nestjs/testing';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);

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
});
