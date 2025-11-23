import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { ModeratorGuard } from '@/auth/guards/moderator.guard';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FlagReason, ModerationStatus } from '@prisma/client';
import {
  BulkApproveFlagsDto,
  BulkRejectFlagsDto,
  BulkRemoveFlagsDto,
} from './dto/moderation.dto';
import { ModerationService } from './moderation.service';

@ApiTags('Moderation')
@Controller('moderation')
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  /**
   * Flag an item for moderation (authenticated users)
   */
  @Post('items/:id/flag')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Flag an item for moderation' })
  @ApiResponse({ status: 201, description: 'Item flagged successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          enum: [
            'INAPPROPRIATE',
            'SPAM',
            'SCAM',
            'DUPLICATE',
            'PROHIBITED',
            'MISLEADING',
            'COPYRIGHT',
            'OTHER',
          ],
        },
        description: { type: 'string' },
      },
      required: ['reason'],
    },
  })
  async flagItem(
    @Param('id') itemId: string,
    @Body()
    dto: {
      reason: FlagReason;
      description?: string;
    },
    @Request() req,
  ) {
    const ipAddress = req.ip;
    return this.moderationService.flagItem(
      itemId,
      req.user.userId,
      dto,
      ipAddress,
    );
  }

  /**
   * Get all flagged items (moderators only)
   */
  @Get('items/flagged')
  @UseGuards(JwtAuthGuard, ModeratorGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all flagged items' })
  @ApiResponse({ status: 200, description: 'Returns paginated flagged items' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'APPROVED', 'REMOVED'],
  })
  @ApiQuery({
    name: 'reason',
    required: false,
    enum: [
      'INAPPROPRIATE',
      'SPAM',
      'SCAM',
      'DUPLICATE',
      'PROHIBITED',
      'MISLEADING',
      'COPYRIGHT',
      'OTHER',
    ],
  })
  async getFlaggedItems(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: ModerationStatus,
    @Query('reason') reason?: FlagReason,
  ) {
    return this.moderationService.getFlaggedItems({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      status,
      reason,
    });
  }

  /**
   * Get a single flagged item by ID (moderators only)
   */
  @Get('items/flagged/:id')
  @UseGuards(JwtAuthGuard, ModeratorGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a single flagged item' })
  @ApiResponse({ status: 200, description: 'Returns flagged item details' })
  @ApiResponse({ status: 404, description: 'Flagged item not found' })
  async getFlaggedItem(@Param('id') flagId: string) {
    return this.moderationService.getFlaggedItem(flagId);
  }

  /**
   * Approve a flagged item (dismiss the flag) (moderators only)
   */
  @Patch('items/flagged/:id/approve')
  @UseGuards(JwtAuthGuard, ModeratorGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a flagged item (dismiss flag)' })
  @ApiResponse({ status: 200, description: 'Flag approved successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Flagged item not found' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        notes: { type: 'string' },
      },
    },
  })
  async approveItem(
    @Param('id') flagId: string,
    @Body() dto: { notes?: string },
    @Request() req,
  ) {
    const ipAddress = req.ip;
    return this.moderationService.approveItem(
      flagId,
      req.user.userId,
      dto,
      ipAddress,
    );
  }

  /**
   * Remove a flagged item (moderators only)
   */
  @Delete('items/flagged/:id')
  @UseGuards(JwtAuthGuard, ModeratorGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a flagged item' })
  @ApiResponse({ status: 200, description: 'Item removed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Flagged item not found' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reason: { type: 'string' },
        notifyUser: { type: 'boolean' },
      },
      required: ['reason'],
    },
  })
  async removeItem(
    @Param('id') flagId: string,
    @Body() dto: { reason: string; notifyUser?: boolean },
    @Request() req,
  ) {
    const ipAddress = req.ip;
    return this.moderationService.removeItem(
      flagId,
      req.user.userId,
      dto,
      ipAddress,
    );
  }

  /**
   * Get moderation statistics (moderators only)
   */
  @Get('stats')
  @UseGuards(JwtAuthGuard, ModeratorGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get moderation statistics' })
  @ApiResponse({
    status: 200,
    description: 'Returns moderation statistics',
  })
  async getModerationStats() {
    return this.moderationService.getModerationStats();
  }

  /**
   * Bulk approve flagged items (moderators only)
   */
  @Patch('items/flagged/bulk-approve')
  @UseGuards(JwtAuthGuard, ModeratorGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk approve flagged items' })
  @ApiResponse({
    status: 200,
    description: 'Items approved successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'One or more items not found' })
  async bulkApprove(@Body() dto: BulkApproveFlagsDto, @Request() req) {
    const ipAddress = req.ip;
    return this.moderationService.bulkApprove(
      dto.flaggedItemIds,
      req.user.userId,
      dto.notes,
      ipAddress,
    );
  }

  /**
   * Bulk reject flagged items (moderators only)
   */
  @Patch('items/flagged/bulk-reject')
  @UseGuards(JwtAuthGuard, ModeratorGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk reject flagged items' })
  @ApiResponse({
    status: 200,
    description: 'Items rejected successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'One or more items not found' })
  async bulkReject(@Body() dto: BulkRejectFlagsDto, @Request() req) {
    const ipAddress = req.ip;
    return this.moderationService.bulkReject(
      dto.flaggedItemIds,
      req.user.userId,
      dto.reason,
      ipAddress,
    );
  }

  /**
   * Bulk remove flagged items (moderators only)
   */
  @Delete('items/flagged/bulk-remove')
  @UseGuards(JwtAuthGuard, ModeratorGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk remove flagged items' })
  @ApiResponse({
    status: 200,
    description: 'Items removed successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'One or more items not found' })
  async bulkRemove(@Body() dto: BulkRemoveFlagsDto, @Request() req) {
    const ipAddress = req.ip;
    return this.moderationService.bulkRemove(
      dto.flaggedItemIds,
      req.user.userId,
      dto.reason,
      ipAddress,
    );
  }
}
