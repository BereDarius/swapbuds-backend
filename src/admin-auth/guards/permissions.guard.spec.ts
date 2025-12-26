import { PrismaService } from '@/prisma/prisma.service';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { AdminRole } from '@prisma/client';
import { PERMISSIONS_KEY } from '../decorators/require-permission.decorator';
import { PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;

  const mockPrismaService = {
    adminUser: {
      findUnique: jest.fn(),
    },
  };

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    guard = module.get<PermissionsGuard>(PermissionsGuard);
  });

  const createMockExecutionContext = (user: any): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
        }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;
  };

  describe('no permissions required', () => {
    it('should allow access when no permissions are required', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(null);

      const context = createMockExecutionContext({
        sub: 'admin-1',
        role: AdminRole.MODERATOR,
      });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockPrismaService.adminUser.findUnique).not.toHaveBeenCalled();
    });

    it('should allow access when empty permissions array', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([]);

      const context = createMockExecutionContext({
        sub: 'admin-1',
        role: AdminRole.MODERATOR,
      });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockPrismaService.adminUser.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('authentication check', () => {
    it('should throw ForbiddenException when no user in request', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(['admin:users_view']);

      const context = createMockExecutionContext(null);

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Admin authentication required',
      );
    });

    it('should throw ForbiddenException when user has no sub', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(['admin:users_view']);

      const context = createMockExecutionContext({ role: AdminRole.MODERATOR });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Admin authentication required',
      );
    });
  });

  describe('ADMIN role', () => {
    it('should grant access to ADMIN role without checking permissions', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([
        'admin:users_view',
        'admin:users_edit',
      ]);

      const context = createMockExecutionContext({
        sub: 'admin-1',
        role: AdminRole.ADMIN,
      });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockPrismaService.adminUser.findUnique).not.toHaveBeenCalled();
    });

    it('should grant ADMIN access to any permission', async () => {
      const permissions = [
        'admin:users_view',
        'admin:users_edit',
        'admin:items_delete',
        'admin:disputes_resolve',
      ];

      mockReflector.getAllAndOverride.mockReturnValue(permissions);

      const context = createMockExecutionContext({
        sub: 'admin-1',
        role: AdminRole.ADMIN,
      });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('MODERATOR/SUPPORT role with permissions', () => {
    it('should grant access when user has required permission', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(['admin:users_view']);

      const adminWithPermissions = {
        id: 'moderator-1',
        role: AdminRole.MODERATOR,
        permissions: [
          {
            permission: {
              name: 'admin:users_view',
            },
          },
        ],
      };

      mockPrismaService.adminUser.findUnique.mockResolvedValue(
        adminWithPermissions,
      );

      const context = createMockExecutionContext({
        sub: 'moderator-1',
        role: AdminRole.MODERATOR,
      });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockPrismaService.adminUser.findUnique).toHaveBeenCalledWith({
        where: { id: 'moderator-1' },
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
    });

    it('should grant access when user has all required permissions', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([
        'admin:users_view',
        'admin:users_edit',
      ]);

      const adminWithPermissions = {
        id: 'moderator-1',
        role: AdminRole.MODERATOR,
        permissions: [
          { permission: { name: 'admin:users_view' } },
          { permission: { name: 'admin:users_edit' } },
          { permission: { name: 'admin:items_view' } },
        ],
      };

      mockPrismaService.adminUser.findUnique.mockResolvedValue(
        adminWithPermissions,
      );

      const context = createMockExecutionContext({
        sub: 'moderator-1',
        role: AdminRole.MODERATOR,
      });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny access when user is missing one permission', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([
        'admin:users_view',
        'admin:users_delete',
      ]);

      const adminWithPermissions = {
        id: 'moderator-1',
        role: AdminRole.MODERATOR,
        permissions: [{ permission: { name: 'admin:users_view' } }],
      };

      mockPrismaService.adminUser.findUnique.mockResolvedValue(
        adminWithPermissions,
      );

      const context = createMockExecutionContext({
        sub: 'moderator-1',
        role: AdminRole.MODERATOR,
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'admin:users_delete',
      );
    });

    it('should deny access when user has no permissions', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(['admin:users_view']);

      const adminWithPermissions = {
        id: 'support-1',
        role: AdminRole.SUPPORT,
        permissions: [],
      };

      mockPrismaService.adminUser.findUnique.mockResolvedValue(
        adminWithPermissions,
      );

      const context = createMockExecutionContext({
        sub: 'support-1',
        role: AdminRole.SUPPORT,
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'admin:users_view',
      );
    });

    it('should throw ForbiddenException when admin user not found in database', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(['admin:users_view']);
      mockPrismaService.adminUser.findUnique.mockResolvedValue(null);

      const context = createMockExecutionContext({
        sub: 'nonexistent-id',
        role: AdminRole.MODERATOR,
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Admin user not found',
      );
    });
  });

  describe('multiple required permissions', () => {
    it('should grant access with multiple permissions', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([
        'admin:users_view',
        'admin:users_edit',
        'admin:users_ban',
      ]);

      const adminWithPermissions = {
        id: 'moderator-1',
        role: AdminRole.MODERATOR,
        permissions: [
          { permission: { name: 'admin:users_view' } },
          { permission: { name: 'admin:users_edit' } },
          { permission: { name: 'admin:users_ban' } },
          { permission: { name: 'admin:items_view' } },
        ],
      };

      mockPrismaService.adminUser.findUnique.mockResolvedValue(
        adminWithPermissions,
      );

      const context = createMockExecutionContext({
        sub: 'moderator-1',
        role: AdminRole.MODERATOR,
      });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should list all missing permissions in error', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([
        'admin:users_view',
        'admin:users_edit',
        'admin:users_delete',
      ]);

      const adminWithPermissions = {
        id: 'moderator-1',
        role: AdminRole.MODERATOR,
        permissions: [{ permission: { name: 'admin:users_view' } }],
      };

      mockPrismaService.adminUser.findUnique.mockResolvedValue(
        adminWithPermissions,
      );

      const context = createMockExecutionContext({
        sub: 'moderator-1',
        role: AdminRole.MODERATOR,
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'admin:users_edit',
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'admin:users_delete',
      );
    });
  });

  describe('different admin roles', () => {
    it('should check permissions for MODERATOR role', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(['admin:items_view']);

      const adminWithPermissions = {
        id: 'mod-1',
        role: AdminRole.MODERATOR,
        permissions: [{ permission: { name: 'admin:items_view' } }],
      };

      mockPrismaService.adminUser.findUnique.mockResolvedValue(
        adminWithPermissions,
      );

      const context = createMockExecutionContext({
        sub: 'mod-1',
        role: AdminRole.MODERATOR,
      });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should check permissions for SUPPORT role', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(['admin:tickets_view']);

      const adminWithPermissions = {
        id: 'support-1',
        role: AdminRole.SUPPORT,
        permissions: [{ permission: { name: 'admin:tickets_view' } }],
      };

      mockPrismaService.adminUser.findUnique.mockResolvedValue(
        adminWithPermissions,
      );

      const context = createMockExecutionContext({
        sub: 'support-1',
        role: AdminRole.SUPPORT,
      });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('reflector integration', () => {
    it('should get permissions from both handler and class', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(['admin:users_view']);

      const context = createMockExecutionContext({
        sub: 'admin-1',
        role: AdminRole.ADMIN,
      });
      await guard.canActivate(context);

      expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(
        PERMISSIONS_KEY,
        [context.getHandler(), context.getClass()],
      );
    });

    it('should merge permissions from handler and class', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([
        'admin:users_view',
        'admin:items_view',
      ]);

      const adminWithPermissions = {
        id: 'mod-1',
        role: AdminRole.MODERATOR,
        permissions: [
          { permission: { name: 'admin:users_view' } },
          { permission: { name: 'admin:items_view' } },
        ],
      };

      mockPrismaService.adminUser.findUnique.mockResolvedValue(
        adminWithPermissions,
      );

      const context = createMockExecutionContext({
        sub: 'mod-1',
        role: AdminRole.MODERATOR,
      });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });
});
