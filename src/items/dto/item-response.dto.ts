import { ApiProperty } from '@nestjs/swagger';
import { ItemCategory, ItemCondition } from './create-item.dto';

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

  @ApiProperty({ type: [String] })
  images: string[];

  @ApiProperty({ type: ItemUserDto })
  owner: ItemUserDto;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  likesCount: number;

  @ApiProperty()
  commentsCount: number;
}
