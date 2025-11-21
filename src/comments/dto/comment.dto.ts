import { ApiProperty } from '@nestjs/swagger';

export class CommentDto {
  @ApiProperty({ description: 'Comment ID' })
  id: string;

  @ApiProperty({ description: 'Comment content' })
  content: string;

  @ApiProperty({ description: 'Item ID' })
  itemId: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Username of the commenter' })
  username: string;

  @ApiProperty({ description: 'Avatar URL of the commenter', nullable: true })
  avatarUrl: string | null;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}
