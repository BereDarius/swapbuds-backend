import { PrismaService } from '@/prisma/prisma.service';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditAction } from '@prisma/client';
import { AuditLogService } from './audit-log.service';

describe('AuditLogService', () => {
  let service: AuditLogService;

  const mockPrismaService = {
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('log', () => {
    it('should create audit log entry successfully', async () => {
      const mockLog = {
        id: 'log-1',
        action: AuditAction.USER_BAN,
        performedById: 'admin-1',
        description: 'User banned',
        targetType: 'User',
        targetId: 'user-1',
        metadata: { reason: 'Violation' },
        ipAddress: '192.168.1.1',
        createdAt: new Date(),
      };

      mockPrismaService.auditLog.create.mockResolvedValue(mockLog);

      await service.log({
        performedById: 'admin-1',
        action: AuditAction.USER_BAN,
        description: 'User banned',
        targetType: 'User',
        targetId: 'user-1',
        metadata: { reason: 'Violation' },
        ipAddress: '192.168.1.1',
      });

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: {
          performedById: 'admin-1',
          action: AuditAction.USER_BAN,
          description: 'User banned',
          targetType: 'User',
          targetId: 'user-1',
          metadata: { reason: 'Violation' },
          ipAddress: '192.168.1.1',
        },
      });
    });

    it('should handle missing optional parameters', async () => {
      const mockLog = {
        id: 'log-1',
        action: AuditAction.USER_BAN,
        performedById: 'admin-1',
        description: 'User banned',
        createdAt: new Date(),
      };

      mockPrismaService.auditLog.create.mockResolvedValue(mockLog);

      await service.log({
        performedById: 'admin-1',
        action: AuditAction.USER_BAN,
        description: 'User banned',
      });

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: {
          performedById: 'admin-1',
          action: AuditAction.USER_BAN,
          description: 'User banned',
          targetType: undefined,
          targetId: undefined,
          metadata: null,
          ipAddress: undefined,
        },
      });
    });

    it('should not throw error on database failure (silent failure)', async () => {
      mockPrismaService.auditLog.create.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.log({
          performedById: 'admin-1',
          action: AuditAction.USER_BAN,
          description: 'User banned',
        }),
      ).resolves.not.toThrow();
    });
  });

  describe('getAuditLogs', () => {
    it('should return paginated audit logs', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          action: AuditAction.USER_BAN,
          description: 'User banned',
          performedBy: {
            id: 'admin-1',
            username: 'admin_user',
            email: 'admin@example.com',
          },
          createdAt: new Date(),
        },
        {
          id: 'log-2',
          action: AuditAction.USER_UNBAN,
          description: 'User unbanned',
          performedBy: {
            id: 'admin-1',
            username: 'admin_user',
            email: 'admin@example.com',
          },
          createdAt: new Date(),
        },
      ];

      mockPrismaService.auditLog.count.mockResolvedValue(2);
      mockPrismaService.auditLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.getAuditLogs({
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        logs: mockLogs,
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1,
        },
      });
    });

    it('should filter logs by action', async () => {
      mockPrismaService.auditLog.count.mockResolvedValue(0);
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      await service.getAuditLogs({
        action: AuditAction.USER_BAN,
        page: 1,
        limit: 10,
      });

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: AuditAction.USER_BAN,
          }),
        }),
      );
    });

    it('should filter logs by performedById', async () => {
      mockPrismaService.auditLog.count.mockResolvedValue(0);
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      await service.getAuditLogs({
        performedById: 'admin-1',
        page: 1,
        limit: 10,
      });

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            performedById: 'admin-1',
          }),
        }),
      );
    });

    it('should filter logs by target', async () => {
      mockPrismaService.auditLog.count.mockResolvedValue(0);
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      await service.getAuditLogs({
        targetType: 'User',
        targetId: 'user-1',
        page: 1,
        limit: 10,
      });

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            targetType: 'User',
            targetId: 'user-1',
          }),
        }),
      );
    });

    it('should use default pagination values', async () => {
      mockPrismaService.auditLog.count.mockResolvedValue(0);
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      await service.getAuditLogs({});

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 50,
        }),
      );
    });
  });

  describe('getLogsForTarget', () => {
    it('should return logs for specific target', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          action: AuditAction.USER_BAN,
          description: 'User banned',
          performedBy: {
            id: 'admin-1',
            username: 'admin_user',
            role: 'ADMIN',
          },
          createdAt: new Date(),
        },
      ];

      mockPrismaService.auditLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.getLogsForTarget('User', 'user-1', 10);

      expect(result).toEqual(mockLogs);

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            targetType: 'User',
            targetId: 'user-1',
          },
        }),
      );
    });

    it('should use default limit', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      await service.getLogsForTarget('User', 'user-1');

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        }),
      );
    });
  });

  describe('getAuditStats', () => {
    it('should return audit log statistics', async () => {
      const mockGroupBy = [
        { action: AuditAction.USER_BAN, _count: 5 },
        { action: AuditAction.USER_UNBAN, _count: 3 },
        { action: AuditAction.ROLE_CHANGE, _count: 2 },
      ];

      mockPrismaService.auditLog.count
        .mockResolvedValueOnce(10) // total logs
        .mockResolvedValueOnce(4); // recent logs (last 24 hours)

      mockPrismaService.auditLog.groupBy.mockResolvedValue(mockGroupBy);

      const result = await service.getAuditStats();

      expect(result).toEqual({
        totalLogs: 10,
        recentActivity: 4,
        actionCounts: {
          USER_BAN: 5,
          USER_UNBAN: 3,
          ROLE_CHANGE: 2,
        },
      });
    });

    it('should handle empty audit logs', async () => {
      mockPrismaService.auditLog.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      mockPrismaService.auditLog.groupBy.mockResolvedValue([]);

      const result = await service.getAuditStats();

      expect(result).toEqual({
        totalLogs: 0,
        recentActivity: 0,
        actionCounts: {},
      });
    });
  });
});
