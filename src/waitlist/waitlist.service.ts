import { PrismaService } from '@/prisma/prisma.service';
import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Waitlist } from '@prisma/client';
import { CreateWaitlistDto } from './dto/create-waitlist.dto';
import {
  WaitlistEmailsDto,
  WaitlistStatsDto,
} from './dto/waitlist-response.dto';

@Injectable()
export class WaitlistService {
  private readonly logger = new Logger(WaitlistService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Add email to waitlist
   */
  async create(
    createDto: CreateWaitlistDto,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<Waitlist> {
    this.logger.log(`Adding email to waitlist: ${createDto.email}`);

    // Check if email already exists
    const existing = await this.prisma.waitlist.findUnique({
      where: { email: createDto.email },
    });

    if (existing) {
      throw new ConflictException('Email already on waitlist');
    }

    return this.prisma.waitlist.create({
      data: {
        email: createDto.email.toLowerCase().trim(),
        source: createDto.source || 'landing_page',
        referralCode: createDto.referralCode,
        userAgent,
        ipAddress,
      },
    });
  }

  /**
   * Get waitlist statistics (admin only)
   */
  async getStats(): Promise<WaitlistStatsDto> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [total, notified, last24Hours, last7Days] = await Promise.all([
      this.prisma.waitlist.count(),
      this.prisma.waitlist.count({ where: { notified: true } }),
      this.prisma.waitlist.count({ where: { createdAt: { gte: oneDayAgo } } }),
      this.prisma.waitlist.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
    ]);

    return {
      total,
      notified,
      pending: total - notified,
      last24Hours,
      last7Days,
    };
  }

  /**
   * Get all emails (admin only - for export)
   */
  async getAllEmails(
    notifiedOnly: boolean = false,
  ): Promise<WaitlistEmailsDto> {
    const where = notifiedOnly ? { notified: true } : {};

    const entries = await this.prisma.waitlist.findMany({
      where,
      select: { email: true },
      orderBy: { createdAt: 'asc' },
    });

    return {
      emails: entries.map((e) => e.email),
      count: entries.length,
    };
  }

  /**
   * Get all waitlist entries with pagination (admin only)
   */
  async findAll(
    page: number = 1,
    limit: number = 50,
    notified?: boolean,
  ): Promise<{ data: Waitlist[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    const where = notified !== undefined ? { notified } : {};

    const [data, total] = await Promise.all([
      this.prisma.waitlist.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.waitlist.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  /**
   * Mark emails as notified (admin only)
   */
  async markAsNotified(ids: string[]): Promise<{ count: number }> {
    const result = await this.prisma.waitlist.updateMany({
      where: { id: { in: ids } },
      data: {
        notified: true,
        notifiedAt: new Date(),
      },
    });

    this.logger.log(`Marked ${result.count} waitlist entries as notified`);

    return { count: result.count };
  }

  /**
   * Delete waitlist entry (admin only)
   */
  async remove(id: string): Promise<void> {
    const entry = await this.prisma.waitlist.findUnique({ where: { id } });

    if (!entry) {
      throw new NotFoundException('Waitlist entry not found');
    }

    await this.prisma.waitlist.delete({ where: { id } });
    this.logger.log(`Deleted waitlist entry: ${entry.email}`);
  }
}
