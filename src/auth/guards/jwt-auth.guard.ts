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
   * If public, validates JWT if present but allows access without it.
   * Otherwise, requires valid JWT token using parent AuthGuard.
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

    // For public routes, try to validate JWT if present, but don't require it
    if (isPublic) {
      return this.handlePublicRoute(context);
    }

    // For protected routes, require valid JWT token
    return super.canActivate(context);
  }

  /**
   * Handle public routes with optional authentication
   *
   * Attempts to validate JWT if present in the request.
   * If validation fails or no token present, allows access anyway.
   * This populates request.user for authenticated users on public routes.
   */
  private async handlePublicRoute(context: ExecutionContext): Promise<boolean> {
    try {
      await super.canActivate(context);
    } catch (error) {
      // JWT validation failed or no token present - that's okay for public routes
    }
    return true;
  }
}
