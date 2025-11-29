import { PrismaService } from '@/prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CreateWaitlistDto } from './dto/create-waitlist.dto';
import { WaitlistService } from './waitlist.service';

describe('WaitlistService', () => {
  let service: WaitlistService;
  let prisma: PrismaService;

  const mockPrismaService = {
    waitlist: {
      findUnique: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockWaitlistEntry = {
    id: 'waitlist-123',
    email: 'test@example.com',
    source: 'landing_page',
    referralCode: null,
    userAgent: 'Mozilla/5.0',
    ipAddress: '127.0.0.1',
    notified: false,
    notifiedAt: null,
    createdAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WaitlistService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<WaitlistService>(WaitlistService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new waitlist entry', async () => {
      const createDto: CreateWaitlistDto = {
        email: 'test@example.com',
        source: 'landing_page',
        referralCode: 'REF123',
      };

      mockPrismaService.waitlist.findUnique.mockResolvedValue(null);
      mockPrismaService.waitlist.create.mockResolvedValue(mockWaitlistEntry);

      const result = await service.create(
        createDto,
        'Mozilla/5.0',
        '127.0.0.1',
      );

      expect(result).toEqual(mockWaitlistEntry);
      expect(prisma.waitlist.findUnique).toHaveBeenCalledWith({
        where: { email: createDto.email },
      });
      expect(prisma.waitlist.create).toHaveBeenCalledWith({
        data: {
          email: createDto.email.toLowerCase().trim(),
          source: createDto.source,
          referralCode: createDto.referralCode,
          userAgent: 'Mozilla/5.0',
          ipAddress: '127.0.0.1',
        },
      });
    });

    it('should normalize email to lowercase and trim', async () => {
      const createDto: CreateWaitlistDto = {
        email: '  TEST@EXAMPLE.COM  ',
        source: 'landing_page',
      };

      mockPrismaService.waitlist.findUnique.mockResolvedValue(null);
      mockPrismaService.waitlist.create.mockResolvedValue(mockWaitlistEntry);

      await service.create(createDto);

      expect(prisma.waitlist.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'test@example.com',
        }),
      });
    });

    it('should use default source "landing_page" if not provided', async () => {
      const createDto: CreateWaitlistDto = {
        email: 'test@example.com',
      };

      mockPrismaService.waitlist.findUnique.mockResolvedValue(null);
      mockPrismaService.waitlist.create.mockResolvedValue(mockWaitlistEntry);

      await service.create(createDto);

      expect(prisma.waitlist.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          source: 'landing_page',
        }),
      });
    });

    it('should throw ConflictException if email already exists', async () => {
      const createDto: CreateWaitlistDto = {
        email: 'test@example.com',
      };

      mockPrismaService.waitlist.findUnique.mockResolvedValue(
        mockWaitlistEntry,
      );

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createDto)).rejects.toThrow(
        'Email already on waitlist',
      );
      expect(prisma.waitlist.create).not.toHaveBeenCalled();
    });

    it('should handle optional userAgent and ipAddress', async () => {
      const createDto: CreateWaitlistDto = {
        email: 'test@example.com',
      };

      mockPrismaService.waitlist.findUnique.mockResolvedValue(null);
      mockPrismaService.waitlist.create.mockResolvedValue(mockWaitlistEntry);

      await service.create(createDto);

      expect(prisma.waitlist.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userAgent: undefined,
          ipAddress: undefined,
        }),
      });
    });
  });

  describe('getStats', () => {
    it('should return waitlist statistics', async () => {
      mockPrismaService.waitlist.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(25) // notified
        .mockResolvedValueOnce(10) // last24Hours
        .mockResolvedValueOnce(30); // last7Days

      const result = await service.getStats();

      expect(result).toEqual({
        total: 100,
        notified: 25,
        pending: 75,
        last24Hours: 10,
        last7Days: 30,
      });
      expect(prisma.waitlist.count).toHaveBeenCalledTimes(4);
    });

    it('should calculate pending count correctly', async () => {
      mockPrismaService.waitlist.count
        .mockResolvedValueOnce(50) // total
        .mockResolvedValueOnce(20) // notified
        .mockResolvedValueOnce(5) // last24Hours
        .mockResolvedValueOnce(15); // last7Days

      const result = await service.getStats();

      expect(result.pending).toBe(30); // 50 - 20
    });

    it('should handle zero counts', async () => {
      mockPrismaService.waitlist.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const result = await service.getStats();

      expect(result).toEqual({
        total: 0,
        notified: 0,
        pending: 0,
        last24Hours: 0,
        last7Days: 0,
      });
    });
  });

  describe('getAllEmails', () => {
    it('should return all emails when notifiedOnly is false', async () => {
      const mockEntries = [
        { email: 'user1@example.com' },
        { email: 'user2@example.com' },
        { email: 'user3@example.com' },
      ];

      mockPrismaService.waitlist.findMany.mockResolvedValue(mockEntries);

      const result = await service.getAllEmails(false);

      expect(result).toEqual({
        emails: ['user1@example.com', 'user2@example.com', 'user3@example.com'],
        count: 3,
      });
      expect(prisma.waitlist.findMany).toHaveBeenCalledWith({
        where: {},
        select: { email: true },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('should return only notified emails when notifiedOnly is true', async () => {
      const mockEntries = [
        { email: 'notified1@example.com' },
        { email: 'notified2@example.com' },
      ];

      mockPrismaService.waitlist.findMany.mockResolvedValue(mockEntries);

      const result = await service.getAllEmails(true);

      expect(result).toEqual({
        emails: ['notified1@example.com', 'notified2@example.com'],
        count: 2,
      });
      expect(prisma.waitlist.findMany).toHaveBeenCalledWith({
        where: { notified: true },
        select: { email: true },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('should return empty array when no entries', async () => {
      mockPrismaService.waitlist.findMany.mockResolvedValue([]);

      const result = await service.getAllEmails();

      expect(result).toEqual({
        emails: [],
        count: 0,
      });
    });

    it('should default to all emails if no parameter provided', async () => {
      mockPrismaService.waitlist.findMany.mockResolvedValue([]);

      await service.getAllEmails();

      expect(prisma.waitlist.findMany).toHaveBeenCalledWith({
        where: {},
        select: { email: true },
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated waitlist entries', async () => {
      const mockEntries = [mockWaitlistEntry];

      mockPrismaService.waitlist.findMany.mockResolvedValue(mockEntries);
      mockPrismaService.waitlist.count.mockResolvedValue(1);

      const result = await service.findAll(1, 50);

      expect(result).toEqual({
        data: mockEntries,
        total: 1,
        page: 1,
        limit: 50,
      });
      expect(prisma.waitlist.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 50,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should calculate skip correctly for page 2', async () => {
      mockPrismaService.waitlist.findMany.mockResolvedValue([]);
      mockPrismaService.waitlist.count.mockResolvedValue(0);

      await service.findAll(2, 20);

      expect(prisma.waitlist.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 20, // (2-1) * 20
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by notified status when provided', async () => {
      mockPrismaService.waitlist.findMany.mockResolvedValue([]);
      mockPrismaService.waitlist.count.mockResolvedValue(0);

      await service.findAll(1, 50, true);

      expect(prisma.waitlist.findMany).toHaveBeenCalledWith({
        where: { notified: true },
        skip: 0,
        take: 50,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should not filter when notified is undefined', async () => {
      mockPrismaService.waitlist.findMany.mockResolvedValue([]);
      mockPrismaService.waitlist.count.mockResolvedValue(0);

      await service.findAll(1, 50, undefined);

      expect(prisma.waitlist.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 50,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should use default values for page and limit', async () => {
      mockPrismaService.waitlist.findMany.mockResolvedValue([]);
      mockPrismaService.waitlist.count.mockResolvedValue(0);

      await service.findAll();

      expect(prisma.waitlist.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0, // (1-1) * 50
        take: 50,
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('markAsNotified', () => {
    it('should mark multiple entries as notified', async () => {
      const ids = ['id-1', 'id-2', 'id-3'];

      mockPrismaService.waitlist.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.markAsNotified(ids);

      expect(result).toEqual({ count: 3 });
      expect(prisma.waitlist.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ids } },
        data: {
          notified: true,
          notifiedAt: expect.any(Date),
        },
      });
    });

    it('should set notifiedAt timestamp', async () => {
      const ids = ['id-1'];
      const beforeCall = new Date();

      mockPrismaService.waitlist.updateMany.mockResolvedValue({ count: 1 });

      await service.markAsNotified(ids);

      const afterCall = new Date();
      const callArgs = mockPrismaService.waitlist.updateMany.mock.calls[0][0];
      const notifiedAt = callArgs.data.notifiedAt;

      expect(notifiedAt.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
      expect(notifiedAt.getTime()).toBeLessThanOrEqual(afterCall.getTime());
    });

    it('should handle empty ids array', async () => {
      mockPrismaService.waitlist.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.markAsNotified([]);

      expect(result).toEqual({ count: 0 });
    });

    it('should return correct count when some entries not found', async () => {
      const ids = ['id-1', 'non-existent', 'id-3'];

      mockPrismaService.waitlist.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.markAsNotified(ids);

      expect(result).toEqual({ count: 2 });
    });
  });

  describe('remove', () => {
    it('should delete a waitlist entry', async () => {
      mockPrismaService.waitlist.findUnique.mockResolvedValue(
        mockWaitlistEntry,
      );
      mockPrismaService.waitlist.delete.mockResolvedValue(mockWaitlistEntry);

      await service.remove('waitlist-123');

      expect(prisma.waitlist.findUnique).toHaveBeenCalledWith({
        where: { id: 'waitlist-123' },
      });
      expect(prisma.waitlist.delete).toHaveBeenCalledWith({
        where: { id: 'waitlist-123' },
      });
    });

    it('should throw NotFoundException if entry not found', async () => {
      mockPrismaService.waitlist.findUnique.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.remove('non-existent')).rejects.toThrow(
        'Waitlist entry not found',
      );
      expect(prisma.waitlist.delete).not.toHaveBeenCalled();
    });
  });
});
