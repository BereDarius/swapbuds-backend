import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RequestDeletionDto {
  @ApiPropertyOptional({
    description: 'Optional reason for account deletion',
    example: 'No longer using the service',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
