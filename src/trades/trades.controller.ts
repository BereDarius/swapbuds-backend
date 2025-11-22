import { CurrentUser } from '@/auth/decorators/auth.decorators';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateTradeDto } from './dto/create-trade.dto';
import { TradeFilterDto } from './dto/trade-filter.dto';
import { TradeResponseDto } from './dto/trade-response.dto';
import { TradesService } from './trades.service';

/**
 * Controller for managing trades between users
 * All endpoints require authentication
 */
@ApiTags('trades')
@Controller('trades')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TradesController {
  constructor(private readonly tradesService: TradesService) {}

  /**
   * Create a new trade proposal
   */
  @Post()
  @ApiOperation({ summary: 'Create a trade proposal' })
  @ApiResponse({
    status: 201,
    description: 'Trade proposal created successfully',
    type: TradeResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not your item' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async createTrade(
    @CurrentUser('sub') userId: string,
    @Body() createTradeDto: CreateTradeDto,
  ): Promise<TradeResponseDto> {
    return this.tradesService.createTrade(userId, createTradeDto);
  }

  /**
   * Get all trades for current user (with optional filters)
   */
  @Get('my-trades')
  @ApiOperation({
    summary: 'Get all trades for current user with filters and pagination',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED'],
  })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Trades retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyTrades(
    @CurrentUser('sub') userId: string,
    @Query() filters: TradeFilterDto,
  ) {
    // If no filters provided, use simple method
    if (
      !filters.status &&
      !filters.startDate &&
      !filters.endDate &&
      !filters.category &&
      !filters.search &&
      !filters.page &&
      !filters.limit
    ) {
      const trades = await this.tradesService.getUserTrades(userId);
      return { trades, total: trades.length };
    }

    // Otherwise use filtered method
    return this.tradesService.getUserTradesFiltered(userId, filters);
  }

  /**
   * Get a specific trade by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get trade details' })
  @ApiParam({ name: 'id', description: 'Trade ID' })
  @ApiResponse({
    status: 200,
    description: 'Trade retrieved successfully',
    type: TradeResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not part of trade' })
  @ApiResponse({ status: 404, description: 'Trade not found' })
  async getTradeById(
    @Param('id') tradeId: string,
    @CurrentUser('sub') userId: string,
  ): Promise<TradeResponseDto> {
    return this.tradesService.getTradeById(tradeId, userId);
  }

  /**
   * Accept a trade proposal
   */
  @Patch(':id/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept a trade proposal' })
  @ApiParam({ name: 'id', description: 'Trade ID' })
  @ApiResponse({
    status: 200,
    description: 'Trade accepted successfully',
    type: TradeResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - trade not pending' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not the responder' })
  @ApiResponse({ status: 404, description: 'Trade not found' })
  async acceptTrade(
    @Param('id') tradeId: string,
    @CurrentUser('sub') userId: string,
  ): Promise<TradeResponseDto> {
    return this.tradesService.acceptTrade(tradeId, userId);
  }

  /**
   * Reject a trade proposal
   */
  @Patch(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a trade proposal' })
  @ApiParam({ name: 'id', description: 'Trade ID' })
  @ApiResponse({
    status: 200,
    description: 'Trade rejected successfully',
    type: TradeResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - trade not pending' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not the responder' })
  @ApiResponse({ status: 404, description: 'Trade not found' })
  async rejectTrade(
    @Param('id') tradeId: string,
    @CurrentUser('sub') userId: string,
  ): Promise<TradeResponseDto> {
    return this.tradesService.rejectTrade(tradeId, userId);
  }

  /**
   * Cancel a trade proposal
   */
  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a trade proposal' })
  @ApiParam({ name: 'id', description: 'Trade ID' })
  @ApiResponse({
    status: 200,
    description: 'Trade cancelled successfully',
    type: TradeResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - trade not pending' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not the proposer' })
  @ApiResponse({ status: 404, description: 'Trade not found' })
  async cancelTrade(
    @Param('id') tradeId: string,
    @CurrentUser('sub') userId: string,
  ): Promise<TradeResponseDto> {
    return this.tradesService.cancelTrade(tradeId, userId);
  }
}
