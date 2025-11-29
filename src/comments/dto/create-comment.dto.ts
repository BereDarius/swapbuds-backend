import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({
    description: 'Comment content',
    example: 'This item looks great! Is it still available?',
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  content: string;

  @ApiProperty({
    description: 'Parent comment ID for replies',
    example: 'clxxx123',
    required: false,
  })
  @IsString()
  @IsOptional()
  parentId?: string;
}
