import { AdminGuard } from '@/auth/guards/admin.guard';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Ip,
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
import { CreateWaitlistDto } from './dto/create-waitlist.dto';
import {
  WaitlistEmailsDto,
  WaitlistResponseDto,
  WaitlistStatsDto,
} from './dto/waitlist-response.dto';
import { WaitlistService } from './waitlist.service';

@ApiTags('Waitlist')
@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Post()
  @ApiOperation({ summary: 'Join waitlist (Public)' })
  @ApiResponse({
    status: 201,
    description: 'Successfully added to waitlist',
    type: WaitlistResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Email already on waitlist',
  })
  async create(
    @Body() createDto: CreateWaitlistDto,
    @Headers('user-agent') userAgent?: string,
    @Ip() ipAddress?: string,
  ): Promise<WaitlistResponseDto> {
    return this.waitlistService.create(createDto, userAgent, ipAddress);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get waitlist statistics (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Waitlist statistics',
    type: WaitlistStatsDto,
  })
  async getStats(): Promise<WaitlistStatsDto> {
    return this.waitlistService.getStats();
  }

  @Get('emails')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export all emails (Admin only)' })
  @ApiQuery({
    name: 'notified',
    required: false,
    type: Boolean,
    description: 'Filter by notified status',
  })
  @ApiResponse({
    status: 200,
    description: 'List of emails',
    type: WaitlistEmailsDto,
  })
  async getAllEmails(
    @Query('notified') notified?: string,
  ): Promise<WaitlistEmailsDto> {
    const notifiedOnly = notified === 'true';
    return this.waitlistService.getAllEmails(notifiedOnly);
  }

  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List waitlist entries (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'notified',
    required: false,
    type: Boolean,
    description: 'Filter by notified status',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated waitlist entries',
  })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('notified') notified?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const notifiedBool =
      notified !== undefined ? notified === 'true' : undefined;

    return this.waitlistService.findAll(pageNum, limitNum, notifiedBool);
  }

  @Patch('notify')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark entries as notified (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Entries marked as notified',
  })
  async markAsNotified(@Body() body: { ids: string[] }) {
    return this.waitlistService.markAsNotified(body.ids);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete waitlist entry (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Entry deleted successfully',
  })
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    await this.waitlistService.remove(id);
    return { message: 'Waitlist entry deleted successfully' };
  }
}
