import { PrismaService } from '@/prisma/prisma.service';
import {
  mockComment,
  mockCommentWithUser,
} from '@/test/fixtures/comment.fixture';
import { mockItem } from '@/test/fixtures/item.fixture';
import { mockPrismaService } from '@/test/mocks/prisma.mock';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
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
        },
        include: {
          user: {
            select: {
              username: true,
              avatarUrl: true,
            },
          },
        },
      });
      expect(result.content).toBe(createCommentDto.content);
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
  });

  describe('getItemComments', () => {
    it('should return all comments for an item', async () => {
      const itemId = 'item-1';
      prisma.comment.findMany.mockResolvedValue([mockCommentWithUser]);

      const result = await service.getItemComments(itemId);

      expect(prisma.comment.findMany).toHaveBeenCalledWith({
        where: { itemId },
        include: {
          user: {
            select: {
              username: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].content).toBe(mockCommentWithUser.content);
    });
  });

  describe('updateComment', () => {
    const commentId = 'comment-1';
    const userId = 'user-1';
    const updateCommentDto = { content: 'Updated comment' };

    it('should update a comment successfully', async () => {
      prisma.comment.findUnique.mockResolvedValue(mockCommentWithUser);
      prisma.comment.update.mockResolvedValue({
        ...mockCommentWithUser,
        content: updateCommentDto.content,
      });

      const result = await service.updateComment(
        commentId,
        userId,
        updateCommentDto,
      );

      expect(prisma.comment.update).toHaveBeenCalledWith({
        where: { id: commentId },
        data: { content: updateCommentDto.content },
        include: {
          user: {
            select: {
              username: true,
              avatarUrl: true,
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
      prisma.comment.delete.mockResolvedValue(mockComment);

      await service.deleteComment(commentId, userId);

      expect(prisma.comment.delete).toHaveBeenCalledWith({
        where: { id: commentId },
      });
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
  });

  describe('getCommentsCount', () => {
    it('should return the count of comments for an item', async () => {
      const itemId = 'item-1';
      prisma.comment.count.mockResolvedValue(3);

      const result = await service.getCommentsCount(itemId);

      expect(prisma.comment.count).toHaveBeenCalledWith({
        where: { itemId },
      });
      expect(result).toBe(3);
    });
  });
});
