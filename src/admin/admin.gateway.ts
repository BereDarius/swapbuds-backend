import { WsJwtGuard } from '@/auth/guards/ws-jwt.guard';
import { Logger, UseGuards } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

/**
 * WebSocket Gateway for admin-specific real-time events
 * Handles admin notifications, ticket updates, pending approvals, etc.
 * Namespace: /admin - Admin-only events (requires ADMIN/MODERATOR/SUPPORT role)
 */
@WebSocketGateway({
  namespace: '/admin',
  cors: {
    origin: (
      process.env.CORS_ORIGINS ||
      'http://localhost:3000,http://localhost:5173,http://localhost:4200'
    ).split(','),
    credentials: true,
  },
})
export class AdminGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AdminGateway.name);
  private adminSockets = new Map<string, Set<string>>(); // adminUserId -> Set of socketIds

  /**
   * Handle new admin client connections
   * Validates JWT and stores socket connection
   */
  @UseGuards(WsJwtGuard)
  async handleConnection(client: Socket) {
    try {
      const adminUserId = client.data.adminUserId;

      if (!adminUserId) {
        this.logger.warn(
          `Connection rejected: No adminUserId in socket data - ${client.id}`,
        );
        client.disconnect();
        return;
      }

      // Store socket connection
      if (!this.adminSockets.has(adminUserId)) {
        this.adminSockets.set(adminUserId, new Set());
      }
      this.adminSockets.get(adminUserId)?.add(client.id);

      this.logger.log(
        `Admin connected: ${adminUserId} (socket: ${client.id}, total sockets: ${this.adminSockets.get(adminUserId)?.size})`,
      );
    } catch (error) {
      this.logger.error(
        `Connection error for socket ${client.id}: ${error.message}`,
      );
      client.disconnect();
    }
  }

  /**
   * Handle admin client disconnections
   * Cleans up socket tracking
   */
  handleDisconnect(client: Socket) {
    const adminUserId = client.data.adminUserId;

    if (adminUserId) {
      const sockets = this.adminSockets.get(adminUserId);
      sockets?.delete(client.id);

      if (sockets?.size === 0) {
        this.adminSockets.delete(adminUserId);
      }

      this.logger.log(
        `Admin disconnected: ${adminUserId} (socket: ${client.id}, remaining: ${sockets?.size || 0})`,
      );
    } else {
      this.logger.log(`Unknown client disconnected: ${client.id}`);
    }
  }

  /**
   * Subscribe admin to their personal room
   * Receives admin-specific notifications (ticket assignments, approvals, etc.)
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('subscribe')
  handleSubscribe(client: Socket, payload: { adminUserId: string }) {
    const authenticatedAdminUserId = client.data.adminUserId;

    // Ensure admin can only subscribe to their own events
    if (payload.adminUserId !== authenticatedAdminUserId) {
      this.logger.warn(
        `Admin ${authenticatedAdminUserId} attempted to subscribe to ${payload.adminUserId}'s events`,
      );
      return {
        event: 'error',
        data: { message: 'Cannot subscribe to another admin user' },
      };
    }

    const room = `admin:${payload.adminUserId}`;
    client.join(room);

    this.logger.log(
      `Admin ${payload.adminUserId} subscribed to personal room: ${room}`,
    );

    return { event: 'subscribed', data: { room } };
  }

  /**
   * Emit event to specific admin user (all their connected devices)
   * @param adminUserId - Target admin user ID
   * @param event - Event name
   * @param data - Event payload
   */
  emitToAdmin(adminUserId: string, event: string, data: any) {
    const room = `admin:${adminUserId}`;
    this.server.to(room).emit(event, data);

    this.logger.debug(
      `Emitted ${event} to admin ${adminUserId} (room: ${room})`,
    );
  }

  /**
   * Emit event to multiple admin users
   * @param adminUserIds - Array of admin user IDs
   * @param event - Event name
   * @param data - Event payload
   */
  emitToAdmins(adminUserIds: string[], event: string, data: any) {
    adminUserIds.forEach((adminUserId) => {
      this.emitToAdmin(adminUserId, event, data);
    });

    this.logger.debug(
      `Emitted ${event} to ${adminUserIds.length} admins: ${adminUserIds.join(', ')}`,
    );
  }

  /**
   * Broadcast event to all connected admins
   * Used for system-wide notifications (new tickets, pending approvals, etc.)
   * @param event - Event name
   * @param data - Event payload
   */
  broadcastToAllAdmins(event: string, data: any) {
    this.server.emit(event, data);

    this.logger.debug(
      `Broadcasted ${event} to all admins (${this.adminSockets.size} connected)`,
    );
  }

  /**
   * Get count of connected admin users
   */
  getConnectedAdminCount(): number {
    return this.adminSockets.size;
  }

  /**
   * Check if admin user is currently connected
   */
  isAdminConnected(adminUserId: string): boolean {
    return (
      this.adminSockets.has(adminUserId) &&
      (this.adminSockets.get(adminUserId)?.size ?? 0) > 0
    );
  }
}
