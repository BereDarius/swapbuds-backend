import { PrismaService } from '@/prisma/prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { AuditAction } from '@prisma/client';

/**
 * Service for logging admin and moderator actions
 * Creates audit trail for compliance and security
 */
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Log an admin action
   */
  async log(params: {
    performedById: string;
    action: AuditAction;
    description: string;
    targetType?: string;
    targetId?: string;
    metadata?: Record<string, any>;
    ipAddress?: string;
  }): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          performedById: params.performedById,
          action: params.action,
          description: params.description,
          targetType: params.targetType,
          targetId: params.targetId,
          metadata: params.metadata || null,
          ipAddress: params.ipAddress,
        },
      });

      this.logger.log(
        `[AUDIT] ${params.action} by ${params.performedById}: ${params.description}`,
      );
    } catch (error) {
      this.logger.error('Failed to create audit log:', error);
      // Don't throw - audit logging shouldn't break the main operation
    }
  }

  /**
   * Get audit logs with pagination and filtering
   */
  async getAuditLogs(params: {
    page?: number;
    limit?: number;
    action?: AuditAction;
    performedById?: string;
    targetType?: string;
    targetId?: string;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.action) where.action = params.action;
    if (params.performedById) where.performedById = params.performedById;
    if (params.targetType) where.targetType = params.targetType;
    if (params.targetId) where.targetId = params.targetId;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          performedBy: {
            select: {
              id: true,
              username: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get recent audit logs for a specific target
   */
  async getLogsForTarget(
    targetType: string,
    targetId: string,
    limit: number = 10,
  ) {
    return this.prisma.auditLog.findMany({
      where: {
        targetType,
        targetId,
      },
      include: {
        performedBy: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get statistics about audit logs
   */
  async getAuditStats() {
    const [totalLogs, actionCounts, recentActivity] = await Promise.all([
      this.prisma.auditLog.count(),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        _count: true,
      }),
      this.prisma.auditLog.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      }),
    ]);

    return {
      totalLogs,
      actionCounts: actionCounts.reduce(
        (acc, item) => {
          acc[item.action] = item._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
      recentActivity,
    };
  }
}
