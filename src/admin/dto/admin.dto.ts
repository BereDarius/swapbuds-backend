import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class BanUserDto {
  @ApiProperty({ example: 'Violating community guidelines' })
  @IsString()
  reason: string;
}

export class UnbanUserDto {
  @ApiProperty({ example: 'Appeal approved' })
  @IsString()
  reason: string;
}

export class GetUsersQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ example: 'john' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class BulkBanUsersDto {
  @ApiProperty({
    example: ['user-id-1', 'user-id-2'],
    description: 'Array of user IDs to ban',
  })
  @IsString({ each: true })
  userIds: string[];

  @ApiProperty({ example: 'Violating community guidelines' })
  @IsString()
  reason: string;
}

export class BulkUnbanUsersDto {
  @ApiProperty({
    example: ['user-id-1', 'user-id-2'],
    description: 'Array of user IDs to unban',
  })
  @IsString({ each: true })
  userIds: string[];

  @ApiProperty({ example: 'Appeal approved' })
  @IsString()
  reason: string;
}
