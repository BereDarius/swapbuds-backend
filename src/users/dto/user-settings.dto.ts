import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for user settings response
 */
export class UserSettingsDto {
  @ApiProperty({
    description: 'Settings ID',
    example: 'settings-abc123',
  })
  id: string;

  @ApiProperty({
    description: 'User ID',
    example: 'user-123',
  })
  userId: string;

  // Profile Settings
  @ApiProperty({
    description: 'Show email address on public profile',
    example: false,
  })
  displayEmail: boolean;

  @ApiProperty({
    description: 'Show location on public profile',
    example: true,
  })
  displayLocation: boolean;

  @ApiProperty({
    description: 'Allow other users to send messages',
    example: true,
  })
  allowMessages: boolean;

  // Privacy Settings
  @ApiProperty({
    description: 'Profile visibility level',
    enum: ['PUBLIC', 'FRIENDS_ONLY', 'PRIVATE'],
    example: 'PUBLIC',
  })
  profileVisibility: string;

  @ApiProperty({
    description: 'Show completed trades on profile',
    example: true,
  })
  showTradeHistory: boolean;

  @ApiProperty({
    description: 'Show reviews on profile',
    example: true,
  })
  showReviews: boolean;

  @ApiProperty({
    description: 'Show trade statistics on profile',
    example: true,
  })
  showStatistics: boolean;

  // Trade Settings
  @ApiProperty({
    description: 'Automatically decline trades when they expire',
    example: true,
  })
  autoDeclineExpiredTrades: boolean;

  @ApiProperty({
    description: 'Allow other users to send counter-offers',
    example: true,
  })
  allowCounterOffers: boolean;

  @ApiProperty({
    description: 'Require a message with trade proposals',
    example: false,
  })
  requireTradeMessage: boolean;

  // Notification Frequency
  @ApiProperty({
    description: 'Email notification digest frequency',
    enum: ['REALTIME', 'DAILY', 'WEEKLY', 'NEVER'],
    example: 'DAILY',
  })
  emailDigestFrequency: string;

  @ApiProperty({
    description: 'Push notification digest frequency',
    enum: ['REALTIME', 'HOURLY', 'DAILY', 'NEVER'],
    example: 'REALTIME',
  })
  pushDigestFrequency: string;

  // UI Preferences
  @ApiProperty({
    description: 'Theme preference',
    enum: ['LIGHT', 'DARK', 'AUTO'],
    example: 'AUTO',
  })
  theme: string;

  @ApiProperty({
    description: 'Preferred language',
    enum: ['EN', 'ES', 'FR', 'DE', 'PT'],
    example: 'EN',
  })
  language: string;

  @ApiProperty({
    description: 'Number of items to display per page',
    example: 12,
  })
  itemsPerPage: number;

  @ApiProperty({
    description: 'Default sorting preference',
    enum: ['RECENT', 'POPULAR', 'PRICE_LOW', 'PRICE_HIGH'],
    example: 'RECENT',
  })
  defaultSortBy: string;

  @ApiProperty({
    description: 'Use compact list view instead of card view',
    example: false,
  })
  compactView: boolean;

  // Search & Discovery
  @ApiProperty({
    description: 'Save search history for quick access',
    example: true,
  })
  saveSearchHistory: boolean;

  @ApiProperty({
    description: 'Show similar items recommendations',
    example: true,
  })
  showSimilarItems: boolean;

  @ApiProperty({
    description: 'Enable personalized recommendations',
    example: true,
  })
  enableRecommendations: boolean;

  // Accessibility
  @ApiProperty({
    description: 'Enable high contrast mode',
    example: false,
  })
  highContrast: boolean;

  @ApiProperty({
    description: 'Use larger text sizes',
    example: false,
  })
  largeText: boolean;

  @ApiProperty({
    description: 'Reduce animations and motion',
    example: false,
  })
  reduceMotion: boolean;

  @ApiProperty({
    description: 'Optimize for screen readers',
    example: false,
  })
  screenReaderMode: boolean;

  // Marketing & Communication
  @ApiProperty({
    description: 'Receive marketing and promotional emails',
    example: false,
  })
  marketingEmails: boolean;

  @ApiProperty({
    description: 'Receive product updates and announcements',
    example: true,
  })
  productUpdates: boolean;

  @ApiProperty({
    description: 'Receive community newsletter',
    example: false,
  })
  communityNewsletter: boolean;

  // Advanced
  @ApiProperty({
    description: 'Enable two-factor authentication',
    example: false,
  })
  twoFactorEnabled: boolean;

  @ApiProperty({
    description: 'Session timeout in minutes',
    example: 30,
  })
  sessionTimeout: number;

  @ApiProperty({
    description: 'When settings were created',
    example: '2024-11-22T16:04:54Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'When settings were last updated',
    example: '2024-11-22T16:04:54Z',
  })
  updatedAt: Date;
}
