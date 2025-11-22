import { ApiProperty } from '@nestjs/swagger';
import { DisputeReason } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * DTO for creating a new dispute
 */
export class CreateDisputeDto {
  @ApiProperty({
    description: 'Trade ID being disputed',
    example: 'trade-123',
  })
  @IsString()
  @IsNotEmpty()
  tradeId: string;

  @ApiProperty({
    description: 'User ID being reported',
    example: 'user-456',
  })
  @IsString()
  @IsNotEmpty()
  reportedUserId: string;

  @ApiProperty({
    description: 'Reason for the dispute',
    enum: DisputeReason,
    example: DisputeReason.ITEM_NOT_AS_DESCRIBED,
  })
  @IsEnum(DisputeReason)
  reason: DisputeReason;

  @ApiProperty({
    description: 'Detailed description of the issue',
    example:
      'The item received was significantly different from what was shown in the photos.',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description: string;
}
