import { AuditLogService } from '@/admin/audit-log.service';
import { PrismaService } from '@/prisma/prisma.service';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  FlagReason,
  ItemStatus,
  ModerationStatus,
} from '@prisma/client';

export interface FlagItemDto {
  reason: FlagReason;
  description?: string;
}

export interface GetFlaggedItemsQuery {
  page?: number;
  limit?: number;
  status?: ModerationStatus;
  reason?: FlagReason;
}

export interface ApproveFlagDto {
  notes?: string;
}

export interface RemoveItemDto {
  reason: string;
  notifyUser?: boolean;
}

@Injectable()
export class ModerationService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) {}

  /**
   * Flag an item for moderation
   */
  async flagItem(
    itemId: string,
    userId: string,
    dto: FlagItemDto,
    ipAddress?: string,
  ) {
    // Check if item exists and is not already removed
    const item = await this.prisma.item.findUnique({
      where: { id: itemId },
      select: { id: true, status: true, userId: true },
    });

    if (!item) {
      throw new NotFoundException(`Item with ID ${itemId} not found`);
    }

    if (item.status === ItemStatus.REMOVED) {
      throw new BadRequestException('Cannot flag a removed item');
    }

    // Check if user is trying to flag their own item
    if (item.userId === userId) {
      throw new BadRequestException('You cannot flag your own item');
    }

    // Check if user has already flagged this item with the same reason
    const existingFlag = await this.prisma.flaggedItem.findFirst({
      where: {
        itemId,
        reportedById: userId,
        reason: dto.reason,
        status: ModerationStatus.PENDING,
      },
    });

    if (existingFlag) {
      throw new BadRequestException(
        'You have already flagged this item with this reason',
      );
    }

    // Create the flag
    const flag = await this.prisma.flaggedItem.create({
      data: {
        itemId,
        reportedById: userId,
        reason: dto.reason,
        description: dto.description,
        status: ModerationStatus.PENDING,
      },
      include: {
        item: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        reportedBy: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    // Create audit log
    await this.auditLogService.log({
      performedById: userId,
      action: AuditAction.ITEM_FLAG,
      description: `Item "${flag.item.title}" flagged for ${dto.reason}`,
      targetType: 'Item',
      targetId: itemId,
      metadata: {
        reason: dto.reason,
        description: dto.description,
      },
      ipAddress,
    });

    return flag;
  }

  /**
   * Get all flagged items with pagination and filters
   */
  async getFlaggedItems(query: GetFlaggedItemsQuery) {
    const { page = 1, limit = 20, status, reason } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (reason) {
      where.reason = reason;
    }

    const [items, total] = await Promise.all([
      this.prisma.flaggedItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          item: {
            select: {
              id: true,
              title: true,
              description: true,
              status: true,
              images: {
                select: {
                  url: true,
                  order: true,
                },
                orderBy: { order: 'asc' },
                take: 1,
              },
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                  reputationScore: true,
                },
              },
            },
          },
          reportedBy: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          reviewedBy: {
            select: {
              id: true,
              username: true,
              role: true,
            },
          },
        },
      }),
      this.prisma.flaggedItem.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single flagged item by ID
   */
  async getFlaggedItem(flagId: string) {
    const flag = await this.prisma.flaggedItem.findUnique({
      where: { id: flagId },
      include: {
        item: {
          include: {
            images: {
              orderBy: { order: 'asc' },
            },
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                reputationScore: true,
                createdAt: true,
              },
            },
          },
        },
        reportedBy: {
          select: {
            id: true,
            username: true,
            email: true,
            createdAt: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
    });

    if (!flag) {
      throw new NotFoundException(`Flagged item with ID ${flagId} not found`);
    }

    return flag;
  }

  /**
   * Approve a flagged item (dismiss the flag)
   */
  async approveItem(
    flagId: string,
    adminId: string,
    dto: ApproveFlagDto,
    ipAddress?: string,
  ) {
    // Get the flag
    const flag = await this.prisma.flaggedItem.findUnique({
      where: { id: flagId },
      include: {
        item: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!flag) {
      throw new NotFoundException(`Flagged item with ID ${flagId} not found`);
    }

    if (flag.status !== ModerationStatus.PENDING) {
      throw new BadRequestException(
        'Can only approve flags with PENDING status',
      );
    }

    // Update the flag status
    const updatedFlag = await this.prisma.flaggedItem.update({
      where: { id: flagId },
      data: {
        status: ModerationStatus.APPROVED,
        reviewedById: adminId,
        reviewedAt: new Date(),
        reviewNotes: dto.notes,
      },
      include: {
        item: true,
        reportedBy: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
    });

    // Create audit log
    await this.auditLogService.log({
      performedById: adminId,
      action: AuditAction.MODERATION_APPROVE,
      description: `Approved flag for item "${flag.item.title}" (reason: ${flag.reason})`,
      targetType: 'FlaggedItem',
      targetId: flagId,
      metadata: {
        itemId: flag.itemId,
        reason: flag.reason,
        notes: dto.notes,
      },
      ipAddress,
    });

    return updatedFlag;
  }

  /**
   * Remove a flagged item (mark item as REMOVED)
   */
  async removeItem(
    flagId: string,
    adminId: string,
    dto: RemoveItemDto,
    ipAddress?: string,
  ) {
    // Get the flag
    const flag = await this.prisma.flaggedItem.findUnique({
      where: { id: flagId },
      include: {
        item: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    });

    if (!flag) {
      throw new NotFoundException(`Flagged item with ID ${flagId} not found`);
    }

    if (flag.status !== ModerationStatus.PENDING) {
      throw new BadRequestException(
        'Can only remove items with PENDING flag status',
      );
    }

    if (flag.item.status === ItemStatus.REMOVED) {
      throw new BadRequestException('Item is already removed');
    }

    // Update both the flag and the item in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Update the flag
      const updatedFlag = await tx.flaggedItem.update({
        where: { id: flagId },
        data: {
          status: ModerationStatus.REMOVED,
          reviewedById: adminId,
          reviewedAt: new Date(),
          reviewNotes: dto.reason,
        },
        include: {
          item: true,
          reportedBy: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          reviewedBy: {
            select: {
              id: true,
              username: true,
              role: true,
            },
          },
        },
      });

      // Update the item status
      const updatedItem = await tx.item.update({
        where: { id: flag.itemId },
        data: {
          status: ItemStatus.REMOVED,
        },
      });

      return { flag: updatedFlag, item: updatedItem };
    });

    // Create audit log
    await this.auditLogService.log({
      performedById: adminId,
      action: AuditAction.MODERATION_REMOVE,
      description: `Removed item "${flag.item.title}" (reason: ${flag.reason})`,
      targetType: 'FlaggedItem',
      targetId: flagId,
      metadata: {
        itemId: flag.itemId,
        reason: flag.reason,
        removalReason: dto.reason,
      },
      ipAddress,
    });

    // TODO: Send notification to item owner if notifyUser is true

    return result.flag;
  }

  /**
   * Get moderation statistics
   */
  async getModerationStats() {
    const [
      totalFlags,
      pendingFlags,
      approvedFlags,
      removedFlags,
      flagsByReason,
      recentFlags,
    ] = await Promise.all([
      this.prisma.flaggedItem.count(),
      this.prisma.flaggedItem.count({
        where: { status: ModerationStatus.PENDING },
      }),
      this.prisma.flaggedItem.count({
        where: { status: ModerationStatus.APPROVED },
      }),
      this.prisma.flaggedItem.count({
        where: { status: ModerationStatus.REMOVED },
      }),
      this.prisma.flaggedItem.groupBy({
        by: ['reason'],
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
      }),
      this.prisma.flaggedItem.findMany({
        where: { status: ModerationStatus.PENDING },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          item: {
            select: {
              id: true,
              title: true,
            },
          },
          reportedBy: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      }),
    ]);

    return {
      total: totalFlags,
      pending: pendingFlags,
      approved: approvedFlags,
      removed: removedFlags,
      byReason: flagsByReason.map((item) => ({
        reason: item.reason,
        count: item._count.id,
      })),
      recentFlags,
    };
  }
}
