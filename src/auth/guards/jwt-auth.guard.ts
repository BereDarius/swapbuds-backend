import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

/**
 * JWT Authentication Guard
 *
 * Protects routes by requiring valid JWT authentication.
 * Extends Passport's AuthGuard to add support for public routes.
 *
 * Usage:
 * - Apply globally or to specific routes/controllers
 * - Use @Public() decorator to bypass authentication on specific routes
 *
 * @example
 * ```typescript
 * @UseGuards(JwtAuthGuard)
 * @Get('protected')
 * getProtectedData() { ... }
 *
 * @Public()
 * @Get('public')
 * getPublicData() { ... }
 * ```
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  /**
   * Determine if route can be accessed
   *
   * Checks if route is marked as public using @Public() decorator.
   * If public, allows access without authentication.
   * Otherwise, validates JWT token using parent AuthGuard.
   *
   * @param context - Execution context containing request info
   * @returns true if access allowed, false otherwise
   */
  canActivate(context: ExecutionContext) {
    // Check if route has @Public() decorator
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(), // Check method decorator
      context.getClass(), // Check class decorator
    ]);

    // Allow access to public routes without authentication
    if (isPublic) {
      return true;
    }

    // For protected routes, validate JWT token
    return super.canActivate(context);
  }
}
