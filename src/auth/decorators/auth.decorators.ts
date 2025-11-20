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
 * Extracts the authenticated user from the request object.
 * The user is attached to the request by the JWT strategy after validation.
 *
 * @example
 * ```typescript
 * @Get('profile')
 * getProfile(@CurrentUser() user: User) {
 *   return user; // Returns the authenticated user object
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user; // User object added by JWT strategy
  },
);
