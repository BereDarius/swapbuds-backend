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
import { SupportPriority } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SupportGuard } from '../auth/guards/support.guard';
import { SupportChatGateway } from './support-chat.gateway';
import { SupportChatService } from './support-chat.service';

@ApiTags('support')
@Controller('support')
export class SupportChatController {
  constructor(
    private readonly supportChatService: SupportChatService,
    private readonly supportChatGateway: SupportChatGateway,
  ) {}

  /**
   * Start a new support chat (user)
   */
  @Post('chat')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start a new support chat' })
  @ApiResponse({ status: 201, description: 'Chat created successfully' })
  @ApiResponse({ status: 400, description: 'User already has an active chat' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        subject: { type: 'string' },
        priority: {
          type: 'string',
          enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        },
        initialMessage: { type: 'string' },
      },
      required: ['subject', 'initialMessage'],
    },
  })
  async createChat(
    @Body()
    dto: {
      subject: string;
      priority?: SupportPriority;
      initialMessage: string;
    },
    @Request() req,
  ) {
    const chat = await this.supportChatService.createChat(req.user.userId, dto);

    // Notify via WebSocket
    this.supportChatGateway.emitQueuePositionUpdate(
      req.user.userId,
      chat.id,
      chat.queuePosition,
    );

    return chat;
  }

  /**
   * Get user's chats
   */
  @Get('chats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get user's support chats" })
  @ApiResponse({ status: 200, description: 'Returns user chats' })
  @ApiQuery({ name: 'includeResolved', required: false, type: Boolean })
  async getUserChats(
    @Request() req,
    @Query('includeResolved') includeResolved?: string,
  ) {
    return this.supportChatService.getUserChats(
      req.user.userId,
      includeResolved === 'true',
    );
  }

  /**
   * Get chat details
   */
  @Get('chats/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get chat details' })
  @ApiResponse({ status: 200, description: 'Returns chat details' })
  @ApiResponse({ status: 404, description: 'Chat not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getChat(@Param('id') chatId: string, @Request() req) {
    return this.supportChatService.getChat(
      chatId,
      req.user.userId,
      req.user.role,
    );
  }

  /**
   * Send a message in a chat
   */
  @Post('chats/:id/messages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a message in a chat' })
  @ApiResponse({ status: 200, description: 'Message sent successfully' })
  @ApiResponse({ status: 404, description: 'Chat not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
      required: ['message'],
    },
  })
  async sendMessage(
    @Param('id') chatId: string,
    @Body() dto: { message: string },
    @Request() req,
  ) {
    const message = await this.supportChatService.sendMessage(
      chatId,
      req.user.userId,
      dto,
      req.user.role,
    );

    // Emit via WebSocket
    this.supportChatGateway.emitMessage(chatId, message);

    return message;
  }

  /**
   * Close a chat (user or agent)
   */
  @Patch('chats/:id/close')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Close a support chat' })
  @ApiResponse({ status: 200, description: 'Chat closed successfully' })
  @ApiResponse({ status: 404, description: 'Chat not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async closeChat(@Param('id') chatId: string, @Request() req) {
    const chat = await this.supportChatService.closeChat(
      chatId,
      req.user.userId,
      req.user.role,
    );

    // Emit via WebSocket
    this.supportChatGateway.emitChatClosed(chatId);

    return chat;
  }

  /**
   * Get agent's assigned chats (support agents only)
   */
  @Get('agent/chats')
  @UseGuards(JwtAuthGuard, SupportGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get agent's assigned chats" })
  @ApiResponse({ status: 200, description: 'Returns agent chats' })
  async getAgentChats(@Request() req) {
    return this.supportChatService.getAgentChats(req.user.userId);
  }

  /**
   * Resolve a chat (support agents only)
   */
  @Patch('chats/:id/resolve')
  @UseGuards(JwtAuthGuard, SupportGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve a support chat' })
  @ApiResponse({ status: 200, description: 'Chat resolved successfully' })
  @ApiResponse({ status: 404, description: 'Chat not found' })
  @ApiResponse({ status: 403, description: 'Not assigned to this chat' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        resolution: { type: 'string' },
      },
    },
  })
  async resolveChat(
    @Param('id') chatId: string,
    @Body() dto: { resolution?: string },
    @Request() req,
  ) {
    const chat = await this.supportChatService.resolveChat(
      chatId,
      req.user.userId,
      dto,
    );

    // Emit via WebSocket
    this.supportChatGateway.emitChatResolved(chatId);

    return chat;
  }

  /**
   * Get support statistics (support agents only)
   */
  @Get('stats')
  @UseGuards(JwtAuthGuard, SupportGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get support statistics' })
  @ApiResponse({ status: 200, description: 'Returns support statistics' })
  async getSupportStats() {
    return this.supportChatService.getSupportStats();
  }
}
