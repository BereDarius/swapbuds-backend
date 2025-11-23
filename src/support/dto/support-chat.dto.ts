import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SupportPriority } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateChatDto {
  @ApiProperty({ description: 'Subject of the support chat' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiPropertyOptional({
    description: 'Priority level',
    enum: SupportPriority,
    default: SupportPriority.MEDIUM,
  })
  @IsEnum(SupportPriority)
  @IsOptional()
  priority?: SupportPriority;

  @ApiProperty({ description: 'Initial message to start the chat' })
  @IsString()
  @IsNotEmpty()
  initialMessage: string;
}

export class SendMessageDto {
  @ApiProperty({ description: 'Message content' })
  @IsString()
  @IsNotEmpty()
  message: string;
}

export class ResolveChatDto {
  @ApiProperty({ description: 'Resolution notes' })
  @IsString()
  @IsNotEmpty()
  resolution: string;
}
