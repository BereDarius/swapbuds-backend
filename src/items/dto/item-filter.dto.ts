import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  DeliveryMethod,
  DeliveryScope,
  ItemCategory,
  ItemCondition,
  ItemStatus,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

/**
 * DTO for filtering and paginating items
 * All fields are optional - use only what you need
 */
export class ItemFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by item status',
    enum: ItemStatus,
    example: ItemStatus.AVAILABLE,
  })
  @IsOptional()
  @IsEnum(ItemStatus)
  status?: ItemStatus;

  @ApiPropertyOptional({
    description: 'Filter by item category',
    enum: ItemCategory,
    example: ItemCategory.ELECTRONICS,
  })
  @IsOptional()
  @IsEnum(ItemCategory)
  category?: ItemCategory;

  @ApiPropertyOptional({
    description: 'Filter by item condition',
    enum: ItemCondition,
    example: ItemCondition.GOOD,
  })
  @IsOptional()
  @IsEnum(ItemCondition)
  condition?: ItemCondition;

  @ApiPropertyOptional({
    description: 'Search items by title or description (case-insensitive)',
    example: 'vintage pokemon',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description:
      'Filter by delivery method - only items that support this delivery method',
    enum: DeliveryMethod,
    example: DeliveryMethod.MAIL,
  })
  @IsOptional()
  @IsEnum(DeliveryMethod)
  deliveryMethod?: DeliveryMethod;

  @ApiPropertyOptional({
    description:
      'Filter by delivery scope - NATIONAL (same country) or INTERNATIONAL (worldwide)',
    enum: DeliveryScope,
    example: DeliveryScope.NATIONAL,
  })
  @IsOptional()
  @IsEnum(DeliveryScope)
  deliveryScope?: DeliveryScope;

  @ApiPropertyOptional({
    description:
      'Minimum estimated value in EUR - filters items with value >= this amount',
    example: 50,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minValue?: number;

  @ApiPropertyOptional({
    description:
      'Maximum estimated value in EUR - filters items with value <= this amount',
    example: 200,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxValue?: number;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    enum: ['createdAt', 'price', 'likes'],
    example: 'createdAt',
    default: 'createdAt',
  })
  @IsOptional()
  @IsEnum(['createdAt', 'price', 'likes'])
  sortBy?: 'createdAt' | 'price' | 'likes' = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    example: 'desc',
    default: 'desc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
