import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

// Import enums from Prisma
import { ItemCategory, ItemCondition } from '@prisma/client';

/**
 * DTO for creating a new item
 * Validates all required fields for item creation
 */
export class CreateItemDto {
  @ApiProperty({
    description: 'Item title',
    example: 'Vintage Pokemon Cards',
    minLength: 3,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  title: string;

  @ApiProperty({
    description: 'Detailed description of the item',
    example:
      'Collection of vintage Pokemon cards from the 90s in excellent condition',
    minLength: 10,
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(1000)
  description: string;

  @ApiProperty({
    description: 'Item category',
    enum: ItemCategory,
    example: ItemCategory.COLLECTIBLES,
  })
  @IsEnum(ItemCategory)
  @IsNotEmpty()
  category: ItemCategory;

  @ApiProperty({
    description: 'Item condition',
    enum: ItemCondition,
    example: ItemCondition.GOOD,
  })
  @IsEnum(ItemCondition)
  @IsNotEmpty()
  condition: ItemCondition;

  @ApiProperty({
    description: 'Array of image URLs (Cloudinary)',
    example: ['https://res.cloudinary.com/...'],
    type: [String],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];
}
