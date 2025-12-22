import { AdminRoles } from '@/admin-auth/decorators/admin-roles.decorator';
import { AdminJwtAuthGuard } from '@/admin-auth/guards/admin-jwt-auth.guard';
import { AdminRoleGuard } from '@/admin-auth/guards/admin-role.guard';
import {
  CurrentUser,
  RequireVerified,
} from '@/auth/decorators/auth.decorators';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { VerifiedGuard } from '@/auth/guards/verified.guard';
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
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
import { AdminRole, DisputeStatus } from '@prisma/client';
import { DisputesService } from './disputes.service';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { DisputeResponseDto } from './dto/dispute-response.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';

/**
 * Controller for handling trade disputes
 */
@ApiTags('Disputes')
@Controller('disputes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  /**
   * Create a new dispute
   * @param userId - Authenticated user ID
   * @param createDisputeDto - Dispute details
   * @returns Created dispute
   * Requires verification for trust and accountability
   */
  @Post()
  @UseGuards(VerifiedGuard)
  @RequireVerified()
  @ApiOperation({
    summary: 'Create a new dispute',
    description: 'File a dispute against another user for a specific trade',
  })
  @ApiResponse({
    status: 201,
    description: 'Dispute created successfully',
    type: DisputeResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid dispute data' })
  @ApiResponse({
    status: 403,
    description: 'Not authorized for this trade or verification required',
  })
  @ApiResponse({ status: 404, description: 'Trade not found' })
  async createDispute(
    @CurrentUser('id') userId: string,
    @Body() createDisputeDto: CreateDisputeDto,
  ): Promise<DisputeResponseDto> {
    return this.disputesService.createDispute(userId, createDisputeDto);
  }

  /**
   * Get all disputes for the authenticated user
   * @param userId - Authenticated user ID
   * @returns List of disputes
   */
  @Get('my')
  @ApiOperation({
    summary: 'Get user disputes',
    description: 'Retrieve all disputes filed by or against the current user',
  })
  @ApiResponse({
    status: 200,
    description: 'Disputes retrieved successfully',
    type: [DisputeResponseDto],
  })
  async getUserDisputes(
    @CurrentUser('id') userId: string,
  ): Promise<DisputeResponseDto[]> {
    return this.disputesService.getUserDisputes(userId);
  }

  /**
   * Get a specific dispute
   * @param disputeId - Dispute ID
   * @param userId - Authenticated user ID
   * @returns Dispute details
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get dispute by ID',
    description: 'Retrieve details of a specific dispute',
  })
  @ApiResponse({
    status: 200,
    description: 'Dispute retrieved successfully',
    type: DisputeResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Dispute not found' })
  async getDispute(
    @Param('id') disputeId: string,
    @CurrentUser('id') userId: string,
  ): Promise<DisputeResponseDto> {
    return this.disputesService.getDispute(disputeId, userId);
  }

  /**
   * Get all disputes (admin only)
   * @param status - Optional status filter
   * @returns List of all disputes
   */
  @Get()
  @UseGuards(AdminJwtAuthGuard, AdminRoleGuard)
  @AdminRoles(AdminRole.ADMIN)
  @ApiOperation({
    summary: 'Get all disputes (Admin only)',
    description: 'Retrieve all disputes with optional status filter',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: DisputeStatus,
    description: 'Filter by dispute status',
  })
  @ApiResponse({
    status: 200,
    description: 'Disputes retrieved successfully',
    type: [DisputeResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getAllDisputes(
    @Query('status') status?: DisputeStatus,
  ): Promise<DisputeResponseDto[]> {
    return this.disputesService.getAllDisputes(status);
  }

  /**
   * Assign dispute to admin (admin only)
   * @param disputeId - Dispute ID
   * @param adminId - Admin user ID
   * @returns Updated dispute
   */
  @Patch(':id/assign')
  @UseGuards(AdminJwtAuthGuard)
  @AdminRoles(AdminRole.ADMIN)
  @ApiOperation({
    summary: 'Assign dispute to admin (Admin only)',
    description: 'Assign a dispute to an admin for review',
  })
  @ApiResponse({
    status: 200,
    description: 'Dispute assigned successfully',
    type: DisputeResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Cannot assign resolved dispute' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Dispute not found' })
  async assignDispute(
    @Param('id') disputeId: string,
    @CurrentUser('id') adminId: string,
  ): Promise<DisputeResponseDto> {
    return this.disputesService.assignDispute(disputeId, adminId);
  }

  /**
   * Resolve a dispute (admin only)
   * @param disputeId - Dispute ID
   * @param resolveDisputeDto - Resolution details
   * @returns Resolved dispute
   */
  @Patch(':id/resolve')
  @UseGuards(AdminJwtAuthGuard)
  @AdminRoles(AdminRole.ADMIN)
  @ApiOperation({
    summary: 'Resolve dispute (Admin only)',
    description: 'Resolve a dispute with admin notes and resolution details',
  })
  @ApiResponse({
    status: 200,
    description: 'Dispute resolved successfully',
    type: DisputeResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Dispute already resolved' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Dispute not found' })
  async resolveDispute(
    @Param('id') disputeId: string,
    @Body() resolveDisputeDto: ResolveDisputeDto,
  ): Promise<DisputeResponseDto> {
    return this.disputesService.resolveDispute(disputeId, resolveDisputeDto);
  }

  /**
   * Close a dispute (admin only)
   * @param disputeId - Dispute ID
   * @returns Closed dispute
   */
  @Patch(':id/close')
  @UseGuards(AdminJwtAuthGuard)
  @AdminRoles(AdminRole.ADMIN)
  @ApiOperation({
    summary: 'Close dispute (Admin only)',
    description: 'Close a dispute without resolution',
  })
  @ApiResponse({
    status: 200,
    description: 'Dispute closed successfully',
    type: DisputeResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Dispute not found' })
  async closeDispute(
    @Param('id') disputeId: string,
  ): Promise<DisputeResponseDto> {
    return this.disputesService.closeDispute(disputeId);
  }
}
