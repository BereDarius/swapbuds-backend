import { PrismaService } from '@/prisma/prisma.service';
import {
  mockDispute,
  mockDisputeWithRelations,
  mockResolvedDisputeWithRelations,
} from '@/test/fixtures/dispute.fixture';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DisputeReason, DisputeStatus, TradeStatus } from '@prisma/client';
import { DisputesService } from './disputes.service';

describe('DisputesService', () => {
  let service: DisputesService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisputesService,
        {
          provide: PrismaService,
          useValue: {
            dispute: {
              create: jest.fn(),
              findMany: jest.fn(),
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            trade: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            user: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<DisputesService>(DisputesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('createDispute', () => {
    const userId = 'user-1';
    const createDto = {
      tradeId: 'trade-1',
      reportedUserId: 'user-2',
      reason: DisputeReason.ITEM_NOT_AS_DESCRIBED,
      description: 'Item was damaged',
    };

    const mockTrade = {
      id: 'trade-1',
      proposerId: 'user-1',
      responderId: 'user-2',
      status: TradeStatus.ACCEPTED,
    };

    it('should create a dispute successfully', async () => {
      jest
        .spyOn(prisma.trade, 'findUnique')
        .mockResolvedValue(mockTrade as any);
      jest
        .spyOn(prisma.user, 'findUnique')
        .mockResolvedValue({ id: 'user-2' } as any);
      jest.spyOn(prisma.dispute, 'findFirst').mockResolvedValue(null);
      jest
        .spyOn(prisma.dispute, 'create')
        .mockResolvedValue(mockDisputeWithRelations as any);

      const result = await service.createDispute(userId, createDto);

      expect(result).toBeDefined();
      expect(result.tradeId).toBe(createDto.tradeId);
      expect(result.reason).toBe(createDto.reason);
      expect(prisma.dispute.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if trade does not exist', async () => {
      jest.spyOn(prisma.trade, 'findUnique').mockResolvedValue(null);

      await expect(service.createDispute(userId, createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user is not part of the trade', async () => {
      const trade = {
        ...mockTrade,
        proposerId: 'other-user',
        responderId: 'another-user',
      };
      jest.spyOn(prisma.trade, 'findUnique').mockResolvedValue(trade as any);

      await expect(service.createDispute(userId, createDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException if trying to report oneself', async () => {
      const dto = { ...createDto, reportedUserId: userId };
      jest
        .spyOn(prisma.trade, 'findUnique')
        .mockResolvedValue(mockTrade as any);

      await expect(service.createDispute(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if user already has a dispute for this trade', async () => {
      jest
        .spyOn(prisma.trade, 'findUnique')
        .mockResolvedValue(mockTrade as any);
      jest
        .spyOn(prisma.user, 'findUnique')
        .mockResolvedValue({ id: 'user-2' } as any);
      jest
        .spyOn(prisma.dispute, 'findFirst')
        .mockResolvedValue(mockDispute as any);

      await expect(service.createDispute(userId, createDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getUserDisputes', () => {
    const userId = 'user-1';

    it('should return user disputes', async () => {
      const mockDisputes = [
        mockDisputeWithRelations,
        mockResolvedDisputeWithRelations,
      ];
      jest
        .spyOn(prisma.dispute, 'findMany')
        .mockResolvedValue(mockDisputes as any);

      const result = await service.getUserDisputes(userId);

      expect(result).toHaveLength(2);
      expect(result[0].reporterUsername).toBeDefined();
      expect(prisma.dispute.findMany).toHaveBeenCalledWith({
        where: {
          OR: [{ reporterId: userId }, { reportedUserId: userId }],
        },
        include: {
          reporter: { select: { id: true, username: true } },
          reportedUser: { select: { id: true, username: true } },
          admin: { select: { id: true, username: true } },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    it('should return empty array if user has no disputes', async () => {
      jest.spyOn(prisma.dispute, 'findMany').mockResolvedValue([]);

      const result = await service.getUserDisputes(userId);

      expect(result).toEqual([]);
    });
  });

  describe('getDispute', () => {
    const userId = 'user-1';
    const disputeId = 'dispute-123';

    it('should return dispute for authorized user', async () => {
      jest
        .spyOn(prisma.dispute, 'findUnique')
        .mockResolvedValue(mockDisputeWithRelations as any);
      jest
        .spyOn(prisma.user, 'findUnique')
        .mockResolvedValue({ isAdmin: false } as any);

      const result = await service.getDispute(disputeId, userId);

      expect(result).toBeDefined();
      expect(result.id).toBe(disputeId);
    });

    it('should throw NotFoundException if dispute does not exist', async () => {
      jest.spyOn(prisma.dispute, 'findUnique').mockResolvedValue(null);

      await expect(service.getDispute(disputeId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user is not authorized', async () => {
      const dispute = {
        ...mockDisputeWithRelations,
        reporterId: 'other-user',
        reportedUserId: 'another-user',
        adminId: 'admin-user',
      };
      jest
        .spyOn(prisma.dispute, 'findUnique')
        .mockResolvedValue(dispute as any);
      jest
        .spyOn(prisma.user, 'findUnique')
        .mockResolvedValue({ isAdmin: false } as any);

      await expect(service.getDispute(disputeId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getAllDisputes', () => {
    it('should return all disputes without filter', async () => {
      const mockDisputes = [
        mockDisputeWithRelations,
        mockResolvedDisputeWithRelations,
      ];
      jest
        .spyOn(prisma.dispute, 'findMany')
        .mockResolvedValue(mockDisputes as any);

      const result = await service.getAllDisputes();

      expect(result).toHaveLength(2);
      expect(prisma.dispute.findMany).toHaveBeenCalledWith({
        where: undefined,
        include: {
          reporter: { select: { id: true, username: true } },
          reportedUser: { select: { id: true, username: true } },
          admin: { select: { id: true, username: true } },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    it('should return filtered disputes by status', async () => {
      jest
        .spyOn(prisma.dispute, 'findMany')
        .mockResolvedValue([mockResolvedDisputeWithRelations as any]);

      const result = await service.getAllDisputes(DisputeStatus.RESOLVED);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(DisputeStatus.RESOLVED);
      expect(prisma.dispute.findMany).toHaveBeenCalledWith({
        where: {
          status: DisputeStatus.RESOLVED,
        },
        include: {
          reporter: { select: { id: true, username: true } },
          reportedUser: { select: { id: true, username: true } },
          admin: { select: { id: true, username: true } },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });
  });

  describe('assignDispute', () => {
    const adminId = 'admin-1';
    const disputeId = 'dispute-1';

    it('should assign dispute to admin', async () => {
      jest
        .spyOn(prisma.dispute, 'findUnique')
        .mockResolvedValue(mockDispute as any);
      const updatedDispute = {
        ...mockDisputeWithRelations,
        status: DisputeStatus.UNDER_REVIEW,
        adminId,
      };
      jest
        .spyOn(prisma.dispute, 'update')
        .mockResolvedValue(updatedDispute as any);

      const result = await service.assignDispute(disputeId, adminId);

      expect(result.status).toBe(DisputeStatus.UNDER_REVIEW);
      expect(result.adminUsername).toBeDefined();
      expect(prisma.dispute.update).toHaveBeenCalledWith({
        where: { id: disputeId },
        data: {
          adminId,
          status: DisputeStatus.UNDER_REVIEW,
        },
        include: {
          reporter: { select: { id: true, username: true } },
          reportedUser: { select: { id: true, username: true } },
          admin: { select: { id: true, username: true } },
        },
      });
    });

    it('should throw NotFoundException if dispute does not exist', async () => {
      jest.spyOn(prisma.dispute, 'findUnique').mockResolvedValue(null);

      await expect(service.assignDispute(disputeId, adminId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('resolveDispute', () => {
    const disputeId = 'dispute-1';
    const resolveDto = {
      adminNotes: 'Reviewed evidence',
      resolution: 'Trade will be cancelled',
    };

    it('should resolve dispute and cancel trade', async () => {
      const mockDisputeBeforeResolve = {
        ...mockDisputeWithRelations,
        status: DisputeStatus.UNDER_REVIEW,
        adminId: 'admin-1',
      };
      jest
        .spyOn(prisma.dispute, 'findUnique')
        .mockResolvedValue(mockDisputeBeforeResolve as any);

      const updatedDispute = {
        ...mockResolvedDisputeWithRelations,
        adminNotes: resolveDto.adminNotes,
        resolution: resolveDto.resolution,
      };

      jest
        .spyOn(prisma.dispute, 'update')
        .mockResolvedValue(updatedDispute as any);
      jest.spyOn(prisma.trade, 'update').mockResolvedValue({} as any);

      const result = await service.resolveDispute(disputeId, resolveDto);

      expect(result.status).toBe(DisputeStatus.RESOLVED);
      expect(result.resolution).toBe(resolveDto.resolution);
    });

    it('should throw NotFoundException if dispute does not exist', async () => {
      jest.spyOn(prisma.dispute, 'findUnique').mockResolvedValue(null);

      await expect(
        service.resolveDispute(disputeId, resolveDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if dispute is already resolved', async () => {
      const dispute = { ...mockResolvedDisputeWithRelations };
      jest
        .spyOn(prisma.dispute, 'findUnique')
        .mockResolvedValue(dispute as any);

      await expect(
        service.resolveDispute(disputeId, resolveDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('closeDispute', () => {
    const disputeId = 'dispute-1';

    it('should close dispute without resolution', async () => {
      const mockDisputeBeforeClose = {
        ...mockDisputeWithRelations,
        status: DisputeStatus.UNDER_REVIEW,
        adminId: 'admin-1',
      };
      jest
        .spyOn(prisma.dispute, 'findUnique')
        .mockResolvedValue(mockDisputeBeforeClose as any);

      const closedDispute = {
        ...mockDisputeWithRelations,
        status: DisputeStatus.CLOSED,
      };
      jest
        .spyOn(prisma.dispute, 'update')
        .mockResolvedValue(closedDispute as any);

      const result = await service.closeDispute(disputeId);

      expect(result.status).toBe(DisputeStatus.CLOSED);
      expect(prisma.dispute.update).toHaveBeenCalledWith({
        where: { id: disputeId },
        data: {
          status: DisputeStatus.CLOSED,
        },
        include: {
          reporter: { select: { id: true, username: true } },
          reportedUser: { select: { id: true, username: true } },
          admin: { select: { id: true, username: true } },
        },
      });
    });

    it('should throw NotFoundException if dispute does not exist', async () => {
      jest.spyOn(prisma.dispute, 'findUnique').mockResolvedValue(null);

      await expect(service.closeDispute(disputeId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
