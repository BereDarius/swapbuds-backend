import { mockUserWithProfile } from '@/test/fixtures/user.fixture';
import { UsersController } from '@/users/users.controller';
import { UsersService } from '@/users/users.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UpdateProfileDto } from './dto/update-profile.dto';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: UsersService;

  const mockUsersService = {
    getUserProfile: jest.fn(),
    updateProfile: jest.fn(),
    uploadAvatar: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getUserProfile', () => {
    it('should return user profile', async () => {
      const userId = 'user-123';
      const profileData = {
        ...mockUserWithProfile,
        itemsCount: 5,
        tradesCount: 2,
      };

      mockUsersService.getUserProfile.mockResolvedValue(profileData);

      const result = await controller.getUserProfile(userId);

      expect(result).toEqual(profileData);
      expect(usersService.getUserProfile).toHaveBeenCalledWith(userId);
      expect(usersService.getUserProfile).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when user not found', async () => {
      const userId = 'non-existent';

      mockUsersService.getUserProfile.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(controller.getUserProfile(userId)).rejects.toThrow(
        NotFoundException,
      );
      expect(usersService.getUserProfile).toHaveBeenCalledWith(userId);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      const userId = 'user-123';
      const updateDto: UpdateProfileDto = {
        bio: 'Updated bio',
        location: 'New City',
      };

      const updatedProfile = {
        ...mockUserWithProfile,
        ...updateDto,
        itemsCount: 3,
        tradesCount: 1,
      };

      mockUsersService.updateProfile.mockResolvedValue(updatedProfile);

      const result = await controller.updateProfile(userId, updateDto);

      expect(result).toEqual(updatedProfile);
      expect(usersService.updateProfile).toHaveBeenCalledWith(
        userId,
        updateDto,
      );
      expect(usersService.updateProfile).toHaveBeenCalledTimes(1);
    });

    it('should update only bio', async () => {
      const userId = 'user-123';
      const updateDto: UpdateProfileDto = {
        bio: 'New bio only',
      };

      const updatedProfile = {
        ...mockUserWithProfile,
        bio: updateDto.bio,
        itemsCount: 3,
        tradesCount: 1,
      };

      mockUsersService.updateProfile.mockResolvedValue(updatedProfile);

      const result = await controller.updateProfile(userId, updateDto);

      expect(result).toEqual(updatedProfile);
      expect(usersService.updateProfile).toHaveBeenCalledWith(
        userId,
        updateDto,
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      const userId = 'non-existent';
      const updateDto: UpdateProfileDto = { bio: 'Test' };

      mockUsersService.updateProfile.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(controller.updateProfile(userId, updateDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(usersService.updateProfile).toHaveBeenCalledWith(
        userId,
        updateDto,
      );
    });
  });

  describe('uploadAvatar', () => {
    const createMockFile = (
      mimetype: string,
      size: number,
    ): Express.Multer.File => ({
      fieldname: 'file',
      originalname: 'avatar.jpg',
      encoding: '7bit',
      mimetype,
      size,
      buffer: Buffer.from('fake-image-data'),
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    });

    it('should upload avatar successfully', async () => {
      const userId = 'user-123';
      const file = createMockFile('image/jpeg', 1024 * 1024); // 1MB

      const updatedProfile = {
        ...mockUserWithProfile,
        avatarUrl: 'https://cloudinary.com/avatar.jpg',
        itemsCount: 3,
        tradesCount: 1,
      };

      mockUsersService.uploadAvatar.mockResolvedValue(updatedProfile);

      const result = await controller.uploadAvatar(userId, file);

      expect(result).toEqual(updatedProfile);
      expect(usersService.uploadAvatar).toHaveBeenCalledWith(userId, file);
      expect(usersService.uploadAvatar).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException when no file provided', async () => {
      const userId = 'user-123';

      await expect(
        controller.uploadAvatar(userId, undefined as any),
      ).rejects.toThrow(BadRequestException);

      expect(usersService.uploadAvatar).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid file type', async () => {
      const userId = 'user-123';
      const file = createMockFile('application/pdf', 1024 * 1024);

      await expect(controller.uploadAvatar(userId, file)).rejects.toThrow(
        new BadRequestException(
          'Invalid file type. Only JPEG, PNG, and WebP are allowed',
        ),
      );

      expect(usersService.uploadAvatar).not.toHaveBeenCalled();
    });

    it('should accept PNG files', async () => {
      const userId = 'user-123';
      const file = createMockFile('image/png', 1024 * 1024);

      const updatedProfile = {
        ...mockUserWithProfile,
        avatarUrl: 'https://cloudinary.com/avatar.png',
        itemsCount: 3,
        tradesCount: 1,
      };

      mockUsersService.uploadAvatar.mockResolvedValue(updatedProfile);

      const result = await controller.uploadAvatar(userId, file);

      expect(result).toEqual(updatedProfile);
      expect(usersService.uploadAvatar).toHaveBeenCalledWith(userId, file);
    });

    it('should accept WebP files', async () => {
      const userId = 'user-123';
      const file = createMockFile('image/webp', 1024 * 1024);

      const updatedProfile = {
        ...mockUserWithProfile,
        avatarUrl: 'https://cloudinary.com/avatar.webp',
        itemsCount: 3,
        tradesCount: 1,
      };

      mockUsersService.uploadAvatar.mockResolvedValue(updatedProfile);

      const result = await controller.uploadAvatar(userId, file);

      expect(result).toEqual(updatedProfile);
      expect(usersService.uploadAvatar).toHaveBeenCalledWith(userId, file);
    });

    it('should throw BadRequestException for file size too large', async () => {
      const userId = 'user-123';
      const file = createMockFile('image/jpeg', 3 * 1024 * 1024); // 3MB

      await expect(controller.uploadAvatar(userId, file)).rejects.toThrow(
        new BadRequestException('File size too large. Maximum size is 2MB'),
      );

      expect(usersService.uploadAvatar).not.toHaveBeenCalled();
    });

    it('should accept file at maximum size limit', async () => {
      const userId = 'user-123';
      const file = createMockFile('image/jpeg', 2 * 1024 * 1024); // exactly 2MB

      const updatedProfile = {
        ...mockUserWithProfile,
        avatarUrl: 'https://cloudinary.com/avatar.jpg',
        itemsCount: 3,
        tradesCount: 1,
      };

      mockUsersService.uploadAvatar.mockResolvedValue(updatedProfile);

      const result = await controller.uploadAvatar(userId, file);

      expect(result).toEqual(updatedProfile);
      expect(usersService.uploadAvatar).toHaveBeenCalledWith(userId, file);
    });
  });
});
