import { PartialType } from '@nestjs/swagger';
import { CreateItemDto } from './create-item.dto';

/**
 * DTO for updating an existing item
 * All fields from CreateItemDto are optional
 */
export class UpdateItemDto extends PartialType(CreateItemDto) {}
