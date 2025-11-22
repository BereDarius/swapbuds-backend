import { ApiProperty } from '@nestjs/swagger';
import { CounterOfferStatus } from '@prisma/client';

/**
 * Item info embedded in counter-offer response
 */
export class CounterOfferItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  condition: string;

  @ApiProperty()
  category: string;

  @ApiProperty({ type: [String] })
  images: string[];
}

/**
 * User info embedded in counter-offer response
 */
export class CounterOfferUserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  username: string;

  @ApiProperty({ required: false })
  avatarUrl?: string;
}

/**
 * DTO for counter-offer response
 */
export class CounterOfferResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: CounterOfferStatus })
  status: CounterOfferStatus;

  @ApiProperty()
  tradeId: string;

  @ApiProperty({ type: CounterOfferUserDto })
  createdBy: CounterOfferUserDto;

  @ApiProperty({ type: CounterOfferItemDto })
  alternativeItem: CounterOfferItemDto;

  @ApiProperty({ required: false })
  message?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ required: false })
  expiresAt?: Date;
}
