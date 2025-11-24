import { CurrentUser, Public } from '@/auth/decorators/auth.decorators';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { UserFilterDto } from './dto/user-filter.dto';
import { UserProfileDto } from './dto/user-profile.dto';
import { UserSettingsDto } from './dto/user-settings.dto';
import { UserStatisticsDto } from './dto/user-statistics.dto';
import { UsersService } from './users.service';

/**
 * Controller handling user profile operations
 * Provides endpoints for viewing and updating user profiles
 */
@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Get all users with optional filters (public)
   * @param filters - Filter and pagination parameters
   * @returns Paginated list of users
   */
  @Get()
  @Public()
  @ApiOperation({
    summary: 'Get all users with optional filtering and pagination',
  })
  @ApiQuery({ name: 'location', required: false, type: String })
  @ApiQuery({ name: 'minReputation', required: false, type: Number })
  @ApiQuery({ name: 'maxReputation', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['createdAt', 'reputationScore', 'username'],
  })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
  })
  async findAll(@Query() filters: UserFilterDto) {
    return this.usersService.findAllFiltered(filters);
  }

  /**
   * Get user profile by ID or username (public)
   * @param id - User ID or username
   * @returns Public user profile
   */
  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get user profile by ID or username' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    type: UserProfileDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserProfile(@Param('id') id: string): Promise<UserProfileDto> {
    return this.usersService.getUserProfile(id);
  }

  /**
   * Update current user's profile
   * @param userId - Current user ID from JWT
   * @param updateProfileDto - Profile data to update
   * @returns Updated user profile
   */
  @Patch('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    type: UserProfileDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<UserProfileDto> {
    return this.usersService.updateProfile(userId, updateProfileDto);
  }

  /**
   * Upload user avatar
   * @param userId - Current user ID from JWT
   * @param file - Avatar image file
   * @returns Updated user profile with new avatar
   */
  @Post('avatar')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload user avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Avatar uploaded successfully',
    type: UserProfileDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid file' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UserProfileDto> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type
    const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only JPEG, PNG, and WebP are allowed',
      );
    }

    // Validate file size (max 2MB for avatars)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size too large. Maximum size is 2MB');
    }

    return this.usersService.uploadAvatar(userId, file);
  }

  /**
   * Get trade statistics for a user (public)
   * @param userId - User ID
   * @returns Trade statistics
   */
  @Get(':id/statistics')
  @Public()
  @ApiOperation({
    summary: 'Get trade statistics for a specific user',
    description:
      'Retrieves comprehensive trade statistics including success rate, response time, and trade counts',
  })
  @ApiResponse({
    status: 200,
    description: 'Trade statistics retrieved successfully',
    type: UserStatisticsDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async getUserStatistics(
    @Param('id') userId: string,
  ): Promise<UserStatisticsDto> {
    return this.usersService.getUserStatistics(userId);
  }

  /**
   * Get current user's settings
   * @param userId - Current user ID from JWT
   * @returns User settings
   */
  @Get('me/settings')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user settings',
    description: 'Retrieves all settings for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Settings retrieved successfully',
    type: UserSettingsDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async getUserSettings(@CurrentUser('id') userId: string) {
    return this.usersService.getUserSettings(userId);
  }

  /**
   * Update current user's settings
   * @param userId - Current user ID from JWT
   * @param updateSettingsDto - Settings to update
   * @returns Updated settings
   */
  @Patch('me/settings')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update current user settings',
    description: 'Updates one or more settings for the authenticated user',
  })
  @ApiBody({ type: UpdateSettingsDto })
  @ApiResponse({
    status: 200,
    description: 'Settings updated successfully',
    type: UserSettingsDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async updateUserSettings(
    @CurrentUser('id') userId: string,
    @Body() updateSettingsDto: UpdateSettingsDto,
  ) {
    return this.usersService.updateUserSettings(userId, updateSettingsDto);
  }

  /**
   * Reset current user's settings to defaults
   * @param userId - Current user ID from JWT
   * @returns Reset settings
   */
  @Post('me/settings/reset')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Reset user settings to defaults',
    description: 'Resets all settings to their default values',
  })
  @ApiResponse({
    status: 200,
    description: 'Settings reset successfully',
    type: UserSettingsDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async resetUserSettings(@CurrentUser('id') userId: string) {
    return this.usersService.resetUserSettings(userId);
  }
}
