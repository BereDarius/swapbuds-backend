import { MailService } from '@/mail/mail.service';
import { PrismaService } from '@/prisma/prisma.service';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AdminInviteStatus, AdminRole, AdminStatus } from '@prisma/client';

@Injectable()
export class AdminInviteService {
  private readonly logger = new Logger(AdminInviteService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Create and send admin invitation
   */
  async createInvite(
    email: string,
    username: string,
    role: AdminRole,
    sentById: string,
  ) {
    // Check if email or username already exists
    const [existingUser, existingInvite] = await Promise.all([
      this.prisma.adminUser.findFirst({
        where: {
          OR: [{ email }, { username }],
        },
      }),
      this.prisma.adminInvite.findFirst({
        where: {
          email,
          status: {
            in: [AdminInviteStatus.PENDING, AdminInviteStatus.ACCEPTED],
          },
        },
      }),
    ]);

    if (existingUser) {
      throw new ConflictException('Email or username already exists');
    }

    if (existingInvite) {
      throw new ConflictException(
        'An active invitation already exists for this email',
      );
    }

    // Create invitation with 7-day expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invite = await this.prisma.adminInvite.create({
      data: {
        email,
        username,
        role,
        sentBy: sentById,
        expiresAt,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    // Send invitation email
    await this.mailService.sendAdminInvite(
      invite.email,
      invite.username,
      invite.token,
      invite.sender.username,
    );

    this.logger.log(
      `Admin invitation created for ${email} by ${sentById}, role: ${role}`,
    );

    return {
      id: invite.id,
      email: invite.email,
      username: invite.username,
      role: invite.role,
      status: invite.status,
      expiresAt: invite.expiresAt,
      sentAt: invite.sentAt,
    };
  }

  /**
   * Get all invitations (with filtering)
   */
  async getAllInvites(status?: AdminInviteStatus) {
    const where = status ? { status } : {};

    return this.prisma.adminInvite.findMany({
      where,
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
  }

  /**
   * Get invitation by token
   */
  async getInviteByToken(token: string) {
    const invite = await this.prisma.adminInvite.findUnique({
      where: { token },
      include: {
        sender: {
          select: {
            username: true,
          },
        },
      },
    });

    if (!invite) {
      throw new NotFoundException('Invalid invitation token');
    }

    // Check if expired
    if (invite.expiresAt < new Date()) {
      if (invite.status !== AdminInviteStatus.EXPIRED) {
        await this.prisma.adminInvite.update({
          where: { id: invite.id },
          data: { status: AdminInviteStatus.EXPIRED },
        });
      }
      throw new BadRequestException('This invitation has expired');
    }

    // Check status
    if (invite.status !== AdminInviteStatus.PENDING) {
      throw new BadRequestException(
        `This invitation has already been ${invite.status.toLowerCase()}`,
      );
    }

    return invite;
  }

  /**
   * Accept invitation (by recipient)
   */
  async acceptInvite(token: string) {
    const invite = await this.getInviteByToken(token);

    // Update invite status
    const updatedInvite = await this.prisma.adminInvite.update({
      where: { id: invite.id },
      data: {
        status: AdminInviteStatus.ACCEPTED,
        acceptedAt: new Date(),
      },
    });

    this.logger.log(
      `Admin invitation accepted by ${invite.email}, awaiting approval`,
    );

    // Notify admins of pending approval
    await this.notifyPendingApproval(updatedInvite.id);

    return {
      message:
        'Invitation accepted. Your account will be activated once approved by an administrator. You will receive an email with login instructions.',
      inviteId: updatedInvite.id,
      status: updatedInvite.status,
    };
  }

  /**
   * Approve invitation (create admin account)
   */
  async approveInvite(inviteId: string, approvedById: string) {
    const invite = await this.prisma.adminInvite.findUnique({
      where: { id: inviteId },
    });

    if (!invite) {
      throw new NotFoundException('Invitation not found');
    }

    if (invite.status !== AdminInviteStatus.ACCEPTED) {
      throw new BadRequestException(
        'Only accepted invitations can be approved',
      );
    }

    // Check if already expired
    if (invite.expiresAt < new Date()) {
      await this.prisma.adminInvite.update({
        where: { id: inviteId },
        data: { status: AdminInviteStatus.EXPIRED },
      });
      throw new BadRequestException('This invitation has expired');
    }

    // Create admin user account
    const adminUser = await this.prisma.adminUser.create({
      data: {
        email: invite.email,
        username: invite.username,
        password: '', // Will be set during first login with MFA setup
        role: invite.role,
        status: AdminStatus.PENDING_APPROVAL, // Will change to ACTIVE after MFA setup
        createdBy: invite.sentBy,
      },
    });

    // Update invite
    await this.prisma.adminInvite.update({
      where: { id: inviteId },
      data: {
        status: AdminInviteStatus.APPROVED,
        approvedBy: approvedById,
        approvedAt: new Date(),
        recipientId: adminUser.id,
      },
    });

    // Send approval email
    await this.mailService.sendAdminApproval(invite.email, invite.username);

    this.logger.log(
      `Admin invitation approved for ${invite.email} by ${approvedById}`,
    );

    return {
      message: 'Invitation approved successfully',
      adminUserId: adminUser.id,
      username: adminUser.username,
      email: adminUser.email,
      role: adminUser.role,
    };
  }

  /**
   * Reject invitation
   */
  async rejectInvite(inviteId: string, approvedById: string, reason?: string) {
    const invite = await this.prisma.adminInvite.findUnique({
      where: { id: inviteId },
    });

    if (!invite) {
      throw new NotFoundException('Invitation not found');
    }

    if (invite.status !== AdminInviteStatus.ACCEPTED) {
      throw new BadRequestException(
        'Only accepted invitations can be rejected',
      );
    }

    // Update invite
    await this.prisma.adminInvite.update({
      where: { id: inviteId },
      data: {
        status: AdminInviteStatus.REJECTED,
        approvedBy: approvedById,
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
    });

    // Send rejection email
    await this.mailService.sendAdminRejection(
      invite.email,
      invite.username,
      reason,
    );

    this.logger.log(
      `Admin invitation rejected for ${invite.email} by ${approvedById}`,
    );

    return {
      message: 'Invitation rejected',
      inviteId: invite.id,
    };
  }

  /**
   * Revoke invitation (by sender or admin)
   */
  async revokeInvite(inviteId: string, revokedById: string) {
    const invite = await this.prisma.adminInvite.findUnique({
      where: { id: inviteId },
    });

    if (!invite) {
      throw new NotFoundException('Invitation not found');
    }

    if (
      invite.status !== AdminInviteStatus.PENDING &&
      invite.status !== AdminInviteStatus.ACCEPTED
    ) {
      throw new BadRequestException(
        'Only pending or accepted invitations can be revoked',
      );
    }

    // Only sender or ADMIN role can revoke
    if (invite.sentBy !== revokedById) {
      const revoker = await this.prisma.adminUser.findUnique({
        where: { id: revokedById },
        select: { role: true },
      });

      if (revoker?.role !== AdminRole.ADMIN) {
        throw new BadRequestException(
          'Only the sender or an ADMIN can revoke this invitation',
        );
      }
    }

    await this.prisma.adminInvite.update({
      where: { id: inviteId },
      data: {
        status: AdminInviteStatus.REVOKED,
        revokedAt: new Date(),
      },
    });

    this.logger.log(
      `Admin invitation revoked for ${invite.email} by ${revokedById}`,
    );

    return {
      message: 'Invitation revoked',
      inviteId: invite.id,
    };
  }

  /**
   * Clean up expired invitations (cron job)
   */
  async cleanupExpiredInvites() {
    const result = await this.prisma.adminInvite.updateMany({
      where: {
        expiresAt: { lt: new Date() },
        status: { in: [AdminInviteStatus.PENDING, AdminInviteStatus.ACCEPTED] },
      },
      data: {
        status: AdminInviteStatus.EXPIRED,
      },
    });

    this.logger.log(`Marked ${result.count} expired invitations`);
    return result.count;
  }

  /**
   * Notify admins of pending approval (via Socket.IO gateway)
   */
  private async notifyPendingApproval(inviteId: string) {
    // This will be implemented when we add the Socket.IO gateway
    // For now, just log
    this.logger.log(
      `Pending approval notification for invite ${inviteId} (Socket.IO not yet implemented)`,
    );
  }
}
