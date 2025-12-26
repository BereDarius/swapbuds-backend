import { AdminGuard } from '@/auth/guards/admin.guard';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { mockAdminService } from '@/test/mocks/admin.mock';
import { mockAuditLogService } from '@/test/mocks/audit-log.mock';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditAction, UserRole } from '@prisma/client';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuditLogService } from './audit-log.service';

describe('AdminController', () => {
  let controller: AdminController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: AdminService,
          useValue: mockAdminService,
        },
        {
          provide: AuditLogService,
          useValue: mockAuditLogService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminController>(AdminController);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getPlatformStats', () => {
    it('should return platform statistics', async () => {
      const mockStats = {
        users: {
          total: 1000,
          active: 850,
          inactive: 150,
          newLast7Days: 45,
        },
        items: {
          total: 3000,
          available: 2000,
          inTrade: 500,
          newLast7Days: 120,
        },
        trades: {
          total: 800,
          active: 150,
          completed: 600,
          newLast7Days: 30,
        },
        verifications: {
          total: 400,
          pending: 20,
          approved: 350,
        },
      };

      mockAdminService.getPlatformStats.mockResolvedValue(mockStats);

      const result = await controller.getPlatformStats();

      expect(result).toEqual(mockStats);
      expect(mockAdminService.getPlatformStats).toHaveBeenCalled();
    });
  });

  describe('getUsers', () => {
    it('should return paginated list of users', async () => {
      const mockResponse = {
        users: [
          {
            id: 'user-1',
            username: 'john_doe',
            email: 'john@example.com',
            role: UserRole.USER,
            isActive: true,
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      };

      mockAdminService.getUsers.mockResolvedValue(mockResponse);

      const query = {
        page: 1,
        limit: 10,
        search: 'john',
        role: UserRole.USER,
        isActive: true,
      };

      const result = await controller.getUsers(query);

      expect(result).toEqual(mockResponse);
      expect(mockAdminService.getUsers).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: 'john',
        isActive: true,
      });
    });

    it('should handle query parameters with proper type conversion', async () => {
      mockAdminService.getUsers.mockResolvedValue({
        users: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });

      await controller.getUsers({ page: 2, limit: 20 });

      expect(mockAdminService.getUsers).toHaveBeenCalledWith({
        page: 2,
        limit: 20,
        isActive: undefined,
      });
    });
  });

  describe('getUserDetails', () => {
    it('should return detailed user information', async () => {
      const mockUserDetails = {
        id: 'user-1',
        username: 'john_doe',
        email: 'john@example.com',
        role: UserRole.USER,
        isActive: true,
        isVerified: true,
        createdAt: new Date(),
        _count: {
          items: 5,
          trades: 10,
        },
        auditLogs: [],
      };

      mockAdminService.getUserDetails.mockResolvedValue(mockUserDetails);

      const result = await controller.getUserDetails('user-1');

      expect(result).toEqual(mockUserDetails);
      expect(mockAdminService.getUserDetails).toHaveBeenCalledWith('user-1');
    });
  });

  describe('banUser', () => {
    it('should ban a user', async () => {
      const mockBannedUser = {
        id: 'user-1',
        username: 'john_doe',
        isActive: false,
      };

      mockAdminService.banUser.mockResolvedValue(mockBannedUser);

      const result = await controller.banUser('user-1', 'admin-1', {
        reason: 'Violating terms',
      });

      expect(result).toEqual(mockBannedUser);
      expect(mockAdminService.banUser).toHaveBeenCalledWith(
        'user-1',
        'admin-1',
        'Violating terms',
      );
    });
  });

  describe('unbanUser', () => {
    it('should unban a user', async () => {
      const mockUnbannedUser = {
        id: 'user-1',
        username: 'john_doe',
        isActive: true,
      };

      mockAdminService.unbanUser.mockResolvedValue(mockUnbannedUser);

      const result = await controller.unbanUser('user-1', 'admin-1', {
        reason: 'Appeal accepted',
      });

      expect(result).toEqual(mockUnbannedUser);
      expect(mockAdminService.unbanUser).toHaveBeenCalledWith(
        'user-1',
        'admin-1',
        'Appeal accepted',
      );
    });
  });

  describe('getAuditLogs', () => {
    it('should return audit logs', async () => {
      const mockLogs = {
        logs: [
          {
            id: 'log-1',
            action: AuditAction.USER_BAN,
            description: 'User banned',
            createdAt: new Date(),
          },
        ],
        pagination: {
          page: 1,
          limit: 50,
          total: 1,
          totalPages: 1,
        },
      };

      mockAuditLogService.getAuditLogs.mockResolvedValue(mockLogs);

      const result = await controller.getAuditLogs(
        '1',
        '50',
        AuditAction.USER_BAN,
        'admin-1',
        'User',
        'user-1',
      );

      expect(result).toEqual(mockLogs);
      expect(mockAuditLogService.getAuditLogs).toHaveBeenCalledWith({
        page: 1,
        limit: 50,
        action: AuditAction.USER_BAN,
        performedById: 'admin-1',
        targetType: 'User',
        targetId: 'user-1',
      });
    });

    it('should use default values when parameters are not provided', async () => {
      mockAuditLogService.getAuditLogs.mockResolvedValue({
        logs: [],
        pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
      });

      await controller.getAuditLogs();

      expect(mockAuditLogService.getAuditLogs).toHaveBeenCalledWith({
        page: undefined,
        limit: undefined,
        action: undefined,
        performedById: undefined,
        targetType: undefined,
        targetId: undefined,
      });
    });
  });

  describe('getAuditStats', () => {
    it('should return audit log statistics', async () => {
      const mockStats = {
        totalLogs: 100,
        recentLogs: 10,
        byAction: {
          USER_BAN: 5,
          USER_UNBAN: 3,
          ROLE_CHANGE: 2,
        },
      };

      mockAuditLogService.getAuditStats.mockResolvedValue(mockStats);

      const result = await controller.getAuditStats();

      expect(result).toEqual(mockStats);
      expect(mockAuditLogService.getAuditStats).toHaveBeenCalled();
    });
  });

  describe('bulkBanUsers', () => {
    it('should ban multiple users at once', async () => {
      const mockResponse = {
        success: true,
        bannedCount: 2,
        bannedUsers: [
          { id: 'user-1', username: 'john_doe' },
          { id: 'user-2', username: 'jane_doe' },
        ],
      };

      mockAdminService.bulkBanUsers.mockResolvedValue(mockResponse);

      const result = await controller.bulkBanUsers('admin-1', {
        userIds: ['user-1', 'user-2'],
        reason: 'Mass violation',
      });

      expect(result).toEqual(mockResponse);
      expect(mockAdminService.bulkBanUsers).toHaveBeenCalledWith(
        ['user-1', 'user-2'],
        'admin-1',
        'Mass violation',
      );
    });
  });

  describe('bulkUnbanUsers', () => {
    it('should unban multiple users at once', async () => {
      const mockResponse = {
        success: true,
        unbannedCount: 2,
        unbannedUsers: [
          { id: 'user-1', username: 'john_doe' },
          { id: 'user-2', username: 'jane_doe' },
        ],
      };

      mockAdminService.bulkUnbanUsers.mockResolvedValue(mockResponse);

      const result = await controller.bulkUnbanUsers('admin-1', {
        userIds: ['user-1', 'user-2'],
        reason: 'Appeals accepted',
      });

      expect(result).toEqual(mockResponse);
      expect(mockAdminService.bulkUnbanUsers).toHaveBeenCalledWith(
        ['user-1', 'user-2'],
        'admin-1',
        'Appeals accepted',
      );
    });
  });
});
