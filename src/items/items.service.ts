import { CacheService } from '@/cache/cache.service';
import { PrismaService } from '@/prisma/prisma.service';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateItemDto } from './dto/create-item.dto';
import { ItemResponseDto } from './dto/item-response.dto';
import { UpdateItemDto } from './dto/update-item.dto';

/**
 * Service handling business logic for items
 * Manages CRUD operations with database through Prisma
 */
@Injectable()
export class ItemsService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  /**
   * Create a new item for a user
   * @param userId - ID of the user creating the item
   * @param createItemDto - Item data
   * @returns Created item with owner details
   */
  async create(
    userId: string,
    createItemDto: CreateItemDto,
  ): Promise<ItemResponseDto> {
    // Separate images from other fields
    const { images, ...itemData } = createItemDto;

    const item = await this.prisma.item.create({
      data: {
        ...itemData,
        userId,
        // Create related ItemImage records if images provided
        ...(images && images.length > 0
          ? {
              images: {
                create: images.map((url, index) => ({
                  url,
                  publicId: `item-${Date.now()}-${index}`, // Temporary, will be replaced with Cloudinary publicId
                  order: index,
                })),
              },
            }
          : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        images: true,
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    // Invalidate item list caches and user's items cache when new item is created
    await this.cacheService.invalidateItem(item.id);
    await this.cacheService.del(this.cacheService.getUserItemsKey(userId));

    return this.mapToResponse(item);
  }

  /**
   * Get all items with pagination (with Redis caching)
   * @param skip - Number of items to skip
   * @param take - Number of items to take
   * @returns Array of items
   */
  async findAll(skip = 0, take = 20): Promise<ItemResponseDto[]> {
    // Generate cache key based on pagination
    const page = Math.floor(skip / take);
    const cacheKey = this.cacheService.getItemsListKey(page, take);

    // Try to get from cache first
    const cached = await this.cacheService.get<ItemResponseDto[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // If not in cache, fetch from database
    const items = await this.prisma.item.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        images: true,
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    const response = items.map((item) => this.mapToResponse(item));

    // Cache the result for 5 minutes (300000ms)
    await this.cacheService.set(cacheKey, response, 300000);

    return response;
  }

  /**
   * Get items by user ID (with Redis caching)
   * @param userId - User ID
   * @returns Array of user's items
   */
  async findByUser(userId: string): Promise<ItemResponseDto[]> {
    // Try cache first
    const cacheKey = this.cacheService.getUserItemsKey(userId);
    const cached = await this.cacheService.get<ItemResponseDto[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from database if not cached
    const items = await this.prisma.item.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        images: true,
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    const response = items.map((item) => this.mapToResponse(item));

    // Cache the result for 5 minutes
    await this.cacheService.set(cacheKey, response, 300000);

    return response;
  }

  /**
   * Get a single item by ID (with Redis caching)
   * @param id - Item ID
   * @returns Item details
   * @throws NotFoundException if item not found
   */
  async findOne(id: string): Promise<ItemResponseDto> {
    // Try cache first
    const cacheKey = this.cacheService.getItemKey(id);
    const cached = await this.cacheService.get<ItemResponseDto>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from database if not cached
    const item = await this.prisma.item.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        images: true,
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }

    const response = this.mapToResponse(item);

    // Cache the result for 5 minutes
    await this.cacheService.set(cacheKey, response, 300000);

    return response;
  }

  /**
   * Update an item
   * @param id - Item ID
   * @param userId - ID of user making the update
   * @param updateItemDto - Updated item data
   * @returns Updated item
   * @throws NotFoundException if item not found
   * @throws ForbiddenException if user is not the owner
   */
  async update(
    id: string,
    userId: string,
    updateItemDto: UpdateItemDto,
  ): Promise<ItemResponseDto> {
    const item = await this.prisma.item.findUnique({ where: { id } });

    if (!item) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }

    if (item.userId !== userId) {
      throw new ForbiddenException('You can only update your own items');
    }

    // Separate images from other fields
    const { images, ...itemData } = updateItemDto;

    const updatedItem = await this.prisma.item.update({
      where: { id },
      data: {
        ...itemData,
        // Handle images update if provided
        ...(images !== undefined
          ? {
              images: {
                deleteMany: {},
                create: images.map((url, index) => ({
                  url,
                  publicId: `item-${Date.now()}-${index}`,
                  order: index,
                })),
              },
            }
          : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        images: true,
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    // Invalidate cache for this item, lists, and user's items
    await this.cacheService.invalidateItem(id);
    await this.cacheService.del(this.cacheService.getUserItemsKey(userId));

    return this.mapToResponse(updatedItem);
  }

  /**
   * Delete an item
   * @param id - Item ID
   * @param userId - ID of user making the deletion
   * @throws NotFoundException if item not found
   * @throws ForbiddenException if user is not the owner
   */
  async remove(id: string, userId: string): Promise<void> {
    const item = await this.prisma.item.findUnique({ where: { id } });

    if (!item) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }

    if (item.userId !== userId) {
      throw new ForbiddenException('You can only delete your own items');
    }

    await this.prisma.item.delete({ where: { id } });

    // Invalidate cache for this item, lists, and user's items
    await this.cacheService.invalidateItem(id);
    await this.cacheService.del(this.cacheService.getUserItemsKey(userId));
  }

  /**
   * Maps Prisma item to response DTO
   * @param item - Prisma item with relations
   * @returns Formatted item response
   */
  private mapToResponse(item: any): ItemResponseDto {
    return {
      id: item.id,
      title: item.title,
      description: item.description,
      category: item.category,
      condition: item.condition,
      images: item.images?.map((img: any) => img.url) || [],
      owner: {
        id: item.user.id,
        username: item.user.username,
        avatarUrl: item.user.avatarUrl,
      },
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      likesCount: item._count.likes,
      commentsCount: item._count.comments,
    };
  }
}
