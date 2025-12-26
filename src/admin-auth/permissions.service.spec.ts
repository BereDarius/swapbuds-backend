import { PrismaService } from '@/prisma/prisma.service';
import { mockPrismaService } from '@/test/mocks/prisma.mock';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AdminRole, PermissionCategory } from '@prisma/client';
import { PermissionsService } from './permissions.service';

describe('PermissionsService', () => {
  let service: PermissionsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PermissionsService>(PermissionsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllPermissions', () => {
    it('should return all permissions ordered by category and name', async () => {
      const mockPermissions = [
        {
          id: '1',
          name: 'tickets:view',
          description: 'View tickets',
          category: PermissionCategory.TICKETS,
          createdAt: new Date(),
        },
        {
          id: '2',
          name: 'users:view',
          description: 'View users',
          category: PermissionCategory.USERS,
          createdAt: new Date(),
        },
      ];

      mockPrismaService.adminPermission.findMany.mockResolvedValue(
        mockPermissions,
      );

      const result = await service.getAllPermissions();

      expect(result).toEqual(mockPermissions);
      expect(prisma.adminPermission.findMany).toHaveBeenCalledWith({
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      });
    });
  });

  describe('getPermissionsByCategory', () => {
    it('should return permissions filtered by category', async () => {
      const mockPermissions = [
        {
          id: '1',
          name: 'tickets:view',
          description: 'View tickets',
          category: PermissionCategory.TICKETS,
          createdAt: new Date(),
        },
      ];

      mockPrismaService.adminPermission.findMany.mockResolvedValue(
        mockPermissions,
      );

      const result = await service.getPermissionsByCategory(
        PermissionCategory.TICKETS,
      );

      expect(result).toEqual(mockPermissions);
      expect(prisma.adminPermission.findMany).toHaveBeenCalledWith({
        where: { category: PermissionCategory.TICKETS },
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('getAdminPermissions', () => {
    it('should return all permissions for ADMIN role', async () => {
      const adminUser = {
        id: 'admin-1',
        username: 'admin',
        role: AdminRole.ADMIN,
        permissions: [],
      };

      const allPermissions = [
        {
          id: '1',
          name: 'tickets:view',
          description: 'View tickets',
          category: PermissionCategory.TICKETS,
          createdAt: new Date(),
        },
      ];

      mockPrismaService.adminUser.findUnique.mockResolvedValue(adminUser);
      mockPrismaService.adminPermission.findMany.mockResolvedValue(
        allPermissions,
      );

      const result = await service.getAdminPermissions('admin-1');

      expect(result.hasAllPermissions).toBe(true);
      expect(result.permissions).toHaveLength(1);
    });

    it('should return granted permissions for SUPPORT role', async () => {
      const adminUser = {
        id: 'support-1',
        username: 'support',
        role: AdminRole.SUPPORT,
        permissions: [
          {
            grantedBy: 'admin-1',
            grantedAt: new Date(),
            permission: {
              id: '1',
              name: 'tickets:view',
              description: 'View tickets',
              category: PermissionCategory.TICKETS,
            },
          },
        ],
      };

      mockPrismaService.adminUser.findUnique.mockResolvedValue(adminUser);

      const result = await service.getAdminPermissions('support-1');

      expect(result.hasAllPermissions).toBe(false);
      expect(result.permissions).toHaveLength(1);
      expect(result.permissions[0].name).toBe('tickets:view');
    });

    it('should throw NotFoundException if admin not found', async () => {
      mockPrismaService.adminUser.findUnique.mockResolvedValue(null);

      await expect(service.getAdminPermissions('invalid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('grantPermissions', () => {
    it('should grant permissions to SUPPORT admin', async () => {
      const adminUser = {
        id: 'support-1',
        username: 'support',
        role: AdminRole.SUPPORT,
      };

      const permissions = [
        { id: '1', name: 'tickets:view' },
        { id: '2', name: 'tickets:assign' },
      ];

      mockPrismaService.adminUser.findUnique.mockResolvedValue(adminUser);
      mockPrismaService.adminPermission.findMany.mockResolvedValue(permissions);
      mockPrismaService.adminUserPermission.create.mockResolvedValue({});

      const result = await service.grantPermissions(
        'support-1',
        ['tickets:view', 'tickets:assign'],
        'admin-1',
      );

      expect(result.granted).toBeGreaterThan(0);
      expect(result.permissions).toEqual(['tickets:view', 'tickets:assign']);
    });

    it('should throw BadRequestException for ADMIN role', async () => {
      const adminUser = {
        id: 'admin-1',
        username: 'admin',
        role: AdminRole.ADMIN,
      };

      mockPrismaService.adminUser.findUnique.mockResolvedValue(adminUser);

      await expect(
        service.grantPermissions('admin-1', ['tickets:view'], 'admin-2'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if permissions not found', async () => {
      const adminUser = {
        id: 'support-1',
        username: 'support',
        role: AdminRole.SUPPORT,
      };

      mockPrismaService.adminUser.findUnique.mockResolvedValue(adminUser);
      mockPrismaService.adminPermission.findMany.mockResolvedValue([]);

      await expect(
        service.grantPermissions(
          'support-1',
          ['invalid:permission'],
          'admin-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('revokePermissions', () => {
    it('should revoke permissions from SUPPORT admin', async () => {
      const adminUser = {
        id: 'support-1',
        username: 'support',
        role: AdminRole.SUPPORT,
      };

      const permissions = [{ id: '1', name: 'tickets:view' }];

      mockPrismaService.adminUser.findUnique.mockResolvedValue(adminUser);
      mockPrismaService.adminPermission.findMany.mockResolvedValue(permissions);
      mockPrismaService.adminUserPermission.deleteMany.mockResolvedValue({
        count: 1,
      });

      const result = await service.revokePermissions('support-1', [
        'tickets:view',
      ]);

      expect(result.revoked).toBe(1);
    });

    it('should throw BadRequestException for ADMIN role', async () => {
      const adminUser = {
        id: 'admin-1',
        username: 'admin',
        role: AdminRole.ADMIN,
      };

      mockPrismaService.adminUser.findUnique.mockResolvedValue(adminUser);

      await expect(
        service.revokePermissions('admin-1', ['tickets:view']),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('hasPermission', () => {
    it('should return true for ADMIN role', async () => {
      mockPrismaService.adminUser.findUnique.mockResolvedValue({
        role: AdminRole.ADMIN,
      });

      const result = await service.hasPermission('admin-1', 'tickets:view');

      expect(result).toBe(true);
    });

    it('should return true if permission exists', async () => {
      mockPrismaService.adminUser.findUnique.mockResolvedValue({
        role: AdminRole.SUPPORT,
      });
      mockPrismaService.adminUserPermission.findFirst.mockResolvedValue({
        id: '1',
      });

      const result = await service.hasPermission('support-1', 'tickets:view');

      expect(result).toBe(true);
    });

    it('should return false if permission does not exist', async () => {
      mockPrismaService.adminUser.findUnique.mockResolvedValue({
        role: AdminRole.SUPPORT,
      });
      mockPrismaService.adminUserPermission.findFirst.mockResolvedValue(null);

      const result = await service.hasPermission('support-1', 'tickets:view');

      expect(result).toBe(false);
    });

    it('should return false if admin not found', async () => {
      mockPrismaService.adminUser.findUnique.mockResolvedValue(null);

      const result = await service.hasPermission('invalid', 'tickets:view');

      expect(result).toBe(false);
    });
  });
});
