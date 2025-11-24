import { OAuthProvider } from '@prisma/client';

export const mockOAuthAccount = {
  id: 'oauth-123',
  userId: 'user-123',
  provider: OAuthProvider.GOOGLE,
  providerId: 'google-user-123',
  email: 'oauth@example.com',
  name: 'OAuth User',
  picture: 'https://example.com/avatar.jpg',
  accessToken: 'encrypted-access-token',
  refreshToken: 'encrypted-refresh-token',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

export const mockOAuthCallbackData = {
  provider: OAuthProvider.GOOGLE,
  providerId: 'google-user-123',
  email: 'oauth@example.com',
  name: 'OAuth User',
  picture: 'https://example.com/avatar.jpg',
  accessToken: 'google-access-token',
  refreshToken: 'google-refresh-token',
};

export const mockFacebookOAuthCallbackData = {
  provider: OAuthProvider.FACEBOOK,
  providerId: 'facebook-user-456',
  email: 'facebook@example.com',
  name: 'Facebook User',
  picture: 'https://facebook.com/avatar.jpg',
  accessToken: 'facebook-access-token',
  refreshToken: 'facebook-refresh-token',
};

export const mockAppleOAuthCallbackData = {
  provider: OAuthProvider.APPLE,
  providerId: 'apple-user-789',
  email: 'apple@example.com',
  name: 'Apple User',
  picture: 'https://apple.com/avatar.jpg',
  accessToken: 'apple-access-token',
  refreshToken: 'apple-refresh-token',
};
