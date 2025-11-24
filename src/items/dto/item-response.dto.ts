import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  DeliveryMethod,
  DeliveryScope,
  ItemCategory,
  ItemCondition,
  ItemStatus,
} from '@prisma/client';

/**
 * User info embedded in item response
 */
export class ItemUserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  username: string;

  @ApiProperty({ required: false })
  avatarUrl?: string;

  @ApiProperty()
  reputationScore: number;

  @ApiProperty()
  isVerified: boolean;
}

/**
 * DTO for item response
 * Returned when fetching items from the API
 */
export class ItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ enum: ItemCategory })
  category: ItemCategory;

  @ApiProperty({ enum: ItemCondition })
  condition: ItemCondition;

  @ApiProperty({ enum: ItemStatus })
  status: ItemStatus;

  @ApiProperty({ type: [String] })
  images: string[];

  @ApiProperty({ type: ItemUserDto })
  owner: ItemUserDto;

  @ApiProperty({ enum: DeliveryMethod, isArray: true })
  deliveryMethods: DeliveryMethod[];

  @ApiProperty({ enum: DeliveryScope })
  deliveryScope: DeliveryScope;

  @ApiPropertyOptional()
  estimatedValue?: number;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  viewCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  likesCount: number;

  @ApiProperty()
  commentsCount: number;
}
