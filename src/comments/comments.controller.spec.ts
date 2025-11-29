import { CommentsController } from '@/comments/comments.controller';
import { CommentsService } from '@/comments/comments.service';
import { PrismaService } from '@/prisma/prisma.service';
import {
  mockComments,
  mockCommentWithUser,
} from '@/test/fixtures/comment.fixture';
import { mockCommentsService } from '@/test/mocks/comments.mock';
import { mockPrismaService } from '@/test/mocks/prisma.mock';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

describe('CommentsController', () => {
  let controller: CommentsController;
  let commentsService: CommentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommentsController],
      providers: [
        {
          provide: CommentsService,
          useValue: mockCommentsService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<CommentsController>(CommentsController);
    commentsService = module.get<CommentsService>(CommentsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createComment', () => {
    it('should create a comment successfully', async () => {
      const userId = 'user-123';
      const itemId = 'item-456';
      const createCommentDto: CreateCommentDto = {
        content: 'Great item!',
      };

      mockCommentsService.createComment.mockResolvedValue(mockCommentWithUser);

      const result = await controller.createComment(
        userId,
        itemId,
        createCommentDto,
      );

      expect(result).toEqual(mockCommentWithUser);
      expect(commentsService.createComment).toHaveBeenCalledWith(
        userId,
        itemId,
        createCommentDto,
      );
      expect(commentsService.createComment).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when item not found', async () => {
      const userId = 'user-123';
      const itemId = 'non-existent';
      const createCommentDto: CreateCommentDto = {
        content: 'Great item!',
      };

      mockCommentsService.createComment.mockRejectedValue(
        new NotFoundException('Item not found'),
      );

      await expect(
        controller.createComment(userId, itemId, createCommentDto),
      ).rejects.toThrow(NotFoundException);
      expect(commentsService.createComment).toHaveBeenCalledWith(
        userId,
        itemId,
        createCommentDto,
      );
    });
  });

  describe('getItemComments', () => {
    it('should return array of comments', async () => {
      const itemId = 'item-456';

      mockCommentsService.getItemComments.mockResolvedValue(mockComments);

      const result = await controller.getItemComments(itemId, undefined);

      expect(result).toEqual(mockComments);
      expect(commentsService.getItemComments).toHaveBeenCalledWith(
        itemId,
        undefined,
      );
      expect(commentsService.getItemComments).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no comments', async () => {
      const itemId = 'item-456';

      mockCommentsService.getItemComments.mockResolvedValue([]);

      const result = await controller.getItemComments(itemId, undefined);

      expect(result).toEqual([]);
      expect(commentsService.getItemComments).toHaveBeenCalledWith(
        itemId,
        undefined,
      );
    });
  });

  describe('updateComment', () => {
    it('should update a comment successfully', async () => {
      const userId = 'user-123';
      const commentId = 'comment-789';
      const updateCommentDto: UpdateCommentDto = {
        content: 'Updated comment text',
      };

      const updatedComment = {
        ...mockCommentWithUser,
        content: updateCommentDto.content,
      };

      mockCommentsService.updateComment.mockResolvedValue(updatedComment);

      const result = await controller.updateComment(
        userId,
        commentId,
        updateCommentDto,
      );

      expect(result).toEqual(updatedComment);
      expect(commentsService.updateComment).toHaveBeenCalledWith(
        commentId,
        userId,
        updateCommentDto,
      );
      expect(commentsService.updateComment).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when comment not found', async () => {
      const userId = 'user-123';
      const commentId = 'non-existent';
      const updateCommentDto: UpdateCommentDto = {
        content: 'Updated text',
      };

      mockCommentsService.updateComment.mockRejectedValue(
        new NotFoundException('Comment not found'),
      );

      await expect(
        controller.updateComment(userId, commentId, updateCommentDto),
      ).rejects.toThrow(NotFoundException);
      expect(commentsService.updateComment).toHaveBeenCalledWith(
        commentId,
        userId,
        updateCommentDto,
      );
    });

    it('should throw ForbiddenException when user is not the owner', async () => {
      const userId = 'wrong-user';
      const commentId = 'comment-789';
      const updateCommentDto: UpdateCommentDto = {
        content: 'Updated text',
      };

      mockCommentsService.updateComment.mockRejectedValue(
        new ForbiddenException('You can only update your own comments'),
      );

      await expect(
        controller.updateComment(userId, commentId, updateCommentDto),
      ).rejects.toThrow(ForbiddenException);
      expect(commentsService.updateComment).toHaveBeenCalledWith(
        commentId,
        userId,
        updateCommentDto,
      );
    });
  });

  describe('deleteComment', () => {
    it('should delete a comment successfully', async () => {
      const userId = 'user-123';
      const commentId = 'comment-789';

      mockCommentsService.deleteComment.mockResolvedValue(undefined);

      const result = await controller.deleteComment(userId, commentId);

      expect(result).toBeUndefined();
      expect(commentsService.deleteComment).toHaveBeenCalledWith(
        commentId,
        userId,
      );
      expect(commentsService.deleteComment).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when comment not found', async () => {
      const userId = 'user-123';
      const commentId = 'non-existent';

      mockCommentsService.deleteComment.mockRejectedValue(
        new NotFoundException('Comment not found'),
      );

      await expect(controller.deleteComment(userId, commentId)).rejects.toThrow(
        NotFoundException,
      );
      expect(commentsService.deleteComment).toHaveBeenCalledWith(
        commentId,
        userId,
      );
    });

    it('should throw ForbiddenException when user is not the owner', async () => {
      const userId = 'wrong-user';
      const commentId = 'comment-789';

      mockCommentsService.deleteComment.mockRejectedValue(
        new ForbiddenException('You can only delete your own comments'),
      );

      await expect(controller.deleteComment(userId, commentId)).rejects.toThrow(
        ForbiddenException,
      );
      expect(commentsService.deleteComment).toHaveBeenCalledWith(
        commentId,
        userId,
      );
    });
  });

  describe('getCommentsCount', () => {
    it('should return comments count', async () => {
      const itemId = 'item-456';
      const count = 15;

      mockCommentsService.getCommentsCount.mockResolvedValue(count);

      const result = await controller.getCommentsCount(itemId);

      expect(result).toEqual({ count });
      expect(commentsService.getCommentsCount).toHaveBeenCalledWith(itemId);
      expect(commentsService.getCommentsCount).toHaveBeenCalledTimes(1);
    });

    it('should return 0 when no comments', async () => {
      const itemId = 'item-456';

      mockCommentsService.getCommentsCount.mockResolvedValue(0);

      const result = await controller.getCommentsCount(itemId);

      expect(result).toEqual({ count: 0 });
      expect(commentsService.getCommentsCount).toHaveBeenCalledWith(itemId);
    });
  });

  describe('likeComment', () => {
    it('should like a comment successfully', async () => {
      const userId = 'user-123';
      const commentId = 'comment-789';

      mockCommentsService.likeComment.mockResolvedValue({
        count: 5,
        hasLiked: true,
      });

      const result = await controller.likeComment(userId, commentId);

      expect(result).toEqual({
        message: 'Comment liked successfully',
        likesCount: 5,
        hasLiked: true,
      });
      expect(commentsService.likeComment).toHaveBeenCalledWith(
        userId,
        commentId,
      );
    });

    it('should throw NotFoundException when comment not found', async () => {
      const userId = 'user-123';
      const commentId = 'non-existent';

      mockCommentsService.likeComment.mockRejectedValue(
        new NotFoundException('Comment not found'),
      );

      await expect(controller.likeComment(userId, commentId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('unlikeComment', () => {
    it('should unlike a comment successfully', async () => {
      const userId = 'user-123';
      const commentId = 'comment-789';

      mockCommentsService.unlikeComment.mockResolvedValue({
        count: 4,
        hasLiked: false,
      });

      const result = await controller.unlikeComment(userId, commentId);

      expect(result).toEqual({
        likesCount: 4,
        hasLiked: false,
      });
      expect(commentsService.unlikeComment).toHaveBeenCalledWith(
        userId,
        commentId,
      );
    });

    it('should throw NotFoundException when comment not found', async () => {
      const userId = 'user-123';
      const commentId = 'non-existent';

      mockCommentsService.unlikeComment.mockRejectedValue(
        new NotFoundException('Comment not found'),
      );

      await expect(controller.unlikeComment(userId, commentId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('hasLikedComment', () => {
    it('should return liked status for user', async () => {
      const userId = 'user-123';
      const commentId = 'comment-789';

      mockCommentsService.hasLikedComment.mockResolvedValue({
        hasLiked: true,
      });

      const result = await controller.hasLikedComment(userId, commentId);

      expect(result).toEqual({ hasLiked: true });
      expect(commentsService.hasLikedComment).toHaveBeenCalledWith(
        userId,
        commentId,
      );
    });

    it('should return false when user has not liked comment', async () => {
      const userId = 'user-123';
      const commentId = 'comment-789';

      mockCommentsService.hasLikedComment.mockResolvedValue({
        hasLiked: false,
      });

      const result = await controller.hasLikedComment(userId, commentId);

      expect(result).toEqual({ hasLiked: false });
    });
  });

  describe('getCommentVersions', () => {
    it('should return comment version history', async () => {
      const commentId = 'comment-789';
      const mockVersions = [
        {
          id: 'version-1',
          content: 'Original content',
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'version-2',
          content: 'Edited content',
          createdAt: new Date('2024-01-02'),
        },
      ];

      mockCommentsService.getCommentVersions.mockResolvedValue(mockVersions);

      const result = await controller.getCommentVersions(commentId);

      expect(result).toEqual(mockVersions);
      expect(commentsService.getCommentVersions).toHaveBeenCalledWith(
        commentId,
      );
    });

    it('should return empty array when no version history', async () => {
      const commentId = 'comment-789';

      mockCommentsService.getCommentVersions.mockResolvedValue([]);

      const result = await controller.getCommentVersions(commentId);

      expect(result).toEqual([]);
    });

    it('should throw NotFoundException when comment not found', async () => {
      const commentId = 'non-existent';

      mockCommentsService.getCommentVersions.mockRejectedValue(
        new NotFoundException('Comment not found'),
      );

      await expect(controller.getCommentVersions(commentId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
