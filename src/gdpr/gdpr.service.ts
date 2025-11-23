import { Injectable } from '@nestjs/common';
import { DataDeletionService } from './data-deletion.service';
import { DataExportService } from './data-export.service';

/**
 * Main GDPR service for coordinating data protection operations
 */
@Injectable()
export class GdprService {
  constructor(
    private readonly dataExportService: DataExportService,
    private readonly dataDeletionService: DataDeletionService,
  ) {}

  // Export operations
  async requestDataExport(userId: string): Promise<string> {
    return this.dataExportService.generateExport(userId);
  }

  async getDataExport(exportId: string): Promise<any> {
    return this.dataExportService.getExport(exportId);
  }

  // Deletion operations
  async requestAccountDeletion(userId: string) {
    return this.dataDeletionService.requestDeletion(userId);
  }

  async cancelAccountDeletion(userId: string) {
    return this.dataDeletionService.cancelDeletion(userId);
  }

  async getDeletionStatus(userId: string) {
    return this.dataDeletionService.getDeletionStatus(userId);
  }
}
