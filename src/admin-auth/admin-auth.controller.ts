import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { AdminAuthService } from './admin-auth.service';
import { AdminRoles } from './decorators/admin-roles.decorator';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminRegisterDto } from './dto/admin-register.dto';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard';
import { AdminRoleGuard } from './guards/admin-role.guard';

/**
 * Admin Authentication Controller
 *
 * Handles admin-specific authentication endpoints.
 * Separate from regular user auth for security.
 */
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  /**
   * Admin Login
   *
   * POST /admin/auth/login
   * Body: { email, password, mfaCode? }
   */
  @Post('login')
  async login(@Body() adminLoginDto: AdminLoginDto) {
    return this.adminAuthService.login(adminLoginDto);
  }

  /**
   * Admin Registration
   *
   * POST /admin/auth/register
   * Only ADMIN role can create new admins
   * Requires authentication
   */
  @Post('register')
  @UseGuards(AdminJwtAuthGuard, AdminRoleGuard)
  @AdminRoles(AdminRole.ADMIN)
  async register(@Body() adminRegisterDto: AdminRegisterDto, @Request() req) {
    return this.adminAuthService.register(adminRegisterDto, req.user.id);
  }

  /**
   * Setup MFA
   *
   * POST /admin/auth/mfa/setup
   * Generates MFA secret and QR code
   */
  @Post('mfa/setup')
  @UseGuards(AdminJwtAuthGuard)
  async setupMFA(@Request() req) {
    return this.adminAuthService.setupMFA(req.user.id);
  }

  /**
   * Verify and Enable MFA
   *
   * POST /admin/auth/mfa/verify
   * Body: { mfaCode }
   */
  @Post('mfa/verify')
  @UseGuards(AdminJwtAuthGuard)
  async verifyMFA(@Body('mfaCode') mfaCode: string, @Request() req) {
    return this.adminAuthService.verifyAndEnableMFA(req.user.id, mfaCode);
  }

  /**
   * Get current admin profile
   *
   * GET /admin/auth/me
   */
  @Get('me')
  @UseGuards(AdminJwtAuthGuard)
  async getProfile(@Request() req) {
    return {
      id: req.user.id,
      email: req.user.email,
      username: req.user.username,
      role: req.user.role,
      mfaEnabled: req.user.mfaEnabled,
    };
  }
}
