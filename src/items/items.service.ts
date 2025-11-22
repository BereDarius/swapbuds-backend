import { Cacheable, CacheInvalidate } from '@/cache/cache.module';
import { PrismaService } from '@/prisma/prisma.service';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateItemDto } from './dto/create-item.dto';
import { ItemFilterDto } from './dto/item-filter.dto';
import { ItemResponseDto } from './dto/item-response.dto';
import { UpdateItemDto } from './dto/update-item.dto';

/**
 * Service handling business logic for items
 * Manages CRUD operations with database through Prisma
 */
@Injectable()
export class ItemsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new item for a user
   * @param userId - ID of the user creating the item
   * @param createItemDto - Item data
   * @returns Created item with owner details
   */
  @CacheInvalidate((userId: string) => [
    'items:list:0:20:all',
    `users:${userId}:items`,
  ])
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

    return this.mapToResponse(item);
  }

  /**
   * Get all items with pagination (with Redis caching)
   * @param skip - Number of items to skip
   * @param take - Number of items to take
   * @returns Array of items
   */
  @Cacheable({
    ttl: 300000, // 5 minutes
    keyGenerator: (skip: number, take: number) => {
      const page = Math.floor(skip / take);
      return `items:list:${page}:${take}:all`;
    },
  })
  async findAll(skip = 0, take = 20): Promise<ItemResponseDto[]> {
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

    return items.map((item) => this.mapToResponse(item));
  }

  /**
   * Get filtered and paginated items
   * @param filters - Filter and pagination parameters
   * @returns Paginated items with metadata
   */
  async findAllFiltered(filters: ItemFilterDto): Promise<{
    items: ItemResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      status,
      category,
      condition,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    // Build where clause
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (category) {
      where.category = category;
    }

    if (condition) {
      where.condition = condition;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Build orderBy clause
    let orderBy: any;
    if (sortBy === 'likes') {
      orderBy = { likes: { _count: sortOrder } };
    } else {
      orderBy = { [sortBy]: sortOrder };
    }

    // Get total count
    const total = await this.prisma.item.count({ where });

    // Get paginated items
    const skip = (page - 1) * limit;
    const items = await this.prisma.item.findMany({
      where,
      skip,
      take: limit,
      orderBy,
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

    return {
      items: items.map((item) => this.mapToResponse(item)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get items by user ID (with Redis caching)
   * @param userId - User ID
   * @returns Array of user's items
   */
  @Cacheable({
    ttl: 300000, // 5 minutes
    keyGenerator: (userId: string) => `users:${userId}:items`,
  })
  async findByUser(userId: string): Promise<ItemResponseDto[]> {
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

    return items.map((item) => this.mapToResponse(item));
  }

  /**
   * Get a single item by ID (with Redis caching)
   * @param id - Item ID
   * @returns Item details
   * @throws NotFoundException if item not found
   */
  @Cacheable({
    ttl: 300000, // 5 minutes
    keyGenerator: (id: string) => `items:${id}`,
  })
  async findOne(id: string): Promise<ItemResponseDto> {
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

    return this.mapToResponse(item);
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
  @CacheInvalidate((id: string, userId: string) => [
    'items:*',
    `users:${userId}:*`,
  ])
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

    return this.mapToResponse(updatedItem);
  }

  /**
   * Delete an item
   * @param id - Item ID
   * @param userId - ID of user making the deletion
   * @throws NotFoundException if item not found
   * @throws ForbiddenException if user is not the owner
   */
  @CacheInvalidate((id: string, userId: string) => [
    'items:*',
    `users:${userId}:*`,
  ])
  async remove(id: string, userId: string): Promise<void> {
    const item = await this.prisma.item.findUnique({ where: { id } });

    if (!item) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }

    if (item.userId !== userId) {
      throw new ForbiddenException('You can only delete your own items');
    }

    await this.prisma.item.delete({ where: { id } });
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
