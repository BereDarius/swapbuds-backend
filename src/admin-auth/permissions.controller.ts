import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { PermissionCategory } from '@prisma/client';
import { RequirePermission } from './decorators/require-permission.decorator';
import {
  GrantPermissionsDto,
  RevokePermissionsDto,
} from './dto/permissions.dto';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { PermissionsService } from './permissions.service';

@ApiTags('Admin Auth')
@ApiBearerAuth()
@Controller('api/v1/admin/permissions')
@UseGuards(AdminJwtAuthGuard, PermissionsGuard)
export class PermissionsController {
  constructor(private permissionsService: PermissionsService) {}

  @Get()
  @RequirePermission('admin:permissions_manage')
  @ApiOperation({
    summary: 'Get all available permissions',
    description: 'Returns list of all permissions in the system',
  })
  async getAllPermissions() {
    return this.permissionsService.getAllPermissions();
  }

  @Get('category/:category')
  @RequirePermission('admin:permissions_manage')
  @ApiOperation({
    summary: 'Get permissions by category',
    description: 'Returns permissions filtered by category',
  })
  @ApiParam({
    name: 'category',
    enum: PermissionCategory,
    description: 'Permission category',
  })
  async getPermissionsByCategory(
    @Param('category') category: PermissionCategory,
  ) {
    return this.permissionsService.getPermissionsByCategory(category);
  }

  @Get('admin/:adminUserId')
  @RequirePermission('admin:view', 'admin:permissions_manage')
  @ApiOperation({
    summary: 'Get permissions for an admin user',
    description: 'Returns all permissions granted to a specific admin user',
  })
  @ApiParam({
    name: 'adminUserId',
    description: 'Admin user ID',
  })
  async getAdminPermissions(@Param('adminUserId') adminUserId: string) {
    return this.permissionsService.getAdminPermissions(adminUserId);
  }

  @Post('grant')
  @RequirePermission('admin:permissions_manage')
  @ApiOperation({
    summary: 'Grant permissions to admin user',
    description:
      'Grants specified permissions to an admin user. ADMIN role already has all permissions.',
  })
  async grantPermissions(@Body() dto: GrantPermissionsDto, @Request() req) {
    return this.permissionsService.grantPermissions(
      dto.adminUserId,
      dto.permissions,
      req.user.sub, // Who granted the permissions
    );
  }

  @Post('revoke')
  @RequirePermission('admin:permissions_manage')
  @ApiOperation({
    summary: 'Revoke permissions from admin user',
    description:
      'Revokes specified permissions from an admin user. Cannot revoke from ADMIN role.',
  })
  async revokePermissions(@Body() dto: RevokePermissionsDto) {
    return this.permissionsService.revokePermissions(
      dto.adminUserId,
      dto.permissions,
    );
  }

  @Delete('admin/:adminUserId/all')
  @RequirePermission('admin:permissions_manage')
  @ApiOperation({
    summary: 'Revoke all permissions from admin user',
    description:
      'Removes all explicit permissions from an admin user. Cannot revoke from ADMIN role.',
  })
  @ApiParam({
    name: 'adminUserId',
    description: 'Admin user ID',
  })
  async revokeAllPermissions(@Param('adminUserId') adminUserId: string) {
    return this.permissionsService.revokeAllPermissions(adminUserId);
  }
}
