import { Cacheable, CacheInvalidate } from '@/cache/cache.module';
import { PrismaService } from '@/prisma/prisma.service';
import { UploadService } from '@/upload/upload.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserProfileDto } from './dto/user-profile.dto';

/**
 * Service handling user profile operations
 * Manages profile updates, avatar uploads, and public profile data
 */
@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private uploadService: UploadService,
  ) {}

  /**
   * Get public user profile by ID (with Redis caching)
   * @param userId - User ID
   * @returns Public profile information with stats
   * @throws NotFoundException if user not found
   */
  @Cacheable({
    ttl: 600000, // 10 minutes
    keyGenerator: (userId: string) => `users:${userId}`,
  })
  async getUserProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            items: true,
            tradesProposed: {
              where: { status: 'COMPLETED' },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return {
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      location: user.location,
      reputationScore: user.reputationScore,
      createdAt: user.createdAt,
      itemsCount: user._count.items,
      tradesCount: user._count.tradesProposed,
    };
  }

  /**
   * Update user profile
   * @param userId - User ID
   * @param updateProfileDto - Profile data to update
   * @returns Updated profile information
   * @throws NotFoundException if user not found
   */
  @CacheInvalidate((userId: string) => [`users:${userId}:*`])
  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<UserProfileDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: updateProfileDto,
    });

    return this.getUserProfile(userId);
  }

  /**
   * Upload user avatar to Cloudinary
   * @param userId - User ID
   * @param file - Avatar image file
   * @returns Updated profile with new avatar URL
   * @throws NotFoundException if user not found
   */
  @CacheInvalidate((userId: string) => [`users:${userId}:*`])
  async uploadAvatar(
    userId: string,
    file: Express.Multer.File,
  ): Promise<UserProfileDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Delete old avatar from Cloudinary if exists
    if (user.avatarUrl) {
      const publicId = this.extractPublicId(user.avatarUrl);
      if (publicId) {
        await this.uploadService.deleteImage(publicId);
      }
    }

    // Upload new avatar
    const uploadResult = await this.uploadService.uploadImage(
      file,
      'swapbuds/avatars',
    );

    // Update user with new avatar URL
    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: uploadResult.secure_url },
    });

    return this.getUserProfile(userId);
  }

  /**
   * Extract Cloudinary public ID from URL
   * @param url - Cloudinary URL
   * @returns Public ID or null
   */
  private extractPublicId(url: string): string | null {
    try {
      const match = url.match(/\/([^\/]+)\.[^.]+$/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }
}
