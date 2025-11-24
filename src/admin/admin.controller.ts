import { CurrentUser } from '@/auth/decorators/auth.decorators';
import { AdminGuard } from '@/auth/guards/admin.guard';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuditAction } from '@prisma/client';
import { AdminService } from './admin.service';
import { AuditLogService } from './audit-log.service';
import {
  BanUserDto,
  BulkBanUsersDto,
  BulkChangeRoleDto,
  BulkUnbanUsersDto,
  ChangeUserRoleDto,
  GetUsersQueryDto,
  UnbanUserDto,
} from './dto/admin.dto';

/**
 * Admin controller
 * Handles admin operations: statistics, user management, audit logs
 */
@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Get platform statistics
   */
  @Get('stats')
  @ApiOperation({
    summary: '[Admin] Get platform statistics',
    description: 'Get comprehensive platform statistics for admin dashboard',
  })
  @ApiResponse({ status: 200, description: 'Statistics retrieved' })
  async getPlatformStats() {
    return this.adminService.getPlatformStats();
  }

  /**
   * Get all users with filtering
   */
  @Get('users')
  @ApiOperation({
    summary: '[Admin] Get all users',
    description: 'Get paginated list of users with optional filtering',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: ['USER', 'MODERATOR', 'SUPPORT', 'ADMIN'],
  })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Users retrieved' })
  async getUsers(@Query() query: GetUsersQueryDto) {
    return this.adminService.getUsers({
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
      search: query.search,
      role: query.role,
      isActive:
        query.isActive !== undefined ? query.isActive === true : undefined,
    });
  }

  /**
   * Get user details
   */
  @Get('users/:id')
  @ApiOperation({
    summary: '[Admin] Get user details',
    description: 'Get detailed information about a specific user',
  })
  @ApiResponse({ status: 200, description: 'User details retrieved' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserDetails(@Param('id') userId: string) {
    return this.adminService.getUserDetails(userId);
  }

  /**
   * Ban a user
   */
  @Patch('users/:id/ban')
  @ApiOperation({
    summary: '[Admin] Ban user',
    description: 'Ban a user from the platform',
  })
  @ApiResponse({ status: 200, description: 'User banned successfully' })
  @ApiResponse({ status: 400, description: 'Cannot ban admin users' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async banUser(
    @Param('id') userId: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: BanUserDto,
  ) {
    return this.adminService.banUser(userId, adminId, dto.reason);
  }

  /**
   * Unban a user
   */
  @Patch('users/:id/unban')
  @ApiOperation({
    summary: '[Admin] Unban user',
    description: 'Unban a previously banned user',
  })
  @ApiResponse({ status: 200, description: 'User unbanned successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async unbanUser(
    @Param('id') userId: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: UnbanUserDto,
  ) {
    return this.adminService.unbanUser(userId, adminId, dto.reason);
  }

  /**
   * Change user role
   */
  @Patch('users/:id/role')
  @ApiOperation({
    summary: '[Admin] Change user role',
    description: "Change a user's role (USER, MODERATOR, SUPPORT, ADMIN)",
  })
  @ApiResponse({ status: 200, description: 'User role updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async changeUserRole(
    @Param('id') userId: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: ChangeUserRoleDto,
  ) {
    return this.adminService.changeUserRole(
      userId,
      dto.role,
      adminId,
      dto.reason,
    );
  }

  /**
   * Get audit logs
   */
  @Get('audit-logs')
  @ApiOperation({
    summary: '[Admin] Get audit logs',
    description: 'Get paginated audit logs with optional filtering',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'action', required: false, enum: AuditAction })
  @ApiQuery({ name: 'performedById', required: false, type: String })
  @ApiQuery({ name: 'targetType', required: false, type: String })
  @ApiQuery({ name: 'targetId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved' })
  async getAuditLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('action') action?: AuditAction,
    @Query('performedById') performedById?: string,
    @Query('targetType') targetType?: string,
    @Query('targetId') targetId?: string,
  ) {
    return this.auditLogService.getAuditLogs({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      action,
      performedById,
      targetType,
      targetId,
    });
  }

  /**
   * Get audit log statistics
   */
  @Get('audit-logs/stats')
  @ApiOperation({
    summary: '[Admin] Get audit log statistics',
    description: 'Get statistics about audit logs',
  })
  @ApiResponse({ status: 200, description: 'Audit log stats retrieved' })
  async getAuditStats() {
    return this.auditLogService.getAuditStats();
  }

  /**
   * Bulk ban users
   */
  @Patch('users/bulk-ban')
  @ApiOperation({
    summary: '[Admin] Bulk ban users',
    description: 'Ban multiple users at once',
  })
  @ApiResponse({ status: 200, description: 'Users banned successfully' })
  @ApiResponse({ status: 400, description: 'Some users already banned' })
  @ApiResponse({ status: 404, description: 'One or more users not found' })
  async bulkBanUsers(
    @CurrentUser('id') adminId: string,
    @Body() dto: BulkBanUsersDto,
  ) {
    return this.adminService.bulkBanUsers(dto.userIds, adminId, dto.reason);
  }

  /**
   * Bulk unban users
   */
  @Patch('users/bulk-unban')
  @ApiOperation({
    summary: '[Admin] Bulk unban users',
    description: 'Unban multiple users at once',
  })
  @ApiResponse({ status: 200, description: 'Users unbanned successfully' })
  @ApiResponse({ status: 400, description: 'Some users not banned' })
  @ApiResponse({ status: 404, description: 'One or more users not found' })
  async bulkUnbanUsers(
    @CurrentUser('id') adminId: string,
    @Body() dto: BulkUnbanUsersDto,
  ) {
    return this.adminService.bulkUnbanUsers(dto.userIds, adminId, dto.reason);
  }

  /**
   * Bulk change user roles
   */
  @Patch('users/bulk-role')
  @ApiOperation({
    summary: '[Admin] Bulk change user roles',
    description: 'Change role for multiple users at once',
  })
  @ApiResponse({ status: 200, description: 'User roles updated successfully' })
  @ApiResponse({ status: 404, description: 'One or more users not found' })
  async bulkChangeRole(
    @CurrentUser('id') adminId: string,
    @Body() dto: BulkChangeRoleDto,
  ) {
    return this.adminService.bulkChangeRole(
      dto.userIds,
      dto.role,
      adminId,
      dto.reason,
    );
  }
}
