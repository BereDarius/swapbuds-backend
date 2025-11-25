import { PrismaService } from '@/prisma/prisma.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

/**
 * JWT Payload Interface
 *
 * Defines the structure of data stored in JWT tokens.
 * These fields are encoded in the token after login.
 */
export interface JwtPayload {
  sub: string; // Subject: User ID (standard JWT claim)
  email: string; // User's email address
  username: string; // User's username
}

/**
 * JWT Authentication Strategy
 *
 * Implements Passport JWT strategy for protecting routes.
 * Validates JWT tokens and retrieves user information.
 *
 * Flow:
 * 1. Extract JWT token from Authorization header
 * 2. Verify token signature and expiration
 * 3. Extract payload and validate user exists
 * 4. Attach user object to request
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Extract token from 'Bearer <token>' header
      ignoreExpiration: false, // Reject expired tokens
      secretOrKey: configService.get('jwt.secret'), // Secret key for verifying token signature
    });
  }

  /**
   * Validate JWT payload and return user
   *
   * Called automatically by Passport after token verification.
   * The returned user object is attached to the request (req.user).
   *
   * @param payload - Decoded JWT payload
   * @returns User object if valid
   * @throws UnauthorizedException if user not found or inactive
   */
  async validate(payload: JwtPayload) {
    // Fetch user from database using ID from token
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        username: true,
        avatarUrl: true,
        role: true, // User role for authorization checks
        isActive: true, // Check if account is still active
      },
    });

    // Reject if user doesn't exist or account is deactivated
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Return user object (will be available as req.user in controllers)
    return user;
  }
}
