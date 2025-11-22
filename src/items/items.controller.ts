import { CurrentUser, Public } from '@/auth/decorators/auth.decorators';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateItemDto } from './dto/create-item.dto';
import { ItemFilterDto } from './dto/item-filter.dto';
import { ItemResponseDto } from './dto/item-response.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { ItemsService } from './items.service';

/**
 * Controller handling item-related HTTP requests
 * Provides endpoints for CRUD operations on items
 */
@ApiTags('items')
@Controller('items')
@UseGuards(JwtAuthGuard)
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  /**
   * Create a new item
   * Requires authentication
   */
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new item' })
  @ApiResponse({
    status: 201,
    description: 'Item created successfully',
    type: ItemResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @CurrentUser('sub') userId: string,
    @Body() createItemDto: CreateItemDto,
  ): Promise<ItemResponseDto> {
    return this.itemsService.create(userId, createItemDto);
  }

  /**
   * Get all items with optional filters
   * Public endpoint - no authentication required
   */
  @Get()
  @Public()
  @ApiOperation({
    summary: 'Get all items with optional filtering and pagination',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['AVAILABLE', 'IN_TRADE', 'TRADED', 'REMOVED'],
  })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: [
      'ELECTRONICS',
      'CLOTHING',
      'BOOKS',
      'TOYS',
      'SPORTS',
      'COLLECTIBLES',
      'HOME',
      'OTHER',
    ],
  })
  @ApiQuery({
    name: 'condition',
    required: false,
    enum: ['NEW', 'LIKE_NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'POOR'],
  })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['createdAt', 'likes'],
  })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Items retrieved successfully',
  })
  async findAll(
    @Query() filters: ItemFilterDto,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    // Check if using old pagination style (skip/take) or filters
    if (skip !== undefined || take !== undefined) {
      // Legacy pagination
      const items = await this.itemsService.findAll(
        skip ? parseInt(skip, 10) : 0,
        take ? parseInt(take, 10) : 20,
      );
      return { items, total: items.length };
    }

    // Check if any filters are provided
    if (
      !filters.status &&
      !filters.category &&
      !filters.condition &&
      !filters.search &&
      !filters.page &&
      !filters.limit &&
      !filters.sortBy &&
      !filters.sortOrder
    ) {
      // No filters, use simple cached method
      const items = await this.itemsService.findAll(0, 20);
      return { items, total: items.length };
    }

    // Use filtered method
    return this.itemsService.findAllFiltered(filters);
  }

  /**
   * Get items by user ID
   * Public endpoint
   */
  @Get('user/:userId')
  @Public()
  @ApiOperation({ summary: 'Get all items for a specific user' })
  @ApiResponse({
    status: 200,
    description: 'User items retrieved successfully',
    type: [ItemResponseDto],
  })
  async findByUser(
    @Param('userId') userId: string,
  ): Promise<ItemResponseDto[]> {
    return this.itemsService.findByUser(userId);
  }

  /**
   * Get a single item by ID
   * Public endpoint
   */
  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get item by ID' })
  @ApiResponse({
    status: 200,
    description: 'Item retrieved successfully',
    type: ItemResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async findOne(@Param('id') id: string): Promise<ItemResponseDto> {
    return this.itemsService.findOne(id);
  }

  /**
   * Update an item
   * Requires authentication and ownership
   */
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an item' })
  @ApiResponse({
    status: 200,
    description: 'Item updated successfully',
    type: ItemResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not the owner' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async update(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body() updateItemDto: UpdateItemDto,
  ): Promise<ItemResponseDto> {
    return this.itemsService.update(id, userId, updateItemDto);
  }

  /**
   * Delete an item
   * Requires authentication and ownership
   */
  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an item' })
  @ApiResponse({ status: 204, description: 'Item deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not the owner' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ): Promise<void> {
    return this.itemsService.remove(id, userId);
  }
}
