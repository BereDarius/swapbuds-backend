import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO for creating a trade proposal
 * Proposer offers their item in exchange for responder's item
 */
export class CreateTradeDto {
  @ApiProperty({
    description: 'ID of the item being offered by the proposer',
    example: 'cm123abc456def',
  })
  @IsString()
  @IsNotEmpty()
  itemOfferedId: string;

  @ApiProperty({
    description: 'ID of the item being requested from the responder',
    example: 'cm789xyz123ghi',
  })
  @IsString()
  @IsNotEmpty()
  itemRequestedId: string;

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
}
