import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * DTO for admin to resolve a dispute
 */
export class ResolveDisputeDto {
  @ApiProperty({
    description: 'Admin notes about the resolution',
    example: 'Investigated both parties. Evidence supports reporter claims.',
    minLength: 10,
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(2000)
  adminNotes: string;

  @ApiProperty({
    description: 'Resolution details and actions taken',
    example:
      'Trade cancelled. Refund processed. Warning issued to reported user.',
    minLength: 10,
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(2000)
  resolution: string;
}
