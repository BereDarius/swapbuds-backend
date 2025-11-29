import { REQUIRE_VERIFIED_KEY } from '@/auth/decorators/auth.decorators';
import { PrismaService } from '@/prisma/prisma.service';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * VerifiedGuard
 *
 * Guard that checks if the authenticated user has an approved verification status.
 * This guard should be applied to routes that require verified users only.
 *
 * Usage:
 * ```typescript
 * @UseGuards(JwtAuthGuard, VerifiedGuard)
 * @Post('trade/propose')
 * proposeTrade() {}
 * ```
 */
@Injectable()
export class VerifiedGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route explicitly requires verification
    const requireVerified = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_VERIFIED_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If not explicitly required, allow access
    if (requireVerified === false) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Check if user has approved verification
    const verification = await this.prisma.userVerification.findUnique({
      where: { userId: user.id },
      select: { status: true },
    });

    if (!verification || verification.status !== 'APPROVED') {
      throw new ForbiddenException(
        'You must verify your identity before performing this action. Please complete ID verification.',
      );
    }

    return true;
  }
}
