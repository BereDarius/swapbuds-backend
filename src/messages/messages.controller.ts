import {
  CurrentUser,
  RequireVerified,
} from '@/auth/decorators/auth.decorators';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { VerifiedGuard } from '@/auth/guards/verified.guard';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConversationResponseDto } from './dto/conversation-response.dto';
import { GetMessagesDto } from './dto/get-messages.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { MessagesService } from './messages.service';

@ApiTags('Messages')
@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  /**
   * Send a message
   */
  @Post()
  @UseGuards(VerifiedGuard)
  @RequireVerified()
  async sendMessage(
    @CurrentUser('id') userId: string,
    @Body() dto: SendMessageDto,
  ): Promise<MessageResponseDto> {
    return this.messagesService.sendMessage(userId, dto);
  }

  /**
   * Get all conversations for the current user
   */
  @Get('conversations')
  async getConversations(
    @CurrentUser('id') userId: string,
  ): Promise<ConversationResponseDto[]> {
    return this.messagesService.getConversations(userId);
  }

  /**
   * Get messages in a conversation
   */
  @Get('conversations/:conversationId')
  async getMessages(
    @CurrentUser('id') userId: string,
    @Param('conversationId') conversationId: string,
    @Query() dto: GetMessagesDto,
  ): Promise<{ messages: MessageResponseDto[]; total: number }> {
    return this.messagesService.getMessages(userId, conversationId, dto);
  }

  /**
   * Mark a message as read
   */
  @Patch(':id/read')
  async markAsRead(
    @CurrentUser('id') userId: string,
    @Param('id') messageId: string,
  ): Promise<MessageResponseDto> {
    return this.messagesService.markAsRead(userId, messageId);
  }

  /**
   * Mark all messages in a conversation as read
   */
  @Patch('conversations/:conversationId/read')
  async markConversationAsRead(
    @CurrentUser('id') userId: string,
    @Param('conversationId') conversationId: string,
  ): Promise<{ count: number }> {
    return this.messagesService.markConversationAsRead(userId, conversationId);
  }

  /**
   * Update/edit a message
   */
  @Patch(':id')
  @UseGuards(VerifiedGuard)
  @RequireVerified()
  async updateMessage(
    @CurrentUser('id') userId: string,
    @Param('id') messageId: string,
    @Body() dto: { content: string },
  ): Promise<MessageResponseDto> {
    return this.messagesService.updateMessage(userId, messageId, dto.content);
  }

  /**
   * Delete a message
   */
  @Delete(':id')
  async deleteMessage(
    @CurrentUser('id') userId: string,
    @Param('id') messageId: string,
  ): Promise<{ message: string }> {
    await this.messagesService.deleteMessage(userId, messageId);
    return { message: 'Message deleted successfully' };
  }

  /**
   * Get unread message count
   */
  @Get('unread/count')
  async getUnreadCount(
    @CurrentUser('id') userId: string,
  ): Promise<{ count: number }> {
    const count = await this.messagesService.getUnreadCount(userId);
    return { count };
  }

  /**
   * Get message version history (admin only)
   */
  @Get(':id/versions')
  async getMessageVersions(@Param('id') messageId: string) {
    return this.messagesService.getMessageVersions(messageId);
  }
}
