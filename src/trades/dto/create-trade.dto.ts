import { ApiProperty } from '@nestjs/swagger';
import { DeliveryMethod } from '@prisma/client';
import {
  ArrayMinSize,
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

/**
 * DTO for creating a trade proposal
 * Supports both single-item (legacy) and multi-item trades
 * Either use legacy fields (itemOfferedId, itemRequestedId) OR new arrays (itemsOfferedIds, itemsRequestedIds)
 */
export class CreateTradeDto {
  // Legacy single-item fields (backward compatibility)
  @ApiProperty({
    description:
      'ID of the item being offered by the proposer (legacy single-item)',
    example: 'cm123abc456def',
    required: false,
  })
  @IsString()
  @IsOptional()
  @ValidateIf((o) => !o.itemsOfferedIds || o.itemsOfferedIds.length === 0)
  @IsNotEmpty()
  itemOfferedId?: string;

  @ApiProperty({
    description:
      'ID of the item being requested from the responder (legacy single-item)',
    example: 'cm789xyz123ghi',
    required: false,
  })
  @IsString()
  @IsOptional()
  @ValidateIf((o) => !o.itemsRequestedIds || o.itemsRequestedIds.length === 0)
  @IsNotEmpty()
  itemRequestedId?: string;

  // Multi-item fields
  @ApiProperty({
    description: 'Array of item IDs being offered by the proposer',
    example: ['cm123abc456def', 'cm456def789ghi'],
    required: false,
    type: [String],
  })
  @IsArray()
  @IsOptional()
  @ValidateIf((o) => !o.itemOfferedId)
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @IsString({ each: true })
  itemsOfferedIds?: string[];

  @ApiProperty({
    description: 'Array of item IDs being requested from the responder',
    example: ['cm789xyz123ghi', 'cmabc123def456'],
    required: false,
    type: [String],
  })
  @IsArray()
  @IsOptional()
  @ValidateIf((o) => !o.itemRequestedId)
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @IsString({ each: true })
  itemsRequestedIds?: string[];

  @ApiProperty({
    description: 'Optional message to include with the trade proposal',
    example:
      'Hi! I love your vintage Pokemon cards. Would you swap for my game?',
    required: false,
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  message?: string;

  @ApiProperty({
    description:
      'Delivery method for the trade (must be supported by both items)',
    enum: DeliveryMethod,
    example: DeliveryMethod.PHYSICAL,
    required: true,
  })
  @IsEnum(DeliveryMethod)
  @IsNotEmpty()
  deliveryMethod: DeliveryMethod;
}
