import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminRole } from '@prisma/client';

/**
 * Admin Role Guard
 *
 * Enforces role-based access control for admin routes.
 * Must be used together with AdminJwtAuthGuard.
 *
 * Usage:
 * ```typescript
 * @UseGuards(AdminJwtAuthGuard, AdminRoleGuard)
 * @AdminRoles(AdminRole.ADMIN, AdminRole.MODERATOR)
 * @Delete('users/:id')
 * deleteUser(@Param('id') id: string) {
 *   // Only ADMIN and MODERATOR can access
 * }
 * ```
 */
@Injectable()
export class AdminRoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required roles from @AdminRoles() decorator
    const requiredRoles = this.reflector.getAllAndOverride<AdminRole[]>(
      'adminRoles',
      [context.getHandler(), context.getClass()],
    );

    // If no roles specified, allow access (guard is optional)
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Get admin user from request (set by AdminJwtAuthGuard)
    const request = context.switchToHttp().getRequest();
    const adminUser = request.user;

    // Check if admin has one of the required roles
    const hasRole = requiredRoles.includes(adminUser?.role);

    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied. Required roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
