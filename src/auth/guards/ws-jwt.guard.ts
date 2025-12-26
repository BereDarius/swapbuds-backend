import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

/**
 * WebSocket JWT authentication guard
 * Validates JWT token from socket handshake
 * Supports both user and admin user tokens based on namespace
 */
@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient();
      const token = this.extractTokenFromHandshake(client);

      if (!token) {
        throw new WsException('Unauthorized: No token provided');
      }

      // Determine expected token type based on namespace
      const namespace = client.nsp.name;
      const isAdminNamespace =
        namespace === '/admin' || namespace.startsWith('/admin/');
      const isUserNamespace =
        namespace === '/user' ||
        namespace.startsWith('/user/') ||
        namespace === '/';

      // Verify token with appropriate secret
      const secret = isAdminNamespace
        ? process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET
        : process.env.JWT_SECRET;

      const payload = await this.jwtService.verifyAsync(token, { secret });

      // Attach payload to socket data for later use
      client.data.user = payload;

      // Set appropriate ID field based on namespace
      if (isAdminNamespace) {
        // Admin namespace: payload.role should exist
        if (!payload.role) {
          throw new WsException(
            'Unauthorized: Admin token required for this namespace',
          );
        }
        client.data.adminUserId = payload.sub;
        client.data.role = payload.role;
      } else if (isUserNamespace) {
        // User namespace: regular user token
        client.data.userId = payload.sub;
      }

      return true;
    } catch (error) {
      if (error instanceof WsException) {
        throw error;
      }
      throw new WsException('Unauthorized: Invalid token');
    }
  }

  /**
   * Extract JWT token from socket handshake
   * Supports both Authorization header and query parameter
   */
  private extractTokenFromHandshake(client: Socket): string | null {
    // Try to get token from Authorization header
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Try to get token from query parameter
    const token = client.handshake.auth?.token || client.handshake.query?.token;
    if (token && typeof token === 'string') {
      return token;
    }

    return null;
  }
}
