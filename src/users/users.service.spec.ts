import { CacheService } from '@/cache/cache.service';
import { PrismaService } from '@/prisma/prisma.service';
import { mockUser, mockUserWithProfile } from '@/test/fixtures/user.fixture';
import { mockPrismaService } from '@/test/mocks/prisma.mock';
import { mockUploadService } from '@/test/mocks/upload.mock';
import { UploadService } from '@/upload/upload.service';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';

const mockCacheService = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn(),
  del: jest.fn(),
  getUserKey: jest.fn((userId) => `users:${userId}`),
};

describe('UsersService', () => {
  let service: UsersService;
  let prisma: typeof mockPrismaService;
  let uploadService: typeof mockUploadService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: UploadService,
          useValue: mockUploadService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = mockPrismaService;
    uploadService = mockUploadService;

    jest.clearAllMocks();
  });

  describe('getUserProfile', () => {
    const userId = 'user-1';

    it('should return user profile with stats', async () => {
      const userWithCounts = {
        ...mockUserWithProfile,
        _count: {
          items: 5,
          tradesProposed: 3,
        },
      };

      prisma.user.findUnique.mockResolvedValue(userWithCounts);

      const result = await service.getUserProfile(userId);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        include: {
          _count: {
            select: {
              items: true,
              tradesProposed: {
                where: { status: 'COMPLETED' },
              },
            },
          },
        },
      });
      expect(result.id).toBe(userId);
      expect(result.username).toBe(mockUserWithProfile.username);
      expect(result.itemsCount).toBe(5);
      expect(result.tradesCount).toBe(3);
    });

    it('should throw NotFoundException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserProfile(userId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getUserProfile(userId)).rejects.toThrow(
        `User with ID ${userId} not found`,
      );
    });
  });

  describe('updateProfile', () => {
    const userId = 'user-1';
    const updateProfileDto = {
      bio: 'Updated bio',
      location: 'Updated location',
    };

    it('should update user profile successfully', async () => {
      const userWithCounts = {
        ...mockUserWithProfile,
        ...updateProfileDto,
        _count: {
          items: 5,
          tradesProposed: 3,
        },
      };

      prisma.user.findUnique.mockResolvedValueOnce(mockUser);
      prisma.user.update.mockResolvedValue(userWithCounts);
      prisma.user.findUnique.mockResolvedValueOnce(userWithCounts);

      const result = await service.updateProfile(userId, updateProfileDto);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: updateProfileDto,
      });
      expect(result.bio).toBe(updateProfileDto.bio);
      expect(result.location).toBe(updateProfileDto.location);
    });
  });

  describe('uploadAvatar', () => {
    const userId = 'user-1';
    const mockFile = {
      buffer: Buffer.from('test'),
      originalname: 'avatar.jpg',
      mimetype: 'image/jpeg',
    } as Express.Multer.File;

    it('should upload avatar successfully without deleting old avatar', async () => {
      const uploadResult = {
        secure_url: 'https://cloudinary.com/new-avatar.jpg',
        public_id: 'avatars/new-avatar',
      };
      const userWithCounts = {
        ...mockUser,
        avatarUrl: uploadResult.secure_url,
        _count: { items: 0, tradesProposed: 0 },
      };

      prisma.user.findUnique.mockResolvedValueOnce(mockUser);
      uploadService.uploadImage.mockResolvedValue(uploadResult);
      prisma.user.update.mockResolvedValue(userWithCounts);
      prisma.user.findUnique.mockResolvedValueOnce(userWithCounts);

      const result = await service.uploadAvatar(userId, mockFile);

      expect(uploadService.uploadImage).toHaveBeenCalledWith(
        mockFile,
        'swapbuds/avatars',
      );
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { avatarUrl: uploadResult.secure_url },
      });
      expect(result.avatarUrl).toBe(uploadResult.secure_url);
    });

    it('should delete old avatar before uploading new one', async () => {
      const oldAvatarUrl =
        'https://res.cloudinary.com/test/image/upload/v123/avatars/old-avatar.jpg';
      const uploadResult = {
        secure_url: 'https://cloudinary.com/new-avatar.jpg',
        public_id: 'avatars/new-avatar',
      };
      const userWithCounts = {
        ...mockUser,
        avatarUrl: uploadResult.secure_url,
        _count: { items: 0, tradesProposed: 0 },
      };

      prisma.user.findUnique.mockResolvedValueOnce({
        ...mockUser,
        avatarUrl: oldAvatarUrl,
      });
      uploadService.uploadImage.mockResolvedValue(uploadResult);
      uploadService.deleteImage.mockResolvedValue({ result: 'ok' });
      prisma.user.update.mockResolvedValue(userWithCounts);
      prisma.user.findUnique.mockResolvedValueOnce(userWithCounts);

      const result = await service.uploadAvatar(userId, mockFile);

      expect(uploadService.deleteImage).toHaveBeenCalledWith('old-avatar');
      expect(result.avatarUrl).toBe(uploadResult.secure_url);
    });

    it('should throw NotFoundException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.uploadAvatar(userId, mockFile)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
