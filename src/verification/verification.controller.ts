import { AdminRoles } from '@/admin-auth/decorators/admin-roles.decorator';
import { AdminJwtAuthGuard } from '@/admin-auth/guards/admin-jwt-auth.guard';
import { AdminRoleGuard } from '@/admin-auth/guards/admin-role.guard';
import { CurrentUser } from '@/auth/decorators/auth.decorators';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import { VerificationResponseDto } from './dto/verification-response.dto';
import {
  ReviewVerificationDto,
  SubmitVerificationDto,
} from './dto/verification.dto';
import { VerificationService } from './verification.service';

/**
 * Controller for user ID verification
 */
@ApiTags('Verification')
@Controller('verification')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  /**
   * Submit ID verification request
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Submit ID verification request',
    description:
      'Submit ID document for verification. Document must be uploaded to Cloudinary first.',
  })
  @ApiResponse({
    status: 201,
    description: 'Verification request submitted successfully',
    type: VerificationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - already verified or pending',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async submitVerification(
    @CurrentUser('id') userId: string,
    @Body() dto: SubmitVerificationDto,
  ) {
    return this.verificationService.submitVerification(userId, dto);
  }

  /**
   * Get user's own verification status
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get own verification status',
    description: 'Get the verification status for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Verification status retrieved',
    type: VerificationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'No verification request found' })
  async getMyVerification(@CurrentUser('id') userId: string) {
    return this.verificationService.getVerificationStatus(userId);
  }

  /**
   * Cancel pending verification request
   */
  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cancel pending verification request',
    description: 'Cancel your pending verification request',
  })
  @ApiResponse({ status: 200, description: 'Verification cancelled' })
  @ApiResponse({
    status: 400,
    description: 'Can only cancel pending requests',
  })
  async cancelMyVerification(@CurrentUser('id') userId: string) {
    return this.verificationService.cancelVerification(userId);
  }

  /**
   * Admin: Get all pending verifications
   */
  @Get('admin/pending')
  @UseGuards(AdminJwtAuthGuard, AdminRoleGuard)
  @AdminRoles(AdminRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '[Admin] Get pending verification requests',
    description: 'Get all pending verification requests (admin only)',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'Pending verifications retrieved',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not admin' })
  async getPendingVerifications(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.verificationService.getPendingVerifications(pageNum, limitNum);
  }

  /**
   * Admin: Get verification statistics
   */
  @Get('admin/stats')
  @UseGuards(AdminJwtAuthGuard)
  @AdminRoles(AdminRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '[Admin] Get verification statistics',
    description: 'Get verification statistics for admin dashboard',
  })
  @ApiResponse({ status: 200, description: 'Statistics retrieved' })
  async getVerificationStats() {
    return this.verificationService.getVerificationStats();
  }

  /**
   * Admin: Get specific verification by ID
   */
  @Get('admin/:id')
  @UseGuards(AdminJwtAuthGuard)
  @AdminRoles(AdminRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '[Admin] Get verification by ID',
    description: 'Get detailed verification information (admin only)',
  })
  @ApiResponse({ status: 200, description: 'Verification retrieved' })
  @ApiResponse({ status: 404, description: 'Verification not found' })
  async getVerification(@Param('id') id: string) {
    return this.verificationService.getVerificationById(id);
  }

  /**
   * Admin: Get signed URL for viewing document
   */
  @Get('admin/:id/document-url')
  @UseGuards(AdminJwtAuthGuard)
  @AdminRoles(AdminRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '[Admin] Get signed document URL',
    description:
      'Get a temporary signed URL to view the verification document (front or back). URL expires in 5 minutes.',
  })
  @ApiQuery({
    name: 'side',
    required: false,
    type: String,
    enum: ['front', 'back'],
    example: 'front',
  })
  @ApiResponse({
    status: 200,
    description: 'Signed URL generated',
    schema: {
      properties: {
        signedUrl: { type: 'string' },
        expiresIn: { type: 'number', example: 300 },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Verification or document not found',
  })
  async getDocumentUrl(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Query('side') side?: 'front' | 'back',
  ) {
    return this.verificationService.getDocumentSignedUrl(
      id,
      adminId,
      side || 'front',
    );
  }

  /**
   * Admin: Approve verification
   */
  @Patch('admin/:id/approve')
  @UseGuards(AdminJwtAuthGuard)
  @AdminRoles(AdminRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '[Admin] Approve verification',
    description:
      'Approve verification request. Requires date of birth for age verification.',
  })
  @ApiResponse({ status: 200, description: 'Verification approved' })
  @ApiResponse({
    status: 400,
    description: 'Bad request - missing DOB or user is underage',
  })
  @ApiResponse({ status: 404, description: 'Verification not found' })
  async approveVerification(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: ReviewVerificationDto,
  ) {
    return this.verificationService.approveVerification(id, adminId, dto);
  }

  /**
   * Admin: Reject verification
   */
  @Patch('admin/:id/reject')
  @UseGuards(AdminJwtAuthGuard)
  @AdminRoles(AdminRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '[Admin] Reject verification',
    description: 'Reject verification request with reason',
  })
  @ApiResponse({ status: 200, description: 'Verification rejected' })
  @ApiResponse({
    status: 400,
    description: 'Bad request - missing rejection reason',
  })
  @ApiResponse({ status: 404, description: 'Verification not found' })
  async rejectVerification(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: ReviewVerificationDto,
  ) {
    return this.verificationService.rejectVerification(id, adminId, dto);
  }

  /**
   * Admin: Update internal notes
   */
  @Patch('admin/:id/notes')
  @UseGuards(AdminJwtAuthGuard)
  @AdminRoles(AdminRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '[Admin] Update internal notes',
    description: 'Update internal notes for a verification request',
  })
  @ApiResponse({ status: 200, description: 'Notes updated successfully' })
  @ApiResponse({ status: 404, description: 'Verification not found' })
  async updateNotes(@Param('id') id: string, @Body() body: { notes: string }) {
    return this.verificationService.updateNotes(id, body.notes);
  }
}
