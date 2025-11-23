import { CurrentUser } from '@/auth/decorators/auth.decorators';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GdprService } from './gdpr.service';

@ApiTags('GDPR')
@Controller('gdpr')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GdprController {
  constructor(private readonly gdprService: GdprService) {}

  /**
   * Request data export (GDPR Article 15 - Right to Access)
   */
  @Post('export')
  @ApiOperation({
    summary: 'Request data export',
    description:
      'Generate a complete export of all personal data (GDPR Article 15)',
  })
  @ApiResponse({
    status: 201,
    description: 'Export request created, returns exportId',
  })
  async requestDataExport(@CurrentUser('id') userId: string) {
    const exportId = await this.gdprService.requestDataExport(userId);
    return {
      message: 'Data export generated successfully',
      exportId,
      expiresIn: '7 days',
    };
  }

  /**
   * Download data export
   */
  @Get('export/:exportId')
  @ApiOperation({
    summary: 'Download data export',
    description:
      'Download previously generated data export (expires in 7 days)',
  })
  @ApiResponse({
    status: 200,
    description: 'Export data retrieved',
  })
  @ApiResponse({
    status: 404,
    description: 'Export not found or expired',
  })
  async downloadDataExport(@Param('exportId') exportId: string) {
    return await this.gdprService.getDataExport(exportId);
  }

  /**
   * Request account deletion (GDPR Article 17 - Right to Erasure)
   */
  @Post('delete-account')
  @ApiOperation({
    summary: 'Request account deletion',
    description:
      'Request account deletion with 30-day grace period (GDPR Article 17)',
  })
  @ApiResponse({
    status: 201,
    description: 'Account deletion requested',
  })
  async requestAccountDeletion(@CurrentUser('id') userId: string) {
    return await this.gdprService.requestAccountDeletion(userId);
  }

  /**
   * Cancel account deletion
   */
  @Delete('delete-account')
  @ApiOperation({
    summary: 'Cancel account deletion',
    description: 'Cancel pending account deletion during grace period',
  })
  @ApiResponse({
    status: 200,
    description: 'Account deletion canceled',
  })
  @ApiResponse({
    status: 400,
    description: 'No deletion request or grace period expired',
  })
  async cancelAccountDeletion(@CurrentUser('id') userId: string) {
    return await this.gdprService.cancelAccountDeletion(userId);
  }

  /**
   * Get account deletion status
   */
  @Get('delete-account/status')
  @ApiOperation({
    summary: 'Get deletion status',
    description: 'Check if account deletion is pending and view status',
  })
  @ApiResponse({
    status: 200,
    description: 'Deletion status retrieved',
  })
  async getDeletionStatus(@CurrentUser('id') userId: string) {
    return await this.gdprService.getDeletionStatus(userId);
  }
}
