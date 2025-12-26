import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Admin JWT Authentication Guard
 *
 * Protects admin routes by requiring a valid admin JWT token.
 * Uses the 'admin-jwt' strategy which validates tokens against admin_users table.
 *
 * Usage:
 * ```typescript
 * @UseGuards(AdminJwtAuthGuard)
 * @Get('admin/dashboard')
 * getAdminDashboard(@Request() req) {
 *   // req.user contains admin user from admin_users table
 * }
 * ```
 */
@Injectable()
export class AdminJwtAuthGuard extends AuthGuard('admin-jwt') {}
