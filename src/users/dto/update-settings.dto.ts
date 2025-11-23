import { ApiProperty } from '@nestjs/swagger';
import { DeliveryMethod } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

/**
 * DTO for updating user settings
 * All fields are optional - only provided fields will be updated
 */
export class UpdateSettingsDto {
  // Profile Settings
  @ApiProperty({
    description: 'Show email address on public profile',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  displayEmail?: boolean;

  @ApiProperty({
    description: 'Show location on public profile',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  displayLocation?: boolean;

  @ApiProperty({
    description: 'Allow other users to send messages',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  allowMessages?: boolean;

  // Privacy Settings
  @ApiProperty({
    description: 'Profile visibility level',
    enum: ['PUBLIC', 'FRIENDS_ONLY', 'PRIVATE'],
    example: 'PUBLIC',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsEnum(['PUBLIC', 'FRIENDS_ONLY', 'PRIVATE'])
  profileVisibility?: string;

  @ApiProperty({
    description: 'Show completed trades on profile',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  showTradeHistory?: boolean;

  @ApiProperty({
    description: 'Show reviews on profile',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  showReviews?: boolean;

  @ApiProperty({
    description: 'Show trade statistics on profile',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  showStatistics?: boolean;

  // Trade Settings
  @ApiProperty({
    description: 'Automatically decline trades when they expire',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  autoDeclineExpiredTrades?: boolean;

  @ApiProperty({
    description: 'Allow other users to send counter-offers',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  allowCounterOffers?: boolean;

  @ApiProperty({
    description: 'Require a message with trade proposals',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  requireTradeMessage?: boolean;

  @ApiProperty({
    description: 'Preferred delivery method for trades',
    enum: DeliveryMethod,
    example: DeliveryMethod.PHYSICAL,
    required: false,
  })
  @IsOptional()
  @IsEnum(DeliveryMethod)
  preferredDeliveryMethod?: DeliveryMethod;

  // Notification Frequency
  @ApiProperty({
    description: 'Email notification digest frequency',
    enum: ['REALTIME', 'DAILY', 'WEEKLY', 'NEVER'],
    example: 'DAILY',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsEnum(['REALTIME', 'DAILY', 'WEEKLY', 'NEVER'])
  emailDigestFrequency?: string;

  @ApiProperty({
    description: 'Push notification digest frequency',
    enum: ['REALTIME', 'HOURLY', 'DAILY', 'NEVER'],
    example: 'REALTIME',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsEnum(['REALTIME', 'HOURLY', 'DAILY', 'NEVER'])
  pushDigestFrequency?: string;

  // UI Preferences
  @ApiProperty({
    description: 'Theme preference',
    enum: ['LIGHT', 'DARK', 'AUTO'],
    example: 'AUTO',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsEnum(['LIGHT', 'DARK', 'AUTO'])
  theme?: string;

  @ApiProperty({
    description: 'Preferred language',
    enum: ['EN', 'ES', 'FR', 'DE', 'PT'],
    example: 'EN',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsEnum(['EN', 'ES', 'FR', 'DE', 'PT'])
  language?: string;

  @ApiProperty({
    description: 'Number of items to display per page',
    example: 12,
    minimum: 6,
    maximum: 48,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(6)
  @Max(48)
  itemsPerPage?: number;

  @ApiProperty({
    description: 'Default sorting preference',
    enum: ['RECENT', 'POPULAR', 'PRICE_LOW', 'PRICE_HIGH'],
    example: 'RECENT',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsEnum(['RECENT', 'POPULAR', 'PRICE_LOW', 'PRICE_HIGH'])
  defaultSortBy?: string;

  @ApiProperty({
    description: 'Use compact list view instead of card view',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  compactView?: boolean;

  // Search & Discovery
  @ApiProperty({
    description: 'Save search history for quick access',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  saveSearchHistory?: boolean;

  @ApiProperty({
    description: 'Show similar items recommendations',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  showSimilarItems?: boolean;

  @ApiProperty({
    description: 'Enable personalized recommendations',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  enableRecommendations?: boolean;

  // Accessibility
  @ApiProperty({
    description: 'Enable high contrast mode',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  highContrast?: boolean;

  @ApiProperty({
    description: 'Use larger text sizes',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  largeText?: boolean;

  @ApiProperty({
    description: 'Reduce animations and motion',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  reduceMotion?: boolean;

  @ApiProperty({
    description: 'Optimize for screen readers',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  screenReaderMode?: boolean;

  // Marketing & Communication
  @ApiProperty({
    description: 'Receive marketing and promotional emails',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  marketingEmails?: boolean;

  @ApiProperty({
    description: 'Receive product updates and announcements',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  productUpdates?: boolean;

  @ApiProperty({
    description: 'Receive community newsletter',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  communityNewsletter?: boolean;

  // Advanced
  @ApiProperty({
    description: 'Enable two-factor authentication',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  twoFactorEnabled?: boolean;

  @ApiProperty({
    description: 'Session timeout in minutes',
    example: 30,
    minimum: 5,
    maximum: 1440,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(1440)
  sessionTimeout?: number;
}
