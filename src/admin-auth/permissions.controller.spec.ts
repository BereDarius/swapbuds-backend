import { PrismaService } from '@/prisma/prisma.service';
import {
  mockAdminRequest,
  mockPermissionsService,
  resetPermissionsServiceMocks,
} from '@/test/mocks/permissions.mock';
import { mockPrismaService } from '@/test/mocks/prisma.mock';
import { Test, TestingModule } from '@nestjs/testing';
import { PermissionCategory } from '@prisma/client';
import {
  GrantPermissionsDto,
  RevokePermissionsDto,
} from './dto/permissions.dto';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';

describe('PermissionsController', () => {
  let controller: PermissionsController;
  let service: PermissionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PermissionsController],
      providers: [
        {
          provide: PermissionsService,
          useValue: mockPermissionsService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<PermissionsController>(PermissionsController);
    service = module.get<PermissionsService>(PermissionsService);
    resetPermissionsServiceMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllPermissions', () => {
    it('should return all permissions', async () => {
      const mockPermissions = [
        {
          id: '1',
          name: 'tickets:view',
          description: 'View support tickets',
          category: PermissionCategory.TICKETS,
          createdAt: new Date(),
        },
        {
          id: '2',
          name: 'tickets:assign',
          description: 'Assign tickets to agents',
          category: PermissionCategory.TICKETS,
          createdAt: new Date(),
        },
      ];

      mockPermissionsService.getAllPermissions.mockResolvedValue(
        mockPermissions,
      );

      const result = await controller.getAllPermissions();

      expect(result).toEqual(mockPermissions);
      expect(service.getAllPermissions).toHaveBeenCalledTimes(1);
    });

    it('should return empty array if no permissions exist', async () => {
      mockPermissionsService.getAllPermissions.mockResolvedValue([]);

      const result = await controller.getAllPermissions();

      expect(result).toEqual([]);
    });
  });

  describe('getPermissionsByCategory', () => {
    it('should return permissions filtered by category', async () => {
      const mockPermissions = [
        {
          id: '1',
          name: 'tickets:view',
          description: 'View support tickets',
          category: PermissionCategory.TICKETS,
          createdAt: new Date(),
        },
      ];

      mockPermissionsService.getPermissionsByCategory.mockResolvedValue(
        mockPermissions,
      );

      const result = await controller.getPermissionsByCategory(
        PermissionCategory.TICKETS,
      );

      expect(result).toEqual(mockPermissions);
      expect(service.getPermissionsByCategory).toHaveBeenCalledWith(
        PermissionCategory.TICKETS,
      );
    });

    it('should handle MODERATION category', async () => {
      const mockPermissions = [
        {
          id: '3',
          name: 'moderation:flags_view',
          description: 'View flagged content',
          category: PermissionCategory.MODERATION,
          createdAt: new Date(),
        },
      ];

      mockPermissionsService.getPermissionsByCategory.mockResolvedValue(
        mockPermissions,
      );

      const result = await controller.getPermissionsByCategory(
        PermissionCategory.MODERATION,
      );

      expect(result).toEqual(mockPermissions);
      expect(service.getPermissionsByCategory).toHaveBeenCalledWith(
        PermissionCategory.MODERATION,
      );
    });

    it('should return empty array if no permissions in category', async () => {
      mockPermissionsService.getPermissionsByCategory.mockResolvedValue([]);

      const result = await controller.getPermissionsByCategory(
        PermissionCategory.USERS,
      );

      expect(result).toEqual([]);
    });
  });

  describe('getAdminPermissions', () => {
    it('should return permissions for ADMIN role (all permissions)', async () => {
      const mockResponse = {
        adminUser: {
          id: 'admin-1',
          username: 'admin',
          role: 'ADMIN',
        },
        hasAllPermissions: true,
        permissions: [
          {
            id: '1',
            name: 'tickets:view',
            description: 'View tickets',
            category: PermissionCategory.TICKETS,
            grantedBy: 'SYSTEM',
            grantedAt: new Date(),
          },
        ],
      };

      mockPermissionsService.getAdminPermissions.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.getAdminPermissions('admin-1');

      expect(result).toEqual(mockResponse);
      expect(result.hasAllPermissions).toBe(true);
      expect(service.getAdminPermissions).toHaveBeenCalledWith('admin-1');
    });

    it('should return granted permissions for SUPPORT role', async () => {
      const mockResponse = {
        adminUser: {
          id: 'support-1',
          username: 'support',
          role: 'SUPPORT',
        },
        hasAllPermissions: false,
        permissions: [
          {
            id: '1',
            name: 'tickets:view',
            description: 'View tickets',
            category: PermissionCategory.TICKETS,
            grantedBy: 'admin-1',
            grantedAt: new Date(),
          },
        ],
      };

      mockPermissionsService.getAdminPermissions.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.getAdminPermissions('support-1');

      expect(result).toEqual(mockResponse);
      expect(result.hasAllPermissions).toBe(false);
      expect(result.permissions).toHaveLength(1);
    });

    it('should return empty permissions array for MODERATOR with no permissions', async () => {
      const mockResponse = {
        adminUser: {
          id: 'mod-1',
          username: 'moderator',
          role: 'MODERATOR',
        },
        hasAllPermissions: false,
        permissions: [],
      };

      mockPermissionsService.getAdminPermissions.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.getAdminPermissions('mod-1');

      expect(result.permissions).toEqual([]);
      expect(result.hasAllPermissions).toBe(false);
    });
  });

  describe('grantPermissions', () => {
    it('should grant permissions to admin user', async () => {
      const dto: GrantPermissionsDto = {
        adminUserId: 'support-1',
        permissions: ['tickets:view', 'tickets:assign'],
      };

      const mockResponse = {
        adminUserId: 'support-1',
        granted: 2,
        alreadyGranted: 0,
        permissions: ['tickets:view', 'tickets:assign'],
      };

      mockPermissionsService.grantPermissions.mockResolvedValue(mockResponse);

      const result = await controller.grantPermissions(dto, mockAdminRequest);

      expect(result).toEqual(mockResponse);
      expect(service.grantPermissions).toHaveBeenCalledWith(
        'support-1',
        ['tickets:view', 'tickets:assign'],
        'admin-123',
      );
    });

    it('should handle partial grant (some already granted)', async () => {
      const dto: GrantPermissionsDto = {
        adminUserId: 'support-1',
        permissions: ['tickets:view', 'tickets:assign', 'tickets:close'],
      };

      const mockResponse = {
        adminUserId: 'support-1',
        granted: 2,
        alreadyGranted: 1,
        permissions: ['tickets:view', 'tickets:assign', 'tickets:close'],
      };

      mockPermissionsService.grantPermissions.mockResolvedValue(mockResponse);

      const result = await controller.grantPermissions(dto, mockAdminRequest);

      expect(result.granted).toBe(2);
      expect(result.alreadyGranted).toBe(1);
    });

    it('should grant single permission', async () => {
      const dto: GrantPermissionsDto = {
        adminUserId: 'support-1',
        permissions: ['tickets:view'],
      };

      const mockResponse = {
        adminUserId: 'support-1',
        granted: 1,
        alreadyGranted: 0,
        permissions: ['tickets:view'],
      };

      mockPermissionsService.grantPermissions.mockResolvedValue(mockResponse);

      const result = await controller.grantPermissions(dto, mockAdminRequest);

      expect(result.granted).toBe(1);
      expect(result.permissions).toEqual(['tickets:view']);
    });

    it('should pass correct granter ID from authenticated admin', async () => {
      const dto: GrantPermissionsDto = {
        adminUserId: 'support-1',
        permissions: ['tickets:view'],
      };

      const customRequest = {
        user: {
          sub: 'granter-999',
          email: 'granter@example.com',
          username: 'granter',
          role: 'ADMIN',
        },
      };

      mockPermissionsService.grantPermissions.mockResolvedValue({
        adminUserId: 'support-1',
        granted: 1,
        alreadyGranted: 0,
        permissions: ['tickets:view'],
      });

      await controller.grantPermissions(dto, customRequest);

      expect(service.grantPermissions).toHaveBeenCalledWith(
        'support-1',
        ['tickets:view'],
        'granter-999',
      );
    });
  });

  describe('revokePermissions', () => {
    it('should revoke permissions from admin user', async () => {
      const dto: RevokePermissionsDto = {
        adminUserId: 'support-1',
        permissions: ['tickets:delete'],
      };

      const mockResponse = {
        adminUserId: 'support-1',
        revoked: 1,
        permissions: ['tickets:delete'],
      };

      mockPermissionsService.revokePermissions.mockResolvedValue(mockResponse);

      const result = await controller.revokePermissions(dto);

      expect(result).toEqual(mockResponse);
      expect(service.revokePermissions).toHaveBeenCalledWith('support-1', [
        'tickets:delete',
      ]);
    });

    it('should revoke multiple permissions', async () => {
      const dto: RevokePermissionsDto = {
        adminUserId: 'support-1',
        permissions: ['tickets:delete', 'users:edit', 'moderation:user_ban'],
      };

      const mockResponse = {
        adminUserId: 'support-1',
        revoked: 3,
        permissions: ['tickets:delete', 'users:edit', 'moderation:user_ban'],
      };

      mockPermissionsService.revokePermissions.mockResolvedValue(mockResponse);

      const result = await controller.revokePermissions(dto);

      expect(result.revoked).toBe(3);
      expect(result.permissions).toHaveLength(3);
    });

    it('should handle revoking non-existent permissions (0 revoked)', async () => {
      const dto: RevokePermissionsDto = {
        adminUserId: 'support-1',
        permissions: ['non:existent'],
      };

      const mockResponse = {
        adminUserId: 'support-1',
        revoked: 0,
        permissions: ['non:existent'],
      };

      mockPermissionsService.revokePermissions.mockResolvedValue(mockResponse);

      const result = await controller.revokePermissions(dto);

      expect(result.revoked).toBe(0);
    });
  });

  describe('revokeAllPermissions', () => {
    it('should revoke all permissions from admin user', async () => {
      const mockResponse = {
        adminUserId: 'support-1',
        revoked: 5,
      };

      mockPermissionsService.revokeAllPermissions.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.revokeAllPermissions('support-1');

      expect(result).toEqual(mockResponse);
      expect(result.revoked).toBe(5);
      expect(service.revokeAllPermissions).toHaveBeenCalledWith('support-1');
    });

    it('should handle admin with no permissions (0 revoked)', async () => {
      const mockResponse = {
        adminUserId: 'support-1',
        revoked: 0,
      };

      mockPermissionsService.revokeAllPermissions.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.revokeAllPermissions('support-1');

      expect(result.revoked).toBe(0);
    });

    it('should work with different admin IDs', async () => {
      const mockResponse = {
        adminUserId: 'moderator-99',
        revoked: 3,
      };

      mockPermissionsService.revokeAllPermissions.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.revokeAllPermissions('moderator-99');

      expect(result.adminUserId).toBe('moderator-99');
      expect(service.revokeAllPermissions).toHaveBeenCalledWith('moderator-99');
    });
  });
});
