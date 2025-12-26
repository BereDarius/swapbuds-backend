import { PrismaService } from '@/prisma/prisma.service';
import { mockAuditLogService } from '@/test/mocks/audit-log.mock';
import { mockPrismaService } from '@/test/mocks/prisma.mock';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { AdminService } from './admin.service';
import { AuditLogService } from './audit-log.service';

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AuditLogService,
          useValue: mockAuditLogService,
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPlatformStats', () => {
    it('should return comprehensive platform statistics', async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // First Promise.all batch (main stats)
      mockPrismaService.user.count
        .mockResolvedValueOnce(1000) // total users
        .mockResolvedValueOnce(850); // active users
      mockPrismaService.item.count
        .mockResolvedValueOnce(3000) // total items
        .mockResolvedValueOnce(2000); // available items
      mockPrismaService.trade.count
        .mockResolvedValueOnce(800) // total trades
        .mockResolvedValueOnce(150) // active trades
        .mockResolvedValueOnce(600); // completed trades
      mockPrismaService.userVerification.count
        .mockResolvedValueOnce(400) // total verifications
        .mockResolvedValueOnce(20) // pending verifications
        .mockResolvedValueOnce(350); // approved verifications

      // Second Promise.all batch (last 7 days activity)
      mockPrismaService.user.count.mockResolvedValueOnce(150); // new users
      mockPrismaService.item.count.mockResolvedValueOnce(500); // new items
      mockPrismaService.trade.count.mockResolvedValueOnce(30); // new trades

      const stats = await service.getPlatformStats();

      expect(stats).toEqual({
        users: {
          total: 1000,
          active: 850,
          inactive: 150,
          newLast7Days: 150,
        },
        items: {
          total: 3000,
          available: 2000,
          inTrade: 1000, // total - available
          newLast7Days: 500,
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
      });
    });
  });

  describe('getUsers', () => {
    it('should return paginated list of users', async () => {
      jest.clearAllMocks(); // Clear mocks from previous tests

      const mockUsers = [
        {
          id: 'user-1',
          username: 'john_doe',
          email: 'john@example.com',
          role: UserRole.USER,
          isActive: true,
          createdAt: new Date(),
        },
        {
          id: 'user-2',
          username: 'jane_smith',
          email: 'jane@example.com',
          role: UserRole.MODERATOR,
          isActive: true,
          createdAt: new Date(),
        },
      ];

      mockPrismaService.user.count.mockResolvedValue(2);
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.getUsers({
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        users: mockUsers,
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1,
        },
      });
    });

    it('should filter users by search term', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          username: 'john_doe',
          email: 'john@example.com',
          role: UserRole.USER,
          isActive: true,
          createdAt: new Date(),
        },
      ];

      mockPrismaService.user.count.mockResolvedValue(1);
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);

      await service.getUsers({
        search: 'john',
        page: 1,
        limit: 10,
      });

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { username: { contains: 'john', mode: 'insensitive' } },
              { email: { contains: 'john', mode: 'insensitive' } },
            ]),
          }),
        }),
      );
    });

    it('should filter users by active status', async () => {
      mockPrismaService.user.count.mockResolvedValue(0);
      mockPrismaService.user.findMany.mockResolvedValue([]);

      await service.getUsers({
        isActive: false,
        page: 1,
        limit: 10,
      });

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: false,
          }),
        }),
      );
    });
  });

  describe('getUserDetails', () => {
    it('should return detailed user information with audit logs', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'john_doe',
        email: 'john@example.com',
        role: UserRole.USER,
        isActive: true,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: {
          items: 5,
          trades: 10,
          reviews: 8,
        },
      };

      const mockAuditLogs = [
        {
          id: 'log-1',
          action: 'USER_BAN',
          description: 'User banned',
          createdAt: new Date(),
        },
      ];

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockAuditLogService.getLogsForTarget.mockResolvedValue(mockAuditLogs);

      const result = await service.getUserDetails('user-1');

      expect(result).toEqual({
        ...mockUser,
        auditLogs: mockAuditLogs,
      });
      expect(mockAuditLogService.getLogsForTarget).toHaveBeenCalledWith(
        'User',
        'user-1',
        10,
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserDetails('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('banUser', () => {
    it('should ban a user successfully', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'john_doe',
        email: 'john@example.com',
        isAdmin: false,
        role: UserRole.USER,
        isActive: true,
      };

      const updatedUser = { ...mockUser, isActive: false };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.banUser(
        'user-1',
        'admin-1',
        'Violating terms',
      );

      expect(result).toEqual({ message: 'User banned successfully' });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { isActive: false },
      });
      expect(mockAuditLogService.log).toHaveBeenCalledWith({
        action: 'USER_BAN',
        performedById: 'admin-1',
        description:
          'User john_doe (john@example.com) banned. Reason: Violating terms',
        targetType: 'User',
        targetId: 'user-1',
        metadata: { reason: 'Violating terms' },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.banUser('nonexistent', 'admin-1', 'Reason'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('unbanUser', () => {
    it('should unban a user successfully', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'john_doe',
        email: 'john@example.com',
        isActive: false,
      };

      const updatedUser = { ...mockUser, isActive: true };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.unbanUser(
        'user-1',
        'admin-1',
        'Appeal accepted',
      );

      expect(result).toEqual({ message: 'User unbanned successfully' });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { isActive: true },
      });
      expect(mockAuditLogService.log).toHaveBeenCalledWith({
        action: 'USER_UNBAN',
        performedById: 'admin-1',
        description:
          'User john_doe (john@example.com) unbanned. Reason: Appeal accepted',
        targetType: 'User',
        targetId: 'user-1',
        metadata: { reason: 'Appeal accepted' },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.unbanUser('nonexistent', 'admin-1', 'Reason'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('bulkBanUsers', () => {
    it('should successfully ban multiple users', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          username: 'john_doe',
          email: 'john@example.com',
          isActive: true,
        },
        {
          id: 'user-2',
          username: 'jane_doe',
          email: 'jane@example.com',
          isActive: true,
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.user.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.bulkBanUsers(
        ['user-1', 'user-2'],
        'admin-1',
        'Mass violation',
      );

      expect(result).toEqual({
        success: true,
        bannedCount: 2,
        bannedUsers: [
          { id: 'user-1', username: 'john_doe' },
          { id: 'user-2', username: 'jane_doe' },
        ],
      });

      expect(mockPrismaService.user.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['user-1', 'user-2'] } },
        data: { isActive: false },
      });

      expect(mockAuditLogService.log).toHaveBeenCalledTimes(2);
    });

    it('should throw NotFoundException if not all users found', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([
        {
          id: 'user-1',
          username: 'john_doe',
          email: 'john@example.com',
          isActive: true,
        },
      ]);

      await expect(
        service.bulkBanUsers(
          ['user-1', 'user-2', 'user-3'],
          'admin-1',
          'Reason',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if some users already banned', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          username: 'john_doe',
          email: 'john@example.com',
          isActive: false, // Already banned
        },
        {
          id: 'user-2',
          username: 'jane_doe',
          email: 'jane@example.com',
          isActive: true,
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);

      await expect(
        service.bulkBanUsers(['user-1', 'user-2'], 'admin-1', 'Reason'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create audit logs with ipAddress metadata', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          username: 'john_doe',
          email: 'john@example.com',
          isActive: true,
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.user.updateMany.mockResolvedValue({ count: 1 });

      await service.bulkBanUsers(
        ['user-1'],
        'admin-1',
        'Reason',
        '192.168.1.1',
      );

      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            ipAddress: '192.168.1.1',
          }),
        }),
      );
    });
  });

  describe('bulkUnbanUsers', () => {
    it('should successfully unban multiple users', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          username: 'john_doe',
          email: 'john@example.com',
          isActive: false,
        },
        {
          id: 'user-2',
          username: 'jane_doe',
          email: 'jane@example.com',
          isActive: false,
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.user.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.bulkUnbanUsers(
        ['user-1', 'user-2'],
        'admin-1',
        'Appeals accepted',
      );

      expect(result).toEqual({
        success: true,
        unbannedCount: 2,
        unbannedUsers: [
          { id: 'user-1', username: 'john_doe' },
          { id: 'user-2', username: 'jane_doe' },
        ],
      });

      expect(mockPrismaService.user.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['user-1', 'user-2'] } },
        data: { isActive: true },
      });

      expect(mockAuditLogService.log).toHaveBeenCalledTimes(2);
    });

    it('should throw NotFoundException if not all users found', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([
        {
          id: 'user-1',
          username: 'john_doe',
          email: 'john@example.com',
          isActive: false,
        },
      ]);

      await expect(
        service.bulkUnbanUsers(
          ['user-1', 'user-2', 'user-3'],
          'admin-1',
          'Reason',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if some users not banned', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          username: 'john_doe',
          email: 'john@example.com',
          isActive: true, // Not banned
        },
        {
          id: 'user-2',
          username: 'jane_doe',
          email: 'jane@example.com',
          isActive: false,
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);

      await expect(
        service.bulkUnbanUsers(['user-1', 'user-2'], 'admin-1', 'Reason'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create audit logs with ipAddress metadata', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          username: 'john_doe',
          email: 'john@example.com',
          isActive: false,
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.user.updateMany.mockResolvedValue({ count: 1 });

      await service.bulkUnbanUsers(
        ['user-1'],
        'admin-1',
        'Reason',
        '192.168.1.1',
      );

      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            ipAddress: '192.168.1.1',
          }),
        }),
      );
    });
  });
});
