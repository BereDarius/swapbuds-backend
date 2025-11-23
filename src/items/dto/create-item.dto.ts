import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

// Import enums from Prisma
import {
  DeliveryMethod,
  DeliveryScope,
  ItemCategory,
  ItemCondition,
} from '@prisma/client';

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

  @ApiProperty({
    description: 'Delivery methods supported for this item',
    enum: DeliveryMethod,
    isArray: true,
    example: [DeliveryMethod.PHYSICAL, DeliveryMethod.MAIL],
    default: [DeliveryMethod.PHYSICAL, DeliveryMethod.MAIL],
  })
  @IsArray()
  @IsEnum(DeliveryMethod, { each: true })
  @IsOptional()
  deliveryMethods?: DeliveryMethod[] = [
    DeliveryMethod.PHYSICAL,
    DeliveryMethod.MAIL,
  ];

  @ApiProperty({
    description:
      'Delivery scope: NATIONAL (only within your country) or INTERNATIONAL (worldwide)',
    enum: DeliveryScope,
    example: DeliveryScope.NATIONAL,
    default: DeliveryScope.NATIONAL,
  })
  @IsEnum(DeliveryScope)
  @IsOptional()
  deliveryScope?: DeliveryScope = DeliveryScope.NATIONAL;

  @ApiProperty({
    description:
      'Estimated value of the item in EUR (optional, for fair trade matching)',
    example: 50.0,
    minimum: 1,
    maximum: 100000,
    required: false,
  })
  @IsNumber()
  @Min(1)
  @Max(100000)
  @IsOptional()
  estimatedValue?: number;
}
