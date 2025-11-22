import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000, {
    message: 'Message content must not exceed 5000 characters',
  })
  content: string;

  @IsString()
  @IsNotEmpty()
  recipientId: string;

  @IsString()
  @IsOptional()
  tradeId?: string; // Optional: if message is related to a trade

  @IsString()
  @IsOptional()
  type?: string; // Default: 'text', can be 'image', 'system'
}
