import { PrismaService } from '@/prisma/prisma.service';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AdminRole, PermissionCategory } from '@prisma/client';

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get all available permissions
   */
  async getAllPermissions() {
    return this.prisma.adminPermission.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Get permissions by category
   */
  async getPermissionsByCategory(category: PermissionCategory) {
    return this.prisma.adminPermission.findMany({
      where: { category },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get permissions for a specific admin user
   */
  async getAdminPermissions(adminUserId: string) {
    const adminUser = await this.prisma.adminUser.findUnique({
      where: { id: adminUserId },
      select: {
        id: true,
        username: true,
        role: true,
        permissions: {
          include: {
            permission: true,
          },
          orderBy: {
            grantedAt: 'desc',
          },
        },
      },
    });

    if (!adminUser) {
      throw new NotFoundException('Admin user not found');
    }

    // ADMIN role has all permissions
    if (adminUser.role === AdminRole.ADMIN) {
      const allPermissions = await this.getAllPermissions();
      return {
        adminUser: {
          id: adminUser.id,
          username: adminUser.username,
          role: adminUser.role,
        },
        hasAllPermissions: true,
        permissions: allPermissions.map((permission) => ({
          id: permission.id,
          name: permission.name,
          description: permission.description,
          category: permission.category,
          grantedBy: 'SYSTEM',
          grantedAt: adminUser.permissions[0]?.grantedAt || new Date(),
        })),
      };
    }

    return {
      adminUser: {
        id: adminUser.id,
        username: adminUser.username,
        role: adminUser.role,
      },
      hasAllPermissions: false,
      permissions: adminUser.permissions.map((p) => ({
        id: p.permission.id,
        name: p.permission.name,
        description: p.permission.description,
        category: p.permission.category,
        grantedBy: p.grantedBy,
        grantedAt: p.grantedAt,
      })),
    };
  }

  /**
   * Grant permissions to an admin user
   */
  async grantPermissions(
    adminUserId: string,
    permissionNames: string[],
    grantedBy: string,
  ) {
    // Check if admin exists
    const adminUser = await this.prisma.adminUser.findUnique({
      where: { id: adminUserId },
      select: { id: true, role: true, username: true },
    });

    if (!adminUser) {
      throw new NotFoundException('Admin user not found');
    }

    // ADMIN role already has all permissions
    if (adminUser.role === AdminRole.ADMIN) {
      throw new BadRequestException(
        'ADMIN role already has all permissions. No need to grant explicitly.',
      );
    }

    // Get permission IDs
    const permissions = await this.prisma.adminPermission.findMany({
      where: { name: { in: permissionNames } },
      select: { id: true, name: true },
    });

    const foundPermissionNames = permissions.map((p) => p.name);
    const notFoundPermissions = permissionNames.filter(
      (name) => !foundPermissionNames.includes(name),
    );

    if (notFoundPermissions.length > 0) {
      throw new BadRequestException(
        `Permissions not found: ${notFoundPermissions.join(', ')}`,
      );
    }

    // Grant permissions (skip if already granted)
    const results = await Promise.allSettled(
      permissions.map((permission) =>
        this.prisma.adminUserPermission.create({
          data: {
            adminUserId,
            permissionId: permission.id,
            grantedBy,
          },
          include: {
            permission: true,
          },
        }),
      ),
    );

    const granted = results.filter((r) => r.status === 'fulfilled').length;
    const alreadyGranted = results.filter(
      (r) => r.status === 'rejected',
    ).length;

    this.logger.log(
      `Granted ${granted} permissions to admin ${adminUser.username}. ${alreadyGranted} already granted.`,
    );

    return {
      adminUserId,
      granted,
      alreadyGranted,
      permissions: permissionNames,
    };
  }

  /**
   * Revoke permissions from an admin user
   */
  async revokePermissions(adminUserId: string, permissionNames: string[]) {
    // Check if admin exists
    const adminUser = await this.prisma.adminUser.findUnique({
      where: { id: adminUserId },
      select: { id: true, role: true, username: true },
    });

    if (!adminUser) {
      throw new NotFoundException('Admin user not found');
    }

    // Cannot revoke permissions from ADMIN role
    if (adminUser.role === AdminRole.ADMIN) {
      throw new BadRequestException(
        'Cannot revoke permissions from ADMIN role. Change role first.',
      );
    }

    // Get permission IDs
    const permissions = await this.prisma.adminPermission.findMany({
      where: { name: { in: permissionNames } },
      select: { id: true },
    });

    const permissionIds = permissions.map((p) => p.id);

    // Revoke permissions
    const result = await this.prisma.adminUserPermission.deleteMany({
      where: {
        adminUserId,
        permissionId: { in: permissionIds },
      },
    });

    this.logger.log(
      `Revoked ${result.count} permissions from admin ${adminUser.username}`,
    );

    return {
      adminUserId,
      revoked: result.count,
      permissions: permissionNames,
    };
  }

  /**
   * Revoke all permissions from an admin user
   */
  async revokeAllPermissions(adminUserId: string) {
    const adminUser = await this.prisma.adminUser.findUnique({
      where: { id: adminUserId },
      select: { id: true, role: true, username: true },
    });

    if (!adminUser) {
      throw new NotFoundException('Admin user not found');
    }

    if (adminUser.role === AdminRole.ADMIN) {
      throw new BadRequestException(
        'Cannot revoke permissions from ADMIN role.',
      );
    }

    const result = await this.prisma.adminUserPermission.deleteMany({
      where: { adminUserId },
    });

    this.logger.log(
      `Revoked all ${result.count} permissions from admin ${adminUser.username}`,
    );

    return {
      adminUserId,
      revoked: result.count,
    };
  }

  /**
   * Check if admin has specific permission
   */
  async hasPermission(
    adminUserId: string,
    permissionName: string,
  ): Promise<boolean> {
    const adminUser = await this.prisma.adminUser.findUnique({
      where: { id: adminUserId },
      select: { role: true },
    });

    if (!adminUser) {
      return false;
    }

    // ADMIN role has all permissions
    if (adminUser.role === AdminRole.ADMIN) {
      return true;
    }

    const permission = await this.prisma.adminUserPermission.findFirst({
      where: {
        adminUserId,
        permission: { name: permissionName },
      },
    });

    return !!permission;
  }

  /**
   * Check if admin has all of the specified permissions
   */
  async hasAllPermissions(
    adminUserId: string,
    permissionNames: string[],
  ): Promise<boolean> {
    const adminUser = await this.prisma.adminUser.findUnique({
      where: { id: adminUserId },
      select: { role: true },
    });

    if (!adminUser) {
      return false;
    }

    // ADMIN role has all permissions
    if (adminUser.role === AdminRole.ADMIN) {
      return true;
    }

    const userPermissions = await this.prisma.adminUserPermission.findMany({
      where: {
        adminUserId,
        permission: { name: { in: permissionNames } },
      },
      include: { permission: true },
    });

    const userPermissionNames = userPermissions.map((p) => p.permission.name);

    return permissionNames.every((name) => userPermissionNames.includes(name));
  }
}
