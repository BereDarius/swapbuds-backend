import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class BulkApproveFlagsDto {
  @ApiProperty({
    example: ['flag-id-1', 'flag-id-2'],
    description: 'Array of flagged item IDs to approve',
  })
  @IsArray()
  @IsString({ each: true })
  flaggedItemIds: string[];

  @ApiPropertyOptional({ example: 'Reviewed and approved' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkRejectFlagsDto {
  @ApiProperty({
    example: ['flag-id-1', 'flag-id-2'],
    description: 'Array of flagged item IDs to reject',
  })
  @IsArray()
  @IsString({ each: true })
  flaggedItemIds: string[];

  @ApiProperty({ example: 'Not a policy violation' })
  @IsString()
  reason: string;
}

export class BulkRemoveFlagsDto {
  @ApiProperty({
    example: ['flag-id-1', 'flag-id-2'],
    description: 'Array of flagged item IDs to remove',
  })
  @IsArray()
  @IsString({ each: true })
  flaggedItemIds: string[];

  @ApiProperty({ example: 'Violates community guidelines' })
  @IsString()
  reason: string;
}
