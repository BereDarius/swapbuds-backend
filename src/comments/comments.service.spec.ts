import { PrismaService } from '@/prisma/prisma.service';
import {
  mockComment,
  mockCommentWithUser,
} from '@/test/fixtures/comment.fixture';
import { mockItem } from '@/test/fixtures/item.fixture';
import { mockPrismaService } from '@/test/mocks/prisma.mock';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CommentsService } from './comments.service';

describe('CommentsService', () => {
  let service: CommentsService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
    prisma = mockPrismaService;

    jest.clearAllMocks();
  });

  describe('createComment', () => {
    const userId = 'user-1';
    const itemId = 'item-1';
    const createCommentDto = { content: 'Test comment' };

    it('should create a comment successfully', async () => {
      prisma.item.findUnique.mockResolvedValue(mockItem);
      prisma.comment.create.mockResolvedValue(mockCommentWithUser);
      prisma.comment.count.mockResolvedValue(1);
      prisma.commentLike.count.mockResolvedValue(0);

      const result = await service.createComment(
        userId,
        itemId,
        createCommentDto,
      );

      expect(prisma.item.findUnique).toHaveBeenCalledWith({
        where: { id: itemId },
      });
      expect(prisma.comment.create).toHaveBeenCalledWith({
        data: {
          content: createCommentDto.content,
          userId,
          itemId,
          parentId: null,
        },
        include: {
          user: {
            select: {
              username: true,
              avatarUrl: true,
              isVerified: true,
            },
          },
        },
      });
      expect(prisma.comment.count).toHaveBeenCalledWith({
        where: {
          itemId,
          parentId: null,
          isDeleted: false,
        },
      });
      expect(result.content).toBe(createCommentDto.content);
      expect(result.commentsCount).toBe(1);
    });

    it('should throw NotFoundException if item does not exist', async () => {
      prisma.item.findUnique.mockResolvedValue(null);

      await expect(
        service.createComment(userId, itemId, createCommentDto),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.createComment(userId, itemId, createCommentDto),
      ).rejects.toThrow(`Item with ID ${itemId} not found`);
    });

    it('should create a reply to an existing comment', async () => {
      const parentId = 'parent-comment-1';
      const replyDto = { content: 'Reply comment', parentId };

      prisma.item.findUnique.mockResolvedValue(mockItem);
      prisma.comment.findUnique.mockResolvedValue({
        ...mockComment,
        id: parentId,
        itemId,
      });
      prisma.comment.create.mockResolvedValue({
        ...mockCommentWithUser,
        parentId,
      });
      prisma.comment.count.mockResolvedValue(1);
      prisma.commentLike.count.mockResolvedValue(0);

      const result = await service.createComment(userId, itemId, replyDto);

      expect(prisma.comment.findUnique).toHaveBeenCalledWith({
        where: { id: parentId },
      });
      expect(result.parentId).toBe(parentId);
    });

    it('should throw NotFoundException if parent comment does not exist', async () => {
      const replyDto = { content: 'Reply', parentId: 'non-existent' };

      prisma.item.findUnique.mockResolvedValue(mockItem);
      prisma.comment.findUnique.mockResolvedValue(null);

      await expect(
        service.createComment(userId, itemId, replyDto),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.createComment(userId, itemId, replyDto),
      ).rejects.toThrow(
        `Parent comment with ID ${replyDto.parentId} not found`,
      );
    });

    it('should throw BadRequestException if parent comment belongs to different item', async () => {
      const parentId = 'parent-1';
      const replyDto = { content: 'Reply', parentId };

      prisma.item.findUnique.mockResolvedValue(mockItem);
      prisma.comment.findUnique.mockResolvedValue({
        ...mockComment,
        id: parentId,
        itemId: 'different-item-id',
      });

      await expect(
        service.createComment(userId, itemId, replyDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createComment(userId, itemId, replyDto),
      ).rejects.toThrow('Parent comment does not belong to this item');
    });
  });

  describe('getItemComments', () => {
    it('should return all comments for an item', async () => {
      const itemId = 'item-1';
      prisma.comment.findMany.mockResolvedValue([mockCommentWithUser]);
      prisma.commentLike.findMany.mockResolvedValue([]);

      const result = await service.getItemComments(itemId);

      expect(prisma.comment.findMany).toHaveBeenCalledWith({
        where: { itemId },
        include: {
          user: {
            select: {
              username: true,
              avatarUrl: true,
              isVerified: true,
            },
          },
          _count: {
            select: {
              likes: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].content).toBe(mockCommentWithUser.content);
    });

    it('should include hasLiked flag when currentUserId is provided', async () => {
      const itemId = 'item-1';
      const currentUserId = 'user-1';
      prisma.comment.findMany.mockResolvedValue([mockCommentWithUser]);
      prisma.commentLike.findMany.mockResolvedValue([
        { commentId: mockCommentWithUser.id },
      ]);

      const result = await service.getItemComments(itemId, currentUserId);

      expect(prisma.commentLike.findMany).toHaveBeenCalledWith({
        where: {
          userId: currentUserId,
          commentId: { in: [mockCommentWithUser.id] },
        },
        select: { commentId: true },
      });
      expect(result[0].hasLiked).toBe(true);
    });

    it('should properly nest replies in topLevel comments', async () => {
      const itemId = 'item-1';
      const parentComment = {
        ...mockCommentWithUser,
        id: 'parent-1',
        parentId: null,
      };
      const replyComment = {
        ...mockCommentWithUser,
        id: 'reply-1',
        parentId: 'parent-1',
      };
      prisma.comment.findMany.mockResolvedValue([parentComment, replyComment]);
      prisma.commentLike.findMany.mockResolvedValue([]);

      const result = await service.getItemComments(itemId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('parent-1');
      expect(result[0].replies).toHaveLength(1);
      expect(result[0].replies![0].id).toBe('reply-1');
    });
  });

  describe('updateComment', () => {
    const commentId = 'comment-1';
    const userId = 'user-1';
    const updateCommentDto = { content: 'Updated comment' };

    it('should update a comment successfully', async () => {
      prisma.comment.findUnique.mockResolvedValue(mockCommentWithUser);
      prisma.commentVersion.create.mockResolvedValue({
        id: 'version-1',
        commentId: 'comment-1',
        content: mockCommentWithUser.content,
        editedBy: userId,
        createdAt: new Date(),
      });
      prisma.commentLike.findUnique.mockResolvedValue(null);
      prisma.comment.update.mockResolvedValue({
        ...mockCommentWithUser,
        content: updateCommentDto.content,
        isEdited: true,
        editedAt: new Date(),
      });

      const result = await service.updateComment(
        commentId,
        userId,
        updateCommentDto,
      );

      expect(prisma.commentVersion.create).toHaveBeenCalledWith({
        data: {
          commentId: commentId,
          content: mockCommentWithUser.content,
          editedBy: userId,
        },
      });
      expect(prisma.comment.update).toHaveBeenCalledWith({
        where: { id: commentId },
        data: {
          content: updateCommentDto.content,
          isEdited: true,
          editedAt: expect.any(Date),
        },
        include: {
          user: {
            select: {
              username: true,
              avatarUrl: true,
              isVerified: true,
            },
          },
          _count: {
            select: {
              likes: true,
            },
          },
        },
      });
      expect(result.content).toBe(updateCommentDto.content);
    });

    it('should throw NotFoundException if comment does not exist', async () => {
      prisma.comment.findUnique.mockResolvedValue(null);

      await expect(
        service.updateComment(commentId, userId, updateCommentDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not the owner', async () => {
      prisma.comment.findUnique.mockResolvedValue({
        ...mockCommentWithUser,
        userId: 'different-user',
      });

      await expect(
        service.updateComment(commentId, userId, updateCommentDto),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.updateComment(commentId, userId, updateCommentDto),
      ).rejects.toThrow('You can only edit your own comments');
    });
  });

  describe('deleteComment', () => {
    const commentId = 'comment-1';
    const userId = 'user-1';

    it('should delete a comment successfully', async () => {
      prisma.comment.findUnique.mockResolvedValue(mockComment);
      prisma.comment.update.mockResolvedValue({
        ...mockComment,
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: userId,
      });
      prisma.comment.count.mockResolvedValue(0);

      const result = await service.deleteComment(commentId, userId);

      expect(prisma.comment.update).toHaveBeenCalledWith({
        where: { id: commentId },
        data: {
          isDeleted: true,
          deletedAt: expect.any(Date),
          deletedBy: userId,
        },
      });
      expect(prisma.comment.count).toHaveBeenCalledWith({
        where: {
          itemId: mockComment.itemId,
          parentId: null,
          isDeleted: false,
        },
      });
      expect(result).toEqual({ commentsCount: 0 });
    });

    it('should throw NotFoundException if comment does not exist', async () => {
      prisma.comment.findUnique.mockResolvedValue(null);

      await expect(service.deleteComment(commentId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user is not the owner', async () => {
      prisma.comment.findUnique.mockResolvedValue({
        ...mockComment,
        userId: 'different-user',
      });

      await expect(service.deleteComment(commentId, userId)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.deleteComment(commentId, userId)).rejects.toThrow(
        'You can only delete your own comments',
      );
    });

    it('should throw BadRequestException if comment already deleted', async () => {
      prisma.comment.findUnique.mockResolvedValue({
        ...mockComment,
        isDeleted: true,
      });

      await expect(service.deleteComment(commentId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getCommentsCount', () => {
    it('should return the count of comments for an item', async () => {
      const itemId = 'item-1';
      prisma.comment.count.mockResolvedValue(3);

      const result = await service.getCommentsCount(itemId);

      expect(prisma.comment.count).toHaveBeenCalledWith({
        where: {
          itemId,
          parentId: null,
          isDeleted: false,
        },
      });
      expect(result).toBe(3);
    });
  });

  describe('updateComment - Version History', () => {
    const commentId = 'comment-1';
    const userId = 'user-1';
    const updateDto = { content: 'Updated content' };

    const mockCommentVersion = {
      id: 'version-1',
      commentId: 'comment-1',
      content: 'Test comment',
      editedBy: 'user-1',
      createdAt: new Date('2025-01-01T12:00:00Z'),
    };

    beforeEach(() => {
      prisma.comment.findUnique.mockResolvedValue(mockComment);
      prisma.commentVersion.create.mockResolvedValue(mockCommentVersion);
      prisma.comment.update.mockResolvedValue({
        ...mockCommentWithUser,
        content: updateDto.content,
        isEdited: true,
        editedAt: new Date('2025-01-02'),
      });
    });

    it('should create a version history entry when updating a comment', async () => {
      await service.updateComment(commentId, userId, updateDto);

      expect(prisma.commentVersion.create).toHaveBeenCalledWith({
        data: {
          commentId,
          content: mockComment.content,
          editedBy: userId,
        },
      });

      expect(prisma.comment.update).toHaveBeenCalledWith({
        where: { id: commentId },
        data: {
          content: updateDto.content,
          isEdited: true,
          editedAt: expect.any(Date),
        },
        include: {
          user: {
            select: {
              username: true,
              avatarUrl: true,
              isVerified: true,
            },
          },
          _count: {
            select: {
              likes: true,
            },
          },
        },
      });
    });

    it('should create multiple version entries on multiple edits', async () => {
      await service.updateComment(commentId, userId, { content: 'First edit' });

      const editedComment = {
        ...mockComment,
        content: 'First edit',
        isEdited: true,
      };
      prisma.comment.findUnique.mockResolvedValue(editedComment);
      prisma.commentVersion.create.mockResolvedValue({
        ...mockCommentVersion,
        id: 'version-2',
        content: 'First edit',
      });

      await service.updateComment(commentId, userId, {
        content: 'Second edit',
      });

      expect(prisma.commentVersion.create).toHaveBeenCalledTimes(2);
      expect(prisma.commentVersion.create).toHaveBeenNthCalledWith(1, {
        data: {
          commentId,
          content: mockComment.content,
          editedBy: userId,
        },
      });
      expect(prisma.commentVersion.create).toHaveBeenNthCalledWith(2, {
        data: {
          commentId,
          content: 'First edit',
          editedBy: userId,
        },
      });
    });

    it('should not create version if comment does not exist', async () => {
      prisma.comment.findUnique.mockResolvedValue(null);

      await expect(
        service.updateComment(commentId, userId, updateDto),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.commentVersion.create).not.toHaveBeenCalled();
    });

    it('should not create version if user is not the owner', async () => {
      prisma.comment.findUnique.mockResolvedValue({
        ...mockComment,
        userId: 'different-user',
      });

      await expect(
        service.updateComment(commentId, userId, updateDto),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.commentVersion.create).not.toHaveBeenCalled();
    });

    it('should preserve original content in version, not updated content', async () => {
      const originalContent = 'This is the original';
      const updatedContent = 'This is the update';

      prisma.comment.findUnique.mockResolvedValue({
        ...mockComment,
        content: originalContent,
      });

      await service.updateComment(commentId, userId, {
        content: updatedContent,
      });

      const createCall = prisma.commentVersion.create.mock.calls[0][0];
      expect(createCall.data.content).toBe(originalContent);
      expect(createCall.data.content).not.toBe(updatedContent);
    });
  });

  describe('getCommentVersions - Version Retrieval', () => {
    const commentId = 'comment-1';

    it('should retrieve all versions for a comment', async () => {
      const mockVersions = [
        {
          id: 'version-3',
          commentId,
          content: 'Second edit',
          editedBy: 'user-1',
          createdAt: new Date('2025-01-03'),
        },
        {
          id: 'version-2',
          commentId,
          content: 'First edit',
          editedBy: 'user-1',
          createdAt: new Date('2025-01-02'),
        },
        {
          id: 'version-1',
          commentId,
          content: 'Original content',
          editedBy: 'user-1',
          createdAt: new Date('2025-01-01'),
        },
      ];

      prisma.commentVersion.findMany.mockResolvedValue(mockVersions);

      const result = await service.getCommentVersions(commentId);

      expect(prisma.commentVersion.findMany).toHaveBeenCalledWith({
        where: { commentId },
        orderBy: { createdAt: 'desc' },
      });

      expect(result).toHaveLength(3);
      expect(result[0].content).toBe('Second edit');
      expect(result[1].content).toBe('First edit');
      expect(result[2].content).toBe('Original content');
    });

    it('should return empty array if no versions exist', async () => {
      prisma.commentVersion.findMany.mockResolvedValue([]);

      const result = await service.getCommentVersions(commentId);

      expect(result).toEqual([]);
    });

    it('should return versions in descending order (newest first)', async () => {
      const mockVersions = [
        {
          id: 'version-3',
          commentId,
          content: 'Newest',
          editedBy: 'user-1',
          createdAt: new Date('2025-01-03'),
        },
        {
          id: 'version-2',
          commentId,
          content: 'Middle',
          editedBy: 'user-1',
          createdAt: new Date('2025-01-02'),
        },
        {
          id: 'version-1',
          commentId,
          content: 'Oldest',
          editedBy: 'user-1',
          createdAt: new Date('2025-01-01'),
        },
      ];

      prisma.commentVersion.findMany.mockResolvedValue(mockVersions);

      const result = await service.getCommentVersions(commentId);

      expect(result[0].content).toBe('Newest');
      expect(result[1].content).toBe('Middle');
      expect(result[2].content).toBe('Oldest');
    });

    it('should include all required fields in version DTOs', async () => {
      const mockVersions = [
        {
          id: 'version-1',
          commentId,
          content: 'Test content',
          editedBy: 'user-1',
          createdAt: new Date('2025-01-01'),
        },
      ];

      prisma.commentVersion.findMany.mockResolvedValue(mockVersions);

      const result = await service.getCommentVersions(commentId);

      expect(result[0]).toEqual({
        id: 'version-1',
        content: 'Test content',
        editedBy: 'user-1',
        createdAt: expect.any(Date),
      });
    });
  });

  describe('likeComment', () => {
    const userId = 'user-1';
    const commentId = 'comment-1';

    it('should like a comment successfully', async () => {
      prisma.comment.findUnique.mockResolvedValue(mockComment);
      prisma.commentLike.findUnique.mockResolvedValue(null);
      prisma.commentLike.create.mockResolvedValue({
        id: 'like-1',
        userId,
        commentId,
        createdAt: new Date(),
      });
      prisma.commentLike.count.mockResolvedValue(1);

      const result = await service.likeComment(userId, commentId);

      expect(result).toEqual({ count: 1, hasLiked: true });
      expect(prisma.commentLike.create).toHaveBeenCalledWith({
        data: { userId, commentId },
      });
    });

    it('should throw NotFoundException if comment does not exist', async () => {
      prisma.comment.findUnique.mockResolvedValue(null);

      await expect(service.likeComment(userId, commentId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if comment is deleted', async () => {
      prisma.comment.findUnique.mockResolvedValue({
        ...mockComment,
        isDeleted: true,
      });

      await expect(service.likeComment(userId, commentId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.likeComment(userId, commentId)).rejects.toThrow(
        'Cannot like a deleted comment',
      );
    });

    it('should throw BadRequestException if comment already liked', async () => {
      prisma.comment.findUnique.mockResolvedValue(mockComment);
      prisma.commentLike.findUnique.mockResolvedValue({
        id: 'like-1',
        userId,
        commentId,
        createdAt: new Date(),
      });

      await expect(service.likeComment(userId, commentId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.likeComment(userId, commentId)).rejects.toThrow(
        'Comment already liked',
      );
    });
  });

  describe('unlikeComment', () => {
    const userId = 'user-1';
    const commentId = 'comment-1';

    it('should unlike a comment successfully', async () => {
      prisma.commentLike.findUnique.mockResolvedValue({
        id: 'like-1',
        userId,
        commentId,
        createdAt: new Date(),
      });
      prisma.commentLike.delete.mockResolvedValue({
        id: 'like-1',
        userId,
        commentId,
        createdAt: new Date(),
      });
      prisma.commentLike.count.mockResolvedValue(0);

      const result = await service.unlikeComment(userId, commentId);

      expect(result).toEqual({ count: 0, hasLiked: false });
      expect(prisma.commentLike.delete).toHaveBeenCalledWith({
        where: {
          userId_commentId: { userId, commentId },
        },
      });
    });

    it('should throw NotFoundException if like does not exist', async () => {
      prisma.commentLike.findUnique.mockResolvedValue(null);

      await expect(service.unlikeComment(userId, commentId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.unlikeComment(userId, commentId)).rejects.toThrow(
        'Like not found',
      );
    });
  });

  describe('moderatorDeleteComment', () => {
    const commentId = 'comment-1';
    const moderatorId = 'mod-1';
    const reason = 'Inappropriate content';

    it('should delete comment with reason', async () => {
      prisma.comment.findUnique.mockResolvedValue(mockComment);
      prisma.comment.update.mockResolvedValue({
        ...mockComment,
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: moderatorId,
        deleteReason: reason,
      });

      await service.moderatorDeleteComment(commentId, moderatorId, reason);

      expect(prisma.comment.update).toHaveBeenCalledWith({
        where: { id: commentId },
        data: {
          isDeleted: true,
          deletedAt: expect.any(Date),
          deletedBy: moderatorId,
          deleteReason: reason,
        },
      });
    });

    it('should throw NotFoundException if comment does not exist', async () => {
      prisma.comment.findUnique.mockResolvedValue(null);

      await expect(
        service.moderatorDeleteComment(commentId, moderatorId, reason),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('hasLikedComment', () => {
    const userId = 'user-1';
    const commentId = 'comment-1';

    it('should return true if user has liked the comment', async () => {
      prisma.commentLike.findUnique.mockResolvedValue({
        id: 'like-1',
        userId,
        commentId,
        createdAt: new Date(),
      });

      const result = await service.hasLikedComment(userId, commentId);

      expect(result).toEqual({ hasLiked: true });
    });

    it('should return false if user has not liked the comment', async () => {
      prisma.commentLike.findUnique.mockResolvedValue(null);

      const result = await service.hasLikedComment(userId, commentId);

      expect(result).toEqual({ hasLiked: false });
    });
  });
});
