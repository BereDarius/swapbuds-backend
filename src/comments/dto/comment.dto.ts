import { ApiProperty } from '@nestjs/swagger';

export class CommentVersionDto {
  @ApiProperty({ description: 'Version ID' })
  id: string;

  @ApiProperty({ description: 'Previous content' })
  content: string;

  @ApiProperty({ description: 'User ID who made the edit' })
  editedBy: string;

  @ApiProperty({ description: 'When this version was created' })
  createdAt: Date;
}

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

  @ApiProperty({ description: 'Whether user is verified', required: false })
  isVerified?: boolean;

  @ApiProperty({ description: 'Parent comment ID for replies', nullable: true })
  parentId: string | null;

  @ApiProperty({ description: 'Whether comment has been edited' })
  isEdited: boolean;

  @ApiProperty({ description: 'When comment was edited', nullable: true })
  editedAt: Date | null;

  @ApiProperty({ description: 'Whether comment is soft-deleted' })
  isDeleted: boolean;

  @ApiProperty({ description: 'When comment was deleted', nullable: true })
  deletedAt: Date | null;

  @ApiProperty({ description: 'User ID who deleted comment', nullable: true })
  deletedBy: string | null;

  @ApiProperty({
    description: 'Reason for deletion (moderator)',
    nullable: true,
  })
  deleteReason: string | null;

  @ApiProperty({ description: 'Number of likes on this comment' })
  likesCount: number;

  @ApiProperty({
    description: 'Whether current user has liked this comment',
    required: false,
  })
  hasLiked?: boolean;

  @ApiProperty({
    description: 'Nested replies',
    type: [CommentDto],
    required: false,
  })
  replies?: CommentDto[];

  @ApiProperty({
    description: 'Edit history (admin only)',
    type: [CommentVersionDto],
    required: false,
  })
  versions?: CommentVersionDto[];

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}
