import { Module } from '@nestjs/common';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';
import { RecommendationsService } from './recommendations.service';

/**
 * Items module
 * Handles all item-related functionality (CRUD operations, recommendations)
 */
@Module({
  controllers: [ItemsController],
  providers: [ItemsService, RecommendationsService],
  exports: [ItemsService, RecommendationsService],
})
export class ItemsModule {}
