import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

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

export class ChangeUserRoleDto {
  @ApiProperty({
    enum: UserRole,
    example: UserRole.MODERATOR,
    description: 'New role for the user',
  })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiProperty({ example: 'Promoted to moderator' })
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

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
