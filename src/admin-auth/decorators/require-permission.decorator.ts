import { SetMetadata } from '@nestjs/common';

/**
 * Key used to store required permissions in route metadata
 */
export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to require specific permissions for an admin endpoint
 * Can be used at controller or method level
 *
 * @param permissions - Array of permission names required (e.g., ['tickets:view', 'tickets:assign'])
 *
 * @example
 * ```typescript
 * @RequirePermission('tickets:view')
 * @Get('tickets')
 * async getTickets() { ... }
 *
 * @RequirePermission('tickets:assign', 'tickets:update')
 * @Patch('tickets/:id/assign')
 * async assignTicket() { ... }
 * ```
 */
export const RequirePermission = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
