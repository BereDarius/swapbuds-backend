import { PrismaService } from '@/prisma/prisma.service';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

/**
 * Guard to check if user is a moderator or admin
 * Moderators can moderate content but have limited access compared to admins
 */
@Injectable()
export class ModeratorGuard implements CanActivate {
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

    // Allow both moderators and admins
    const hasAccess =
      user?.role === UserRole.ADMIN || user?.role === UserRole.MODERATOR;

    if (!hasAccess) {
      throw new ForbiddenException('Moderator access required');
    }

    return true;
  }
}
