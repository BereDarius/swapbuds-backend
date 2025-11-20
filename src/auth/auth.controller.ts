import { AuthService } from '@auth/auth.service';
import { CurrentUser, Public } from '@auth/decorators/auth.decorators';
import { AuthResponseDto, LoginDto, RegisterDto } from '@auth/dto/auth.dto';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

/**
 * Authentication Controller
 *
 * Handles user registration, login, and profile retrieval.
 * All routes under /api/auth
 *
 * Public routes (no auth required):
 * - POST /register - Create new account
 * - POST /login - Authenticate user
 *
 * Protected routes (JWT required):
 * - GET /me - Get current user profile
 */
@ApiTags('auth') // Group in Swagger docs
@Controller('auth') // Base route: /api/auth
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Register a new user
   *
   * Creates a new user account with hashed password.
   * Returns JWT token for immediate authentication.
   *
   * @param registerDto - User registration data (username, email, password)
   * @returns JWT token and user profile
   */
  @Public() // No authentication required
  @Post('register') // POST /api/auth/register
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Email or username already exists' })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  /**
   * Login existing user
   *
   * Validates credentials and returns JWT token.
   *
   * @param loginDto - Login credentials (email, password)
   * @returns JWT token and user profile
   */
  @Public() // No authentication required
  @Post('login') // POST /api/auth/login
  @HttpCode(HttpStatus.OK) // Return 200 instead of default 201
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged in',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  /**
   * Get current authenticated user
   *
   * Returns profile information for the logged-in user.
   * Requires valid JWT token in Authorization header.
   *
   * @param user - Current user (injected by @CurrentUser decorator)
   * @returns User profile information
   */
  @Get('me') // GET /api/auth/me
  @UseGuards(JwtAuthGuard) // Requires authentication
  @ApiBearerAuth('access-token') // Swagger: requires Bearer token
  @ApiOperation({ summary: 'Get current user' })
  @ApiResponse({ status: 200, description: 'Current user info' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMe(@CurrentUser() user: any) {
    return user; // User object from JWT token
  }
}
