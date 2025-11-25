import { PrismaService } from '@/prisma/prisma.service';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

/**
 * Guard to check if user is support staff, moderator, or admin
 * Support staff can handle support tickets and user issues
 */
@Injectable()
export class SupportGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.sub;

    if (!userId) {
      throw new ForbiddenException('User not authenticated');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    // Allow support, moderators, and admins
    const hasAccess =
      user?.role === UserRole.ADMIN ||
      user?.role === UserRole.MODERATOR ||
      user?.role === UserRole.SUPPORT;

    if (!hasAccess) {
      throw new ForbiddenException('Support access required');
    }

    return true;
  }
}
