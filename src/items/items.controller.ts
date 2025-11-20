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
   * Get all items with pagination
   * Public endpoint - no authentication required
   */
  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all items with pagination' })
  @ApiQuery({
    name: 'skip',
    required: false,
    type: Number,
    description: 'Number of items to skip',
  })
  @ApiQuery({
    name: 'take',
    required: false,
    type: Number,
    description: 'Number of items to return',
  })
  @ApiResponse({
    status: 200,
    description: 'Items retrieved successfully',
    type: [ItemResponseDto],
  })
  async findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ): Promise<ItemResponseDto[]> {
    return this.itemsService.findAll(
      skip ? parseInt(skip, 10) : 0,
      take ? parseInt(take, 10) : 20,
    );
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
