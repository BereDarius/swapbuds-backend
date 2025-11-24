import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';

/**
 * Authentication Decorators
 *
 * Provides convenient decorators for authentication and authorization.
 */

/** Metadata key for identifying public routes */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * @Public() Decorator
 *
 * Marks a route as publicly accessible (no authentication required).
 * Works with JwtAuthGuard to bypass JWT validation.
 *
 * @example
 * ```typescript
 * @Public()
 * @Get('public-data')
 * getPublicData() {
 *   return 'This route does not require authentication';
 * }
 * ```
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * @CurrentUser() Parameter Decorator
 *
 * Extracts the authenticated user (or a specific property) from the request object.
 * The user is attached to the request by the JWT strategy after validation.
 *
 * @param data - Optional property name to extract (e.g., 'id', 'email')
 *
 * @example
 * ```typescript
 * @Get('profile')
 * getProfile(@CurrentUser() user: User) {
 *   return user; // Returns the full authenticated user object
 * }
 *
 * @Post('item')
 * createItem(@CurrentUser('id') userId: string) {
 *   // Returns just the user ID string
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user; // User object added by JWT strategy

    // If a specific property is requested, return that property
    return data ? user?.[data] : user;
  },
);
