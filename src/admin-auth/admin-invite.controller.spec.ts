import { Test, TestingModule } from '@nestjs/testing';
import { AdminInviteStatus, AdminRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  mockAdminInvite,
  mockAdminInviteRequest,
  mockAdminInviteService,
  resetAdminInviteServiceMocks,
} from '../test/mocks/admin-invite.mock';
import { mockPrismaService } from '../test/mocks/prisma.mock';
import { AdminInviteController } from './admin-invite.controller';
import { AdminInviteService } from './admin-invite.service';

describe('AdminInviteController', () => {
  let controller: AdminInviteController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminInviteController],
      providers: [
        {
          provide: AdminInviteService,
          useValue: mockAdminInviteService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<AdminInviteController>(AdminInviteController);
    resetAdminInviteServiceMocks();
  });

  describe('createInvite', () => {
    it('should create an invitation', async () => {
      const createDto = {
        email: 'newadmin@test.com',
        username: 'newadmin',
        role: AdminRole.MODERATOR,
      };

      mockAdminInviteService.createInvite.mockResolvedValue(mockAdminInvite);

      const result = await controller.createInvite(
        createDto,
        mockAdminInviteRequest as any,
      );

      expect(result).toEqual(mockAdminInvite);
      expect(mockAdminInviteService.createInvite).toHaveBeenCalledWith(
        createDto.email,
        createDto.username,
        createDto.role,
        mockAdminInviteRequest.user.id,
      );
    });

    it('should extract user id from request', async () => {
      const createDto = {
        email: 'test@test.com',
        username: 'test',
        role: AdminRole.SUPPORT,
      };

      mockAdminInviteService.createInvite.mockResolvedValue(mockAdminInvite);

      await controller.createInvite(createDto, {
        user: { sub: 'sender-123' },
      } as any);

      expect(mockAdminInviteService.createInvite).toHaveBeenCalledWith(
        createDto.email,
        createDto.username,
        createDto.role,
        'sender-123',
      );
    });
  });

  describe('getAllInvites', () => {
    it('should return all invites without filter', async () => {
      const invites = [mockAdminInvite];
      mockAdminInviteService.getAllInvites.mockResolvedValue(invites);

      const result = await controller.getAllInvites();

      expect(result).toEqual(invites);
      expect(mockAdminInviteService.getAllInvites).toHaveBeenCalledWith(
        undefined,
      );
    });

    it('should return filtered invites by status', async () => {
      const invites = [mockAdminInvite];
      mockAdminInviteService.getAllInvites.mockResolvedValue(invites);

      const result = await controller.getAllInvites(AdminInviteStatus.PENDING);

      expect(result).toEqual(invites);
      expect(mockAdminInviteService.getAllInvites).toHaveBeenCalledWith(
        AdminInviteStatus.PENDING,
      );
    });

    it('should handle ACCEPTED status filter', async () => {
      const acceptedInvites = [
        {
          ...mockAdminInvite,
          status: AdminInviteStatus.ACCEPTED,
        },
      ];
      mockAdminInviteService.getAllInvites.mockResolvedValue(acceptedInvites);

      const result = await controller.getAllInvites(AdminInviteStatus.ACCEPTED);

      expect(result).toEqual(acceptedInvites);
      expect(mockAdminInviteService.getAllInvites).toHaveBeenCalledWith(
        AdminInviteStatus.ACCEPTED,
      );
    });

    it('should handle APPROVED status filter', async () => {
      const approvedInvites = [
        {
          ...mockAdminInvite,
          status: AdminInviteStatus.APPROVED,
        },
      ];
      mockAdminInviteService.getAllInvites.mockResolvedValue(approvedInvites);

      const result = await controller.getAllInvites(AdminInviteStatus.APPROVED);

      expect(result).toEqual(approvedInvites);
    });

    it('should handle REJECTED status filter', async () => {
      const rejectedInvites = [
        {
          ...mockAdminInvite,
          status: AdminInviteStatus.REJECTED,
        },
      ];
      mockAdminInviteService.getAllInvites.mockResolvedValue(rejectedInvites);

      const result = await controller.getAllInvites(AdminInviteStatus.REJECTED);

      expect(result).toEqual(rejectedInvites);
    });
  });

  describe('getInviteByToken', () => {
    it('should return invite by token', async () => {
      mockAdminInviteService.getInviteByToken.mockResolvedValue(
        mockAdminInvite,
      );

      const result = await controller.getInviteByToken('test-token');

      expect(result).toEqual(mockAdminInvite);
      expect(mockAdminInviteService.getInviteByToken).toHaveBeenCalledWith(
        'test-token',
      );
    });

    it('should handle different token formats', async () => {
      const tokens = [
        'abc123',
        'token-with-dashes',
        'TOKEN_UPPERCASE',
        'mixedCaseToken123',
      ];

      for (const token of tokens) {
        mockAdminInviteService.getInviteByToken.mockResolvedValue({
          ...mockAdminInvite,
          token,
        });

        await controller.getInviteByToken(token);

        expect(mockAdminInviteService.getInviteByToken).toHaveBeenCalledWith(
          token,
        );
      }
    });
  });

  describe('acceptInvite', () => {
    it('should accept an invitation', async () => {
      const acceptDto = {
        token: 'test-token',
      };

      const acceptedInvite = {
        ...mockAdminInvite,
        status: AdminInviteStatus.ACCEPTED,
        acceptedAt: new Date(),
      };

      mockAdminInviteService.acceptInvite.mockResolvedValue(acceptedInvite);

      const result = await controller.acceptInvite(acceptDto);

      expect(result).toEqual(acceptedInvite);
      expect(mockAdminInviteService.acceptInvite).toHaveBeenCalledWith(
        acceptDto.token,
      );
    });

    it('should handle token from request body', async () => {
      const acceptDto = {
        token: 'different-token-123',
      };

      mockAdminInviteService.acceptInvite.mockResolvedValue({
        ...mockAdminInvite,
        status: AdminInviteStatus.ACCEPTED,
      });

      await controller.acceptInvite(acceptDto);

      expect(mockAdminInviteService.acceptInvite).toHaveBeenCalledWith(
        'different-token-123',
      );
    });
  });

  describe('approveInvite', () => {
    it('should approve an invitation', async () => {
      const approveDto = {
        inviteId: 'invite-id',
      };

      const approvedInvite = {
        ...mockAdminInvite,
        status: AdminInviteStatus.APPROVED,
        approvedAt: new Date(),
        approvedById: mockAdminInviteRequest.user.id,
        recipientId: 'new-admin-id',
      };

      mockAdminInviteService.approveInvite.mockResolvedValue(approvedInvite);

      const result = await controller.approveInvite(approveDto, {
        user: mockAdminInviteRequest.user,
      } as any);

      expect(result).toEqual(approvedInvite);
      expect(mockAdminInviteService.approveInvite).toHaveBeenCalledWith(
        approveDto.inviteId,
        mockAdminInviteRequest.user.id,
      );
    });

    it('should extract approver id from request', async () => {
      const approveDto = {
        inviteId: 'invite-123',
      };

      mockAdminInviteService.approveInvite.mockResolvedValue({
        ...mockAdminInvite,
        status: AdminInviteStatus.APPROVED,
      });

      await controller.approveInvite(approveDto, {
        user: { sub: 'approver-456' },
      } as any);

      expect(mockAdminInviteService.approveInvite).toHaveBeenCalledWith(
        'invite-123',
        'approver-456',
      );
    });
  });

  describe('rejectInvite', () => {
    it('should reject an invitation with reason', async () => {
      const rejectDto = {
        inviteId: 'invite-id',
        reason: 'Not qualified',
      };

      const rejectedInvite = {
        ...mockAdminInvite,
        status: AdminInviteStatus.REJECTED,
        rejectedAt: new Date(),
        approvedById: mockAdminInviteRequest.user.id,
        rejectionReason: 'Not qualified',
      };

      mockAdminInviteService.rejectInvite.mockResolvedValue(rejectedInvite);

      const result = await controller.rejectInvite(rejectDto, {
        user: mockAdminInviteRequest.user,
      } as any);

      expect(result).toEqual(rejectedInvite);
      expect(mockAdminInviteService.rejectInvite).toHaveBeenCalledWith(
        rejectDto.inviteId,
        mockAdminInviteRequest.user.id,
        rejectDto.reason,
      );
    });

    it('should reject an invitation without reason', async () => {
      const rejectDto = {
        inviteId: 'invite-id',
      };

      const rejectedInvite = {
        ...mockAdminInvite,
        status: AdminInviteStatus.REJECTED,
        rejectedAt: new Date(),
        approvedById: mockAdminInviteRequest.user.id,
        rejectionReason: null,
      };

      mockAdminInviteService.rejectInvite.mockResolvedValue(rejectedInvite);

      const result = await controller.rejectInvite(rejectDto, {
        user: mockAdminInviteRequest.user,
      } as any);

      expect(result).toEqual(rejectedInvite);
      expect(mockAdminInviteService.rejectInvite).toHaveBeenCalledWith(
        rejectDto.inviteId,
        mockAdminInviteRequest.user.id,
        undefined,
      );
    });

    it('should extract rejector id from request', async () => {
      const rejectDto = {
        inviteId: 'invite-789',
        reason: 'Test reason',
      };

      mockAdminInviteService.rejectInvite.mockResolvedValue({
        ...mockAdminInvite,
        status: AdminInviteStatus.REJECTED,
      });

      await controller.rejectInvite(rejectDto, {
        user: { sub: 'rejector-999' },
      } as any);

      expect(mockAdminInviteService.rejectInvite).toHaveBeenCalledWith(
        'invite-789',
        'rejector-999',
        'Test reason',
      );
    });
  });

  describe('revokeInvite', () => {
    it('should revoke an invitation', async () => {
      const revokedInvite = {
        ...mockAdminInvite,
        status: AdminInviteStatus.REVOKED,
        revokedAt: new Date(),
      };

      mockAdminInviteService.revokeInvite.mockResolvedValue(revokedInvite);

      const result = await controller.revokeInvite('invite-id', {
        user: mockAdminInviteRequest.user,
      } as any);

      expect(result).toEqual(revokedInvite);
      expect(mockAdminInviteService.revokeInvite).toHaveBeenCalledWith(
        'invite-id',
        mockAdminInviteRequest.user.id,
      );
    });

    it('should extract revoker id from request', async () => {
      mockAdminInviteService.revokeInvite.mockResolvedValue({
        ...mockAdminInvite,
        status: AdminInviteStatus.REVOKED,
      });

      await controller.revokeInvite('invite-abc', {
        user: { sub: 'revoker-xyz' },
      } as any);

      expect(mockAdminInviteService.revokeInvite).toHaveBeenCalledWith(
        'invite-abc',
        'revoker-xyz',
      );
    });

    it('should handle different invite id formats', async () => {
      const inviteIds = ['invite-1', 'INVITE-2', 'uuid-format-id'];

      for (const inviteId of inviteIds) {
        mockAdminInviteService.revokeInvite.mockResolvedValue({
          ...mockAdminInvite,
          id: inviteId,
          status: AdminInviteStatus.REVOKED,
        });

        await controller.revokeInvite(inviteId, {
          user: mockAdminInviteRequest.user,
        } as any);

        expect(mockAdminInviteService.revokeInvite).toHaveBeenCalledWith(
          inviteId,
          mockAdminInviteRequest.user.id,
        );
      }
    });
  });
});
