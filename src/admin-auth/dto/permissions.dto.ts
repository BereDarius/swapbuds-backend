import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class GrantPermissionsDto {
  @ApiProperty({
    description: 'Admin user ID to grant permissions to',
    example: 'clx1234567890abcdef',
  })
  @IsString()
  @IsNotEmpty()
  adminUserId: string;

  @ApiProperty({
    description: 'Array of permission names to grant',
    example: ['tickets:view', 'tickets:assign', 'tickets:close'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  permissions: string[];
}

export class RevokePermissionsDto {
  @ApiProperty({
    description: 'Admin user ID to revoke permissions from',
    example: 'clx1234567890abcdef',
  })
  @IsString()
  @IsNotEmpty()
  adminUserId: string;

  @ApiProperty({
    description: 'Array of permission names to revoke',
    example: ['tickets:delete'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  permissions: string[];
}
