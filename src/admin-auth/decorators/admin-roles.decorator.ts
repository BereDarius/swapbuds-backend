import { SetMetadata } from '@nestjs/common';
import { AdminRole } from '@prisma/client';

/**
 * Admin Roles Decorator
 *
 * Specifies which admin roles are allowed to access a route.
 * Must be used with AdminRoleGuard.
 *
 * @param roles - List of admin roles that can access the route
 *
 * Usage:
 * ```typescript
 * @UseGuards(AdminJwtAuthGuard, AdminRoleGuard)
 * @AdminRoles(AdminRole.ADMIN)
 * @Delete('users/:id/ban')
 * banUser(@Param('id') id: string) {
 *   // Only ADMIN role can ban users
 * }
 *
 * @AdminRoles(AdminRole.ADMIN, AdminRole.MODERATOR)
 * @Patch('items/:id/approve')
 * approveItem(@Param('id') id: string) {
 *   // ADMIN and MODERATOR can approve items
 * }
 * ```
 */
export const AdminRoles = (...roles: AdminRole[]) =>
  SetMetadata('adminRoles', roles);
