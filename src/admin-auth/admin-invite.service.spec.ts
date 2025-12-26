import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AdminInviteStatus, AdminRole, AdminStatus } from '@prisma/client';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  mockAdminInvite,
  mockAdminUser,
} from '../test/mocks/admin-invite.mock';
import { mockEmailService } from '../test/mocks/email.mock';
import { mockPrismaService } from '../test/mocks/prisma.mock';
import { AdminInviteService } from './admin-invite.service';

describe('AdminInviteService', () => {
  let service: AdminInviteService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminInviteService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: MailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<AdminInviteService>(AdminInviteService);
  });

  describe('createInvite', () => {
    it('should create an invitation successfully', async () => {
      mockPrismaService.adminUser.findFirst.mockResolvedValue(null);
      mockPrismaService.adminInvite.create.mockResolvedValue(mockAdminInvite);
      mockEmailService.sendAdminInvite.mockResolvedValue(undefined);

      const result = await service.createInvite(
        'newadmin@test.com',
        'newadmin',
        AdminRole.MODERATOR,
        'sender-id',
      );

      expect(result).toEqual({
        id: mockAdminInvite.id,
        email: mockAdminInvite.email,
        username: mockAdminInvite.username,
        role: mockAdminInvite.role,
        status: mockAdminInvite.status,
        expiresAt: mockAdminInvite.expiresAt,
        sentAt: mockAdminInvite.sentAt,
      });
      expect(mockPrismaService.adminUser.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ email: 'newadmin@test.com' }, { username: 'newadmin' }],
        },
      });
      expect(mockPrismaService.adminInvite.create).toHaveBeenCalled();
      expect(mockEmailService.sendAdminInvite).toHaveBeenCalledWith(
        mockAdminInvite.email,
        mockAdminInvite.username,
        mockAdminInvite.token,
        mockAdminUser.username,
      );
    });

    it('should throw ConflictException if email already exists', async () => {
      mockPrismaService.adminUser.findFirst.mockResolvedValue({
        email: 'newadmin@test.com',
      });

      await expect(
        service.createInvite(
          'newadmin@test.com',
          'newadmin',
          AdminRole.MODERATOR,
          'sender-id',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if username already exists', async () => {
      mockPrismaService.adminUser.findFirst.mockResolvedValue({
        username: 'newadmin',
      });

      await expect(
        service.createInvite(
          'newadmin@test.com',
          'newadmin',
          AdminRole.MODERATOR,
          'sender-id',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should handle email sending failure gracefully', async () => {
      mockPrismaService.adminUser.findFirst.mockResolvedValue(null);
      mockPrismaService.adminInvite.create.mockResolvedValue(mockAdminInvite);
      mockEmailService.sendAdminInvite.mockRejectedValue(
        new Error('Email failed'),
      );

      await expect(
        service.createInvite(
          'newadmin@test.com',
          'newadmin',
          AdminRole.MODERATOR,
          'sender-id',
        ),
      ).rejects.toThrow('Email failed');
      expect(mockEmailService.sendAdminInvite).toHaveBeenCalled();
    });
  });

  describe('getAllInvites', () => {
    it('should return all invites without filter', async () => {
      const invites = [mockAdminInvite];
      mockPrismaService.adminInvite.findMany.mockResolvedValue(invites);

      const result = await service.getAllInvites();

      expect(result).toEqual(invites);
      expect(mockPrismaService.adminInvite.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          approver: {
            select: {
              id: true,
              username: true,
            },
          },
        },
        orderBy: { sentAt: 'desc' },
      });
    });

    it('should filter invites by status', async () => {
      const invites = [mockAdminInvite];
      mockPrismaService.adminInvite.findMany.mockResolvedValue(invites);

      const result = await service.getAllInvites(AdminInviteStatus.PENDING);

      expect(result).toEqual(invites);
      expect(mockPrismaService.adminInvite.findMany).toHaveBeenCalledWith({
        where: { status: AdminInviteStatus.PENDING },
        include: expect.any(Object),
        orderBy: { sentAt: 'desc' },
      });
    });
  });

  describe('getInviteByToken', () => {
    it('should return invite if token is valid and not expired', async () => {
      mockPrismaService.adminInvite.findUnique.mockResolvedValue(
        mockAdminInvite,
      );

      const result = await service.getInviteByToken('test-token');

      expect(result).toEqual(mockAdminInvite);
      expect(mockPrismaService.adminInvite.findUnique).toHaveBeenCalledWith({
        where: { token: 'test-token' },
        include: {
          sender: {
            select: {
              username: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException if invite not found', async () => {
      mockPrismaService.adminInvite.findUnique.mockResolvedValue(null);

      await expect(service.getInviteByToken('invalid-token')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if invite is expired', async () => {
      const expiredInvite = {
        ...mockAdminInvite,
        expiresAt: new Date(Date.now() - 1000),
      };
      mockPrismaService.adminInvite.findUnique.mockResolvedValue(expiredInvite);

      await expect(service.getInviteByToken('test-token')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if invite is not pending', async () => {
      const acceptedInvite = {
        ...mockAdminInvite,
        status: AdminInviteStatus.ACCEPTED,
      };
      mockPrismaService.adminInvite.findUnique.mockResolvedValue(
        acceptedInvite,
      );

      await expect(service.getInviteByToken('test-token')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('acceptInvite', () => {
    it('should accept invite successfully', async () => {
      const acceptedInvite = {
        ...mockAdminInvite,
        status: AdminInviteStatus.ACCEPTED,
        acceptedAt: new Date(),
      };
      mockPrismaService.adminInvite.findUnique.mockResolvedValue(
        mockAdminInvite,
      );
      mockPrismaService.adminInvite.update.mockResolvedValue(acceptedInvite);

      const result = await service.acceptInvite('test-token');

      expect(result).toEqual({
        message:
          'Invitation accepted. Your account will be activated once approved by an administrator. You will receive an email with login instructions.',
        inviteId: mockAdminInvite.id,
        status: AdminInviteStatus.ACCEPTED,
      });
      expect(mockPrismaService.adminInvite.update).toHaveBeenCalledWith({
        where: { id: mockAdminInvite.id },
        data: {
          status: AdminInviteStatus.ACCEPTED,
          acceptedAt: expect.any(Date),
        },
      });
    });

    it('should throw NotFoundException if invite not found', async () => {
      mockPrismaService.adminInvite.findUnique.mockResolvedValue(null);

      await expect(service.acceptInvite('invalid-token')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if invite is expired', async () => {
      const expiredInvite = {
        ...mockAdminInvite,
        expiresAt: new Date(Date.now() - 1000),
      };
      mockPrismaService.adminInvite.findUnique.mockResolvedValue(expiredInvite);

      await expect(service.acceptInvite('test-token')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if invite is already accepted', async () => {
      const acceptedInvite = {
        ...mockAdminInvite,
        status: AdminInviteStatus.ACCEPTED,
      };
      mockPrismaService.adminInvite.findUnique.mockResolvedValue(
        acceptedInvite,
      );

      await expect(service.acceptInvite('test-token')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('approveInvite', () => {
    const acceptedInvite = {
      ...mockAdminInvite,
      status: AdminInviteStatus.ACCEPTED,
      acceptedAt: new Date(),
    };

    const mockNewAdmin = {
      id: 'new-admin-id',
      username: 'newadmin',
      email: 'newadmin@test.com',
      role: AdminRole.MODERATOR,
      status: AdminStatus.PENDING_APPROVAL,
    };

    it('should approve invite and create admin user', async () => {
      const approvedInvite = {
        ...acceptedInvite,
        status: AdminInviteStatus.APPROVED,
        approvedAt: new Date(),
        approvedById: 'approver-id',
        recipientId: mockNewAdmin.id,
      };

      mockPrismaService.adminInvite.findUnique.mockResolvedValue(
        acceptedInvite,
      );
      mockPrismaService.adminUser.findFirst.mockResolvedValue(null);
      mockPrismaService.adminUser.create.mockResolvedValue(mockNewAdmin);
      mockPrismaService.adminInvite.update.mockResolvedValue(approvedInvite);
      mockEmailService.sendAdminApproval.mockResolvedValue(undefined);

      const result = await service.approveInvite('invite-id', 'approver-id');

      expect(result).toEqual({
        message: 'Invitation approved successfully',
        adminUserId: mockNewAdmin.id,
        username: mockNewAdmin.username,
        email: mockNewAdmin.email,
        role: mockNewAdmin.role,
      });
      expect(mockPrismaService.adminUser.create).toHaveBeenCalledWith({
        data: {
          email: acceptedInvite.email,
          username: acceptedInvite.username,
          password: '',
          role: acceptedInvite.role,
          status: AdminStatus.PENDING_APPROVAL,
          createdBy: acceptedInvite.sentBy,
        },
      });
      expect(mockEmailService.sendAdminApproval).toHaveBeenCalledWith(
        acceptedInvite.email,
        acceptedInvite.username,
      );
    });

    it('should throw NotFoundException if invite not found', async () => {
      mockPrismaService.adminInvite.findUnique.mockResolvedValue(null);

      await expect(
        service.approveInvite('invalid-id', 'approver-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if invite not accepted', async () => {
      mockPrismaService.adminInvite.findUnique.mockResolvedValue(
        mockAdminInvite,
      );

      await expect(
        service.approveInvite('invite-id', 'approver-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if user already exists', async () => {
      mockPrismaService.adminInvite.findUnique.mockResolvedValue(
        acceptedInvite,
      );
      mockPrismaService.adminUser.create.mockRejectedValue(
        new ConflictException('User already exists'),
      );

      await expect(
        service.approveInvite('invite-id', 'approver-id'),
      ).rejects.toThrow(ConflictException);
    });

    it('should handle email sending failure gracefully', async () => {
      const approvedInvite = {
        ...acceptedInvite,
        status: AdminInviteStatus.APPROVED,
        approvedAt: new Date(),
        approvedById: 'approver-id',
        recipientId: mockNewAdmin.id,
      };

      mockPrismaService.adminInvite.findUnique.mockResolvedValue(
        acceptedInvite,
      );
      mockPrismaService.adminUser.findFirst.mockResolvedValue(null);
      mockPrismaService.adminUser.create.mockResolvedValue(mockNewAdmin);
      mockPrismaService.adminInvite.update.mockResolvedValue(approvedInvite);
      mockEmailService.sendAdminApproval.mockRejectedValue(
        new Error('Email failed'),
      );

      await expect(
        service.approveInvite('invite-id', 'approver-id'),
      ).rejects.toThrow('Email failed');
    });
  });

  describe('rejectInvite', () => {
    const acceptedInvite = {
      ...mockAdminInvite,
      status: AdminInviteStatus.ACCEPTED,
      acceptedAt: new Date(),
    };

    it('should reject invite with reason', async () => {
      const rejectedInvite = {
        ...acceptedInvite,
        status: AdminInviteStatus.REJECTED,
        rejectedAt: new Date(),
        approvedById: 'approver-id',
        rejectionReason: 'Not qualified',
      };

      mockPrismaService.adminInvite.findUnique.mockResolvedValue(
        acceptedInvite,
      );
      mockPrismaService.adminInvite.update.mockResolvedValue(rejectedInvite);
      mockEmailService.sendAdminRejection.mockResolvedValue(undefined);

      const result = await service.rejectInvite(
        'invite-id',
        'approver-id',
        'Not qualified',
      );

      expect(result).toEqual({
        message: 'Invitation rejected',
        inviteId: 'invite-1',
      });
      expect(mockPrismaService.adminInvite.update).toHaveBeenCalledWith({
        where: { id: 'invite-id' },
        data: {
          status: AdminInviteStatus.REJECTED,
          approvedBy: 'approver-id',
          rejectedAt: expect.any(Date),
          rejectionReason: 'Not qualified',
        },
      });
      expect(mockEmailService.sendAdminRejection).toHaveBeenCalledWith(
        acceptedInvite.email,
        acceptedInvite.username,
        'Not qualified',
      );
    });

    it('should reject invite without reason', async () => {
      const rejectedInvite = {
        ...acceptedInvite,
        status: AdminInviteStatus.REJECTED,
        rejectedAt: new Date(),
        approvedById: 'approver-id',
        rejectionReason: null,
      };

      mockPrismaService.adminInvite.findUnique.mockResolvedValue(
        acceptedInvite,
      );
      mockPrismaService.adminInvite.update.mockResolvedValue(rejectedInvite);
      mockEmailService.sendAdminRejection.mockResolvedValue(undefined);

      const result = await service.rejectInvite('invite-id', 'approver-id');

      expect(result).toEqual({
        message: 'Invitation rejected',
        inviteId: 'invite-1',
      });
      expect(mockEmailService.sendAdminRejection).toHaveBeenCalledWith(
        acceptedInvite.email,
        acceptedInvite.username,
        undefined,
      );
    });

    it('should throw NotFoundException if invite not found', async () => {
      mockPrismaService.adminInvite.findUnique.mockResolvedValue(null);

      await expect(
        service.rejectInvite('invalid-id', 'approver-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if invite not accepted', async () => {
      mockPrismaService.adminInvite.findUnique.mockResolvedValue(
        mockAdminInvite,
      );

      await expect(
        service.rejectInvite('invite-id', 'approver-id'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('revokeInvite', () => {
    it('should revoke invite by sender', async () => {
      mockPrismaService.adminInvite.findUnique.mockResolvedValue(
        mockAdminInvite,
      );
      mockPrismaService.adminInvite.update.mockResolvedValue({
        ...mockAdminInvite,
        status: AdminInviteStatus.REVOKED,
        revokedAt: new Date(),
      });

      const result = await service.revokeInvite('invite-1', 'admin-1');

      expect(result).toEqual({
        message: 'Invitation revoked',
        inviteId: 'invite-1',
      });
      expect(mockPrismaService.adminInvite.update).toHaveBeenCalledWith({
        where: { id: 'invite-1' },
        data: {
          status: AdminInviteStatus.REVOKED,
          revokedAt: expect.any(Date),
        },
      });
    });

    it('should revoke invite by admin', async () => {
      const adminSender = {
        ...mockAdminUser,
        id: 'admin-id',
        role: AdminRole.ADMIN,
      };
      const inviteFromOther = { ...mockAdminInvite, sentBy: 'other-id' };

      mockPrismaService.adminInvite.findUnique.mockResolvedValue(
        inviteFromOther,
      );
      mockPrismaService.adminUser.findUnique.mockResolvedValue(adminSender);
      mockPrismaService.adminInvite.update.mockResolvedValue({
        ...inviteFromOther,
        status: AdminInviteStatus.REVOKED,
      });

      const result = await service.revokeInvite('invite-1', 'admin-id');

      expect(result).toEqual({
        message: 'Invitation revoked',
        inviteId: 'invite-1',
      });
    });

    it('should throw NotFoundException if invite not found', async () => {
      mockPrismaService.adminInvite.findUnique.mockResolvedValue(null);

      await expect(
        service.revokeInvite('invalid-id', 'sender-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if invite already approved/rejected', async () => {
      const approvedInvite = {
        ...mockAdminInvite,
        status: AdminInviteStatus.APPROVED,
      };
      mockPrismaService.adminInvite.findUnique.mockResolvedValue(
        approvedInvite,
      );

      await expect(
        service.revokeInvite('invite-id', 'sender-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if not sender or admin', async () => {
      const moderator = {
        ...mockAdminUser,
        id: 'moderator-id',
        role: AdminRole.MODERATOR,
      };

      mockPrismaService.adminInvite.findUnique.mockResolvedValue(
        mockAdminInvite, // sentBy: 'admin-1'
      );
      mockPrismaService.adminUser.findUnique.mockResolvedValue(moderator);

      await expect(
        service.revokeInvite('invite-1', 'moderator-id'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cleanupExpiredInvites', () => {
    it('should mark expired invites as EXPIRED', async () => {
      mockPrismaService.adminInvite.updateMany.mockResolvedValue({ count: 5 });

      await service.cleanupExpiredInvites();

      expect(mockPrismaService.adminInvite.updateMany).toHaveBeenCalledWith({
        where: {
          status: {
            in: [AdminInviteStatus.PENDING, AdminInviteStatus.ACCEPTED],
          },
          expiresAt: {
            lt: expect.any(Date),
          },
        },
        data: {
          status: AdminInviteStatus.EXPIRED,
        },
      });
    });

    it('should handle errors by throwing', async () => {
      mockPrismaService.adminInvite.updateMany.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.cleanupExpiredInvites()).rejects.toThrow(
        'Database error',
      );
    });
  });
});
