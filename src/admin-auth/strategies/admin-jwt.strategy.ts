import { PrismaService } from '@/prisma/prisma.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

/**
 * Admin JWT Payload Interface
 *
 * Defines the structure of data stored in admin JWT tokens.
 * These fields are encoded in the token after admin login.
 */
export interface AdminJwtPayload {
  sub: string; // Subject: Admin User ID
  email: string; // Admin's email address
  username: string; // Admin's username
  role: 'SUPPORT' | 'MODERATOR' | 'ADMIN'; // Admin role
}

/**
 * Admin JWT Authentication Strategy
 *
 * Implements Passport JWT strategy for protecting admin routes.
 * Validates JWT tokens and retrieves admin user information.
 * Uses separate strategy name 'admin-jwt' to distinguish from regular user auth.
 *
 * Flow:
 * 1. Extract JWT token from Authorization header
 * 2. Verify token signature with admin secret
 * 3. Extract payload and validate admin exists in admin_users table
 * 4. Attach admin user object to request
 */
@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Use separate secret for admin tokens (more secure)
      secretOrKey:
        configService.get('jwt.adminSecret') || configService.get('jwt.secret'),
    });
  }

  /**
   * Validate Admin JWT payload and return admin user
   *
   * Called automatically by Passport after token verification.
   * The returned admin user object is attached to the request (req.user).
   *
   * @param payload - Decoded JWT payload
   * @returns Admin user object if valid
   * @throws UnauthorizedException if admin not found or inactive
   */
  async validate(payload: AdminJwtPayload) {
    // Fetch admin from admin_users table
    const adminUser = await this.prisma.adminUser.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        username: true,
        avatarUrl: true,
        role: true,
        isActive: true,
        mfaEnabled: true,
      },
    });

    // Reject if admin doesn't exist or account is deactivated
    if (!adminUser || !adminUser.isActive) {
      throw new UnauthorizedException('Admin user not found or inactive');
    }

    // Return admin user object (will be available as req.user in controllers)
    return adminUser;
  }
}
