import { PrismaService } from '@/prisma/prisma.service';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DisputeStatus, TradeStatus, UserRole } from '@prisma/client';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { DisputeResponseDto } from './dto/dispute-response.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';

/**
 * Service for handling trade disputes
 */
@Injectable()
export class DisputesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new dispute
   * @param userId - User creating the dispute
   * @param createDisputeDto - Dispute details
   * @returns Created dispute
   */
  async createDispute(
    userId: string,
    createDisputeDto: CreateDisputeDto,
  ): Promise<DisputeResponseDto> {
    const { tradeId, reportedUserId, reason, description } = createDisputeDto;

    // Verify trade exists
    const trade = await this.prisma.trade.findUnique({
      where: { id: tradeId },
      include: {
        proposer: { select: { id: true } },
        responder: { select: { id: true } },
      },
    });

    if (!trade) {
      throw new NotFoundException('Trade not found');
    }

    // Verify user is part of the trade
    if (trade.proposerId !== userId && trade.responderId !== userId) {
      throw new ForbiddenException('You are not part of this trade');
    }

    // Verify reported user is the other party in the trade
    const otherPartyId =
      trade.proposerId === userId ? trade.responderId : trade.proposerId;
    if (reportedUserId !== otherPartyId) {
      throw new BadRequestException(
        'You can only report the other party in the trade',
      );
    }

    // Check if dispute already exists for this trade
    const existingDispute = await this.prisma.dispute.findFirst({
      where: {
        tradeId,
        reporterId: userId,
        status: { in: [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW] },
      },
    });

    if (existingDispute) {
      throw new BadRequestException(
        'You already have an open dispute for this trade',
      );
    }

    // Create dispute
    const dispute = await this.prisma.dispute.create({
      data: {
        tradeId,
        reporterId: userId,
        reportedUserId,
        reason,
        description,
      },
      include: {
        reporter: { select: { id: true, username: true } },
        reportedUser: { select: { id: true, username: true } },
        admin: { select: { id: true, username: true } },
      },
    });

    return this.formatDisputeResponse(dispute);
  }

  /**
   * Get all disputes for the authenticated user
   * @param userId - User ID
   * @returns List of disputes
   */
  async getUserDisputes(userId: string): Promise<DisputeResponseDto[]> {
    const disputes = await this.prisma.dispute.findMany({
      where: {
        OR: [{ reporterId: userId }, { reportedUserId: userId }],
      },
      include: {
        reporter: { select: { id: true, username: true } },
        reportedUser: { select: { id: true, username: true } },
        admin: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return disputes.map((dispute) => this.formatDisputeResponse(dispute));
  }

  /**
   * Get a specific dispute
   * @param disputeId - Dispute ID
   * @param userId - User ID
   * @returns Dispute details
   */
  async getDispute(
    disputeId: string,
    userId: string,
  ): Promise<DisputeResponseDto> {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        reporter: { select: { id: true, username: true } },
        reportedUser: { select: { id: true, username: true } },
        admin: { select: { id: true, username: true } },
      },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    // Verify user is involved in the dispute or is admin
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (
      dispute.reporterId !== userId &&
      dispute.reportedUserId !== userId &&
      user?.role !== UserRole.ADMIN
    ) {
      throw new ForbiddenException('You do not have access to this dispute');
    }

    return this.formatDisputeResponse(dispute);
  }

  /**
   * Get all disputes (admin only)
   * @param status - Optional status filter
   * @returns List of disputes
   */
  async getAllDisputes(status?: DisputeStatus): Promise<DisputeResponseDto[]> {
    const disputes = await this.prisma.dispute.findMany({
      where: status ? { status } : undefined,
      include: {
        reporter: { select: { id: true, username: true } },
        reportedUser: { select: { id: true, username: true } },
        admin: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return disputes.map((dispute) => this.formatDisputeResponse(dispute));
  }

  /**
   * Assign dispute to admin (admin only)
   * @param disputeId - Dispute ID
   * @param adminId - Admin ID
   * @returns Updated dispute
   */
  async assignDispute(
    disputeId: string,
    adminId: string,
  ): Promise<DisputeResponseDto> {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    if (dispute.status === DisputeStatus.RESOLVED) {
      throw new BadRequestException('Cannot assign a resolved dispute');
    }

    const updatedDispute = await this.prisma.dispute.update({
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

    return this.formatDisputeResponse(updatedDispute);
  }

  /**
   * Resolve a dispute (admin only)
   * @param disputeId - Dispute ID
   * @param resolveDisputeDto - Resolution details
   * @returns Resolved dispute
   */
  async resolveDispute(
    disputeId: string,
    resolveDisputeDto: ResolveDisputeDto,
  ): Promise<DisputeResponseDto> {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    if (dispute.status === DisputeStatus.RESOLVED) {
      throw new BadRequestException('Dispute is already resolved');
    }

    const { adminNotes, resolution } = resolveDisputeDto;

    const resolvedDispute = await this.prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: DisputeStatus.RESOLVED,
        adminNotes,
        resolution,
        resolvedAt: new Date(),
      },
      include: {
        reporter: { select: { id: true, username: true } },
        reportedUser: { select: { id: true, username: true } },
        admin: { select: { id: true, username: true } },
      },
    });

    // Optionally cancel the trade
    await this.prisma.trade.update({
      where: { id: dispute.tradeId },
      data: { status: TradeStatus.CANCELLED },
    });

    return this.formatDisputeResponse(resolvedDispute);
  }

  /**
   * Close a dispute without resolving (admin only)
   * @param disputeId - Dispute ID
   * @returns Closed dispute
   */
  async closeDispute(disputeId: string): Promise<DisputeResponseDto> {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    const closedDispute = await this.prisma.dispute.update({
      where: { id: disputeId },
      data: { status: DisputeStatus.CLOSED },
      include: {
        reporter: { select: { id: true, username: true } },
        reportedUser: { select: { id: true, username: true } },
        admin: { select: { id: true, username: true } },
      },
    });

    return this.formatDisputeResponse(closedDispute);
  }

  /**
   * Format dispute response
   * @param dispute - Raw dispute data
   * @returns Formatted response
   */
  private formatDisputeResponse(dispute: any): DisputeResponseDto {
    return {
      id: dispute.id,
      tradeId: dispute.tradeId,
      reporterId: dispute.reporterId,
      reporterUsername: dispute.reporter.username,
      reportedUserId: dispute.reportedUserId,
      reportedUserUsername: dispute.reportedUser.username,
      reason: dispute.reason,
      description: dispute.description,
      status: dispute.status,
      adminId: dispute.adminId,
      adminUsername: dispute.admin?.username || null,
      adminNotes: dispute.adminNotes,
      resolution: dispute.resolution,
      resolvedAt: dispute.resolvedAt,
      createdAt: dispute.createdAt,
      updatedAt: dispute.updatedAt,
    };
  }
}
