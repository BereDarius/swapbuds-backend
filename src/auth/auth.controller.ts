import { AuthService } from '@/auth/auth.service';
import { CurrentUser, Public } from '@/auth/decorators/auth.decorators';
import { AuthResponseDto, LoginDto, RegisterDto } from '@/auth/dto/auth.dto';
import {
  DisableMFADto,
  EnableMFADto,
  MFARequiredResponseDto,
  MFASetupResponseDto,
  RegenerateBackupCodesDto,
  VerifyMFASetupDto,
} from '@/auth/dto/mfa.dto';
import {
  OAuthAccountResponseDto,
  UnlinkOAuthAccountDto,
} from '@/auth/dto/oauth.dto';
import { MFAService } from '@/auth/mfa.service';
import { OAuthService } from '@/auth/oauth.service';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
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
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly mfaService: MFAService,
    private readonly oauthService: OAuthService,
  ) {}

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
   * If MFA is enabled, returns MFA challenge with temporary token.
   *
   * @param loginDto - Login credentials (email, password, optional mfaCode/mfaToken)
   * @returns JWT token and user profile, or MFA challenge
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
  @ApiResponse({
    status: 200,
    description: 'MFA required',
    type: MFARequiredResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() loginDto: LoginDto,
  ): Promise<AuthResponseDto | MFARequiredResponseDto> {
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

  // ==================== EMAIL VERIFICATION ENDPOINTS ====================

  /**
   * Verify email address with token
   *
   * Verifies user's email address using the token sent via email.
   * Token expires after 24 hours.
   *
   * @param token - Verification token from email
   * @returns Success message
   */
  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyEmail(
    @Body() body: { token: string },
  ): Promise<{ message: string }> {
    return this.authService.verifyEmail(body.token);
  }

  /**
   * Resend verification email
   *
   * Sends a new verification email to the authenticated user.
   * Rate limited to once every 5 minutes.
   *
   * @param user - Current user (injected by @CurrentUser decorator)
   * @returns Success message
   */
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Resend verification email' })
  @ApiResponse({ status: 200, description: 'Verification email sent' })
  @ApiResponse({
    status: 400,
    description: 'Email already verified or rate limit exceeded',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async resendVerificationEmail(
    @CurrentUser() user: any,
  ): Promise<{ message: string }> {
    return this.authService.resendVerificationEmail(user.id);
  }

  // ==================== MFA ENDPOINTS ====================

  /**
   * Setup MFA for current user
   *
   * Generates TOTP secret, QR code, and backup codes.
   * User must verify the setup with a code before MFA is enabled.
   *
   * @param user - Current user (injected by @CurrentUser decorator)
   * @param enableMFADto - User's password for verification
   * @returns QR code, secret, and backup codes
   */
  @Post('mfa/setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Setup MFA for user' })
  @ApiResponse({
    status: 200,
    description: 'MFA setup data',
    type: MFASetupResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid password' })
  async setupMFA(
    @CurrentUser() user: any,
    @Body() enableMFADto: EnableMFADto,
  ): Promise<MFASetupResponseDto> {
    return this.mfaService.setupMFA(user.id, enableMFADto.password);
  }

  /**
   * Verify MFA setup and enable MFA
   *
   * Verifies the TOTP code from authenticator app and enables MFA for the user.
   *
   * @param user - Current user (injected by @CurrentUser decorator)
   * @param verifyMFASetupDto - TOTP code from authenticator app
   * @returns Success status
   */
  @Post('mfa/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Verify and enable MFA' })
  @ApiResponse({ status: 200, description: 'MFA enabled successfully' })
  @ApiResponse({ status: 401, description: 'Invalid code' })
  async verifyMFASetup(
    @CurrentUser() user: any,
    @Body() verifyMFASetupDto: VerifyMFASetupDto,
  ): Promise<{ success: boolean; message: string }> {
    await this.mfaService.verifyAndEnableMFA(user.id, verifyMFASetupDto.code);
    return { success: true, message: 'MFA enabled successfully' };
  }

  /**
   * Disable MFA for current user
   *
   * Disables MFA after verifying password and TOTP code.
   *
   * @param user - Current user (injected by @CurrentUser decorator)
   * @param disableMFADto - Password and TOTP code
   * @returns Success status
   */
  @Post('mfa/disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Disable MFA' })
  @ApiResponse({ status: 200, description: 'MFA disabled successfully' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async disableMFA(
    @CurrentUser() user: any,
    @Body() disableMFADto: DisableMFADto,
  ): Promise<{ success: boolean; message: string }> {
    await this.mfaService.disableMFA(
      user.id,
      disableMFADto.password,
      disableMFADto.code,
    );
    return { success: true, message: 'MFA disabled successfully' };
  }

  /**
   * Regenerate backup codes
   *
   * Generates new backup codes after verifying password and TOTP code.
   *
   * @param user - Current user (injected by @CurrentUser decorator)
   * @param regenerateBackupCodesDto - Password and TOTP code
   * @returns New backup codes
   */
  @Post('mfa/regenerate-backup-codes')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Regenerate MFA backup codes' })
  @ApiResponse({
    status: 200,
    description: 'New backup codes generated',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async regenerateBackupCodes(
    @CurrentUser() user: any,
    @Body() regenerateBackupCodesDto: RegenerateBackupCodesDto,
  ): Promise<{ backupCodes: string[] }> {
    const backupCodes = await this.mfaService.regenerateBackupCodes(
      user.id,
      regenerateBackupCodesDto.password,
      regenerateBackupCodesDto.code,
    );
    return { backupCodes };
  }

  // ==================== OAUTH ENDPOINTS ====================

  /**
   * Initiate Google OAuth login
   *
   * Redirects to Google OAuth consent screen.
   */
  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  @ApiResponse({ status: 302, description: 'Redirect to Google' })
  async googleLogin() {
    // Guard handles redirect
  }

  /**
   * Google OAuth callback
   *
   * Handles OAuth callback from Google and returns JWT token.
   */
  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback' })
  @ApiResponse({ status: 302, description: 'Redirect with JWT token' })
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const { user } = req as any;
    const token = await this.oauthService.generateOAuthToken(user.id);

    // Redirect to frontend with token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  }

  /**
   * Initiate Facebook OAuth login
   *
   * Redirects to Facebook OAuth consent screen.
   */
  @Public()
  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  @ApiOperation({ summary: 'Initiate Facebook OAuth login' })
  @ApiResponse({ status: 302, description: 'Redirect to Facebook' })
  async facebookLogin() {
    // Guard handles redirect
  }

  /**
   * Facebook OAuth callback
   *
   * Handles OAuth callback from Facebook and returns JWT token.
   */
  @Public()
  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  @ApiOperation({ summary: 'Facebook OAuth callback' })
  @ApiResponse({ status: 302, description: 'Redirect with JWT token' })
  async facebookCallback(@Req() req: Request, @Res() res: Response) {
    const { user } = req as any;
    const token = await this.oauthService.generateOAuthToken(user.id);

    // Redirect to frontend with token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  }

  /**
   * Initiate Apple OAuth login
   *
   * Redirects to Apple OAuth consent screen.
   */
  @Public()
  @Get('apple')
  @UseGuards(AuthGuard('apple'))
  @ApiOperation({ summary: 'Initiate Apple OAuth login' })
  @ApiResponse({ status: 302, description: 'Redirect to Apple' })
  async appleLogin() {
    // Guard handles redirect
  }

  /**
   * Apple OAuth callback
   *
   * Handles OAuth callback from Apple and returns JWT token.
   */
  @Public()
  @Get('apple/callback')
  @UseGuards(AuthGuard('apple'))
  @ApiOperation({ summary: 'Apple OAuth callback' })
  @ApiResponse({ status: 302, description: 'Redirect with JWT token' })
  async appleCallback(@Req() req: Request, @Res() res: Response) {
    const { user } = req as any;
    const token = await this.oauthService.generateOAuthToken(user.id);

    // Redirect to frontend with token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  }

  // ==================== OAUTH ACCOUNT MANAGEMENT ====================

  /**
   * Unlink OAuth account from current user
   *
   * Removes an OAuth provider link from the authenticated user.
   * Requires password verification and at least one auth method remaining.
   *
   * @param user - Current user (injected by @CurrentUser decorator)
   * @param unlinkOAuthAccountDto - Provider and password
   * @returns Success status
   */
  @Post('oauth/unlink')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Unlink OAuth account from user' })
  @ApiResponse({ status: 200, description: 'OAuth account unlinked' })
  @ApiResponse({ status: 401, description: 'Invalid password' })
  @ApiResponse({
    status: 400,
    description: 'Cannot unlink last authentication method',
  })
  async unlinkOAuthAccount(
    @CurrentUser() user: any,
    @Body() unlinkOAuthAccountDto: UnlinkOAuthAccountDto,
  ): Promise<{ success: boolean; message: string }> {
    await this.oauthService.unlinkOAuthAccount(
      user.id,
      unlinkOAuthAccountDto.provider,
      unlinkOAuthAccountDto.password,
    );
    return { success: true, message: 'OAuth account unlinked successfully' };
  }

  /**
   * Get linked OAuth accounts
   *
   * Returns list of OAuth providers linked to the authenticated user.
   *
   * @param user - Current user (injected by @CurrentUser decorator)
   * @returns List of linked OAuth accounts
   */
  @Get('oauth/accounts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get linked OAuth accounts' })
  @ApiResponse({
    status: 200,
    description: 'List of linked OAuth accounts',
    type: [OAuthAccountResponseDto],
  })
  async getLinkedAccounts(
    @CurrentUser() user: any,
  ): Promise<OAuthAccountResponseDto[]> {
    return this.oauthService.getLinkedAccounts(user.id);
  }
}
