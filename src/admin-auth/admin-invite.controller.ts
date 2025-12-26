import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AdminInviteStatus } from '@prisma/client';
import { AdminInviteService } from './admin-invite.service';
import { AdminRoles } from './decorators/admin-roles.decorator';
import { RequirePermission } from './decorators/require-permission.decorator';
import {
  AcceptInviteDto,
  ApproveInviteDto,
  CreateAdminInviteDto,
  RejectInviteDto,
} from './dto/admin-invite.dto';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard';
import { AdminRoleGuard } from './guards/admin-role.guard';
import { PermissionsGuard } from './guards/permissions.guard';

@ApiTags('Admin Invitations')
@Controller('admin/invites')
export class AdminInviteController {
  constructor(private readonly inviteService: AdminInviteService) {}

  @Post()
  @UseGuards(AdminJwtAuthGuard, AdminRoleGuard, PermissionsGuard)
  @AdminRoles('ADMIN')
  @RequirePermission('admin:invites_create')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create admin invitation',
    description: 'Send invitation to new admin user. Requires ADMIN role.',
  })
  async createInvite(@Body() dto: CreateAdminInviteDto, @Request() req) {
    return this.inviteService.createInvite(
      dto.email,
      dto.username,
      dto.role,
      req.user.sub,
    );
  }

  @Get()
  @UseGuards(AdminJwtAuthGuard, AdminRoleGuard, PermissionsGuard)
  @AdminRoles('ADMIN', 'MODERATOR')
  @RequirePermission('admin:invites_view')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List all invitations',
    description: 'Get all admin invitations with optional status filter.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: AdminInviteStatus,
  })
  async getAllInvites(@Query('status') status?: AdminInviteStatus) {
    return this.inviteService.getAllInvites(status);
  }

  @Get(':token')
  @ApiOperation({
    summary: 'Get invitation by token',
    description: 'Public endpoint for recipients to view their invitation.',
  })
  @ApiParam({ name: 'token', description: 'Invitation token' })
  async getInviteByToken(@Param('token') token: string) {
    return this.inviteService.getInviteByToken(token);
  }

  @Post('accept')
  @ApiOperation({
    summary: 'Accept invitation',
    description:
      'Recipient accepts invitation. Password will be set after approval.',
  })
  async acceptInvite(@Body() dto: AcceptInviteDto) {
    return this.inviteService.acceptInvite(dto.token);
  }

  @Post('approve')
  @UseGuards(AdminJwtAuthGuard, AdminRoleGuard, PermissionsGuard)
  @AdminRoles('ADMIN')
  @RequirePermission('admin:invites_approve')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Approve invitation',
    description:
      'Approve accepted invitation and create admin account. Requires ADMIN role.',
  })
  async approveInvite(@Body() dto: ApproveInviteDto, @Request() req) {
    return this.inviteService.approveInvite(dto.inviteId, req.user.sub);
  }

  @Post('reject')
  @UseGuards(AdminJwtAuthGuard, AdminRoleGuard, PermissionsGuard)
  @AdminRoles('ADMIN')
  @RequirePermission('admin:invites_approve')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Reject invitation',
    description: 'Reject accepted invitation. Requires ADMIN role.',
  })
  async rejectInvite(@Body() dto: RejectInviteDto, @Request() req) {
    return this.inviteService.rejectInvite(
      dto.inviteId,
      req.user.sub,
      dto.reason,
    );
  }

  @Delete(':inviteId')
  @UseGuards(AdminJwtAuthGuard, PermissionsGuard)
  @RequirePermission('admin:invites_create')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Revoke invitation',
    description:
      'Revoke pending or accepted invitation. Only sender or ADMIN can revoke.',
  })
  @ApiParam({ name: 'inviteId', description: 'Invitation ID' })
  async revokeInvite(@Param('inviteId') inviteId: string, @Request() req) {
    return this.inviteService.revokeInvite(inviteId, req.user.sub);
  }
}
