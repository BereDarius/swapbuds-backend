import { PrismaService } from '@/prisma/prisma.service';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminRole } from '@prisma/client';
import { PERMISSIONS_KEY } from '../decorators/require-permission.decorator';

/**
 * Guard to check if an admin user has required permissions
 * Works in conjunction with @RequirePermission() decorator
 *
 * ADMIN role has all permissions by default
 * MODERATOR and SUPPORT roles require explicit permissions
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required permissions from decorator
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permissions required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    // Get admin user from request (set by AdminJwtAuthGuard)
    const request = context.switchToHttp().getRequest();
    const adminUser = request.user;

    if (!adminUser || !adminUser.sub) {
      this.logger.warn('PermissionsGuard: No admin user in request');
      throw new ForbiddenException('Admin authentication required');
    }

    // ADMIN role has all permissions
    if (adminUser.role === AdminRole.ADMIN) {
      this.logger.debug(
        `Admin ${adminUser.sub} (ADMIN role) granted access to ${requiredPermissions.join(', ')}`,
      );
      return true;
    }

    // Fetch admin user's permissions from database
    const adminWithPermissions = await this.prisma.adminUser.findUnique({
      where: { id: adminUser.sub },
      select: {
        id: true,
        role: true,
        permissions: {
          select: {
            permission: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!adminWithPermissions) {
      this.logger.warn(
        `PermissionsGuard: Admin user ${adminUser.sub} not found`,
      );
      throw new ForbiddenException('Admin user not found');
    }

    // Extract permission names
    const userPermissions = adminWithPermissions.permissions.map(
      (p) => p.permission.name,
    );

    // Check if user has all required permissions
    const hasAllPermissions = requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );

    if (!hasAllPermissions) {
      const missingPermissions = requiredPermissions.filter(
        (permission) => !userPermissions.includes(permission),
      );

      this.logger.warn(
        `Admin ${adminUser.sub} denied access. Missing permissions: ${missingPermissions.join(', ')}`,
      );

      throw new ForbiddenException(
        `Insufficient permissions. Missing: ${missingPermissions.join(', ')}`,
      );
    }

    this.logger.debug(
      `Admin ${adminUser.sub} granted access with permissions: ${requiredPermissions.join(', ')}`,
    );

    return true;
  }
}
