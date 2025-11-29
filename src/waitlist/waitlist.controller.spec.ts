import { AdminGuard } from '@/auth/guards/admin.guard';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { PrismaService } from '@/prisma/prisma.service';
import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CreateWaitlistDto } from './dto/create-waitlist.dto';
import { WaitlistController } from './waitlist.controller';
import { WaitlistService } from './waitlist.service';

describe('WaitlistController', () => {
  let controller: WaitlistController;
  let service: WaitlistService;

  const mockWaitlistService = {
    create: jest.fn(),
    getStats: jest.fn(),
    getAllEmails: jest.fn(),
    findAll: jest.fn(),
    markAsNotified: jest.fn(),
    remove: jest.fn(),
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
      controllers: [WaitlistController],
      providers: [
        {
          provide: WaitlistService,
          useValue: mockWaitlistService,
        },
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<WaitlistController>(WaitlistController);
    service = module.get<WaitlistService>(WaitlistService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new waitlist entry', async () => {
      const createDto: CreateWaitlistDto = {
        email: 'test@example.com',
        source: 'landing_page',
        referralCode: 'REF123',
      };
      const userAgent = 'Mozilla/5.0';
      const ipAddress = '127.0.0.1';

      mockWaitlistService.create.mockResolvedValue(mockWaitlistEntry);

      const result = await controller.create(createDto, userAgent, ipAddress);

      expect(result).toEqual(mockWaitlistEntry);
      expect(service.create).toHaveBeenCalledWith(
        createDto,
        userAgent,
        ipAddress,
      );
    });

    it('should handle creation without userAgent and ipAddress', async () => {
      const createDto: CreateWaitlistDto = {
        email: 'test@example.com',
      };

      mockWaitlistService.create.mockResolvedValue(mockWaitlistEntry);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockWaitlistEntry);
      expect(service.create).toHaveBeenCalledWith(
        createDto,
        undefined,
        undefined,
      );
    });

    it('should throw ConflictException if email already exists', async () => {
      const createDto: CreateWaitlistDto = {
        email: 'test@example.com',
      };

      mockWaitlistService.create.mockRejectedValue(
        new ConflictException('Email already on waitlist'),
      );

      await expect(controller.create(createDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('getStats', () => {
    it('should return waitlist statistics', async () => {
      const mockStats = {
        total: 100,
        notified: 25,
        pending: 75,
        last24Hours: 10,
        last7Days: 30,
      };

      mockWaitlistService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats();

      expect(result).toEqual(mockStats);
      expect(service.getStats).toHaveBeenCalled();
    });
  });

  describe('getAllEmails', () => {
    it('should return all emails when notified not specified', async () => {
      const mockEmails = {
        emails: ['user1@example.com', 'user2@example.com'],
        count: 2,
      };

      mockWaitlistService.getAllEmails.mockResolvedValue(mockEmails);

      const result = await controller.getAllEmails();

      expect(result).toEqual(mockEmails);
      expect(service.getAllEmails).toHaveBeenCalledWith(false);
    });

    it('should return only notified emails when notified=true', async () => {
      const mockEmails = {
        emails: ['notified@example.com'],
        count: 1,
      };

      mockWaitlistService.getAllEmails.mockResolvedValue(mockEmails);

      const result = await controller.getAllEmails('true');

      expect(result).toEqual(mockEmails);
      expect(service.getAllEmails).toHaveBeenCalledWith(true);
    });

    it('should handle notified=false parameter', async () => {
      const mockEmails = {
        emails: ['user@example.com'],
        count: 1,
      };

      mockWaitlistService.getAllEmails.mockResolvedValue(mockEmails);

      const result = await controller.getAllEmails('false');

      expect(result).toEqual(mockEmails);
      expect(service.getAllEmails).toHaveBeenCalledWith(false);
    });
  });

  describe('findAll', () => {
    it('should return paginated waitlist entries with default params', async () => {
      const mockResult = {
        data: [mockWaitlistEntry],
        total: 1,
        page: 1,
        limit: 50,
      };

      mockWaitlistService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll();

      expect(result).toEqual(mockResult);
      expect(service.findAll).toHaveBeenCalledWith(1, 50, undefined);
    });

    it('should parse page and limit parameters', async () => {
      const mockResult = {
        data: [],
        total: 0,
        page: 2,
        limit: 20,
      };

      mockWaitlistService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll('2', '20');

      expect(result).toEqual(mockResult);
      expect(service.findAll).toHaveBeenCalledWith(2, 20, undefined);
    });

    it('should parse notified parameter as boolean', async () => {
      const mockResult = {
        data: [],
        total: 0,
        page: 1,
        limit: 50,
      };

      mockWaitlistService.findAll.mockResolvedValue(mockResult);

      await controller.findAll('1', '50', 'true');

      expect(service.findAll).toHaveBeenCalledWith(1, 50, true);
    });

    it('should handle notified=false parameter', async () => {
      const mockResult = {
        data: [],
        total: 0,
        page: 1,
        limit: 50,
      };

      mockWaitlistService.findAll.mockResolvedValue(mockResult);

      await controller.findAll('1', '50', 'false');

      expect(service.findAll).toHaveBeenCalledWith(1, 50, false);
    });

    it('should leave notified as undefined if not provided', async () => {
      const mockResult = {
        data: [],
        total: 0,
        page: 1,
        limit: 50,
      };

      mockWaitlistService.findAll.mockResolvedValue(mockResult);

      await controller.findAll();

      expect(service.findAll).toHaveBeenCalledWith(1, 50, undefined);
    });
  });

  describe('markAsNotified', () => {
    it('should mark entries as notified', async () => {
      const ids = ['id-1', 'id-2', 'id-3'];
      const mockResult = { count: 3 };

      mockWaitlistService.markAsNotified.mockResolvedValue(mockResult);

      const result = await controller.markAsNotified({ ids });

      expect(result).toEqual(mockResult);
      expect(service.markAsNotified).toHaveBeenCalledWith(ids);
    });

    it('should handle empty ids array', async () => {
      const mockResult = { count: 0 };

      mockWaitlistService.markAsNotified.mockResolvedValue(mockResult);

      const result = await controller.markAsNotified({ ids: [] });

      expect(result).toEqual(mockResult);
      expect(service.markAsNotified).toHaveBeenCalledWith([]);
    });
  });

  describe('remove', () => {
    it('should delete a waitlist entry', async () => {
      mockWaitlistService.remove.mockResolvedValue(undefined);

      const result = await controller.remove('waitlist-123');

      expect(result).toEqual({
        message: 'Waitlist entry deleted successfully',
      });
      expect(service.remove).toHaveBeenCalledWith('waitlist-123');
    });

    it('should throw NotFoundException if entry not found', async () => {
      mockWaitlistService.remove.mockRejectedValue(
        new Error('Waitlist entry not found'),
      );

      await expect(controller.remove('non-existent')).rejects.toThrow();
    });
  });
});
