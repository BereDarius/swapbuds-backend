import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class CreateAdminInviteDto {
  @ApiProperty({ example: 'newadmin@swapbuds.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'new_admin' })
  @IsString()
  @IsNotEmpty()
  @Length(3, 30)
  username: string;

  @ApiProperty({ enum: AdminRole, example: AdminRole.SUPPORT })
  @IsEnum(AdminRole)
  role: AdminRole;
}

export class AcceptInviteDto {
  @ApiProperty({ example: 'cuid-token-here' })
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class ApproveInviteDto {
  @ApiProperty({ example: 'invite-id' })
  @IsString()
  @IsNotEmpty()
  inviteId: string;
}

export class RejectInviteDto {
  @ApiProperty({ example: 'invite-id' })
  @IsString()
  @IsNotEmpty()
  inviteId: string;

  @ApiPropertyOptional({ example: 'Not suitable for this role' })
  @IsString()
  @IsOptional()
  reason?: string;
}
