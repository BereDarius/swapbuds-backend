import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  emailTradeProposal?: boolean;

  @IsOptional()
  @IsBoolean()
  emailTradeAccepted?: boolean;

  @IsOptional()
  @IsBoolean()
  emailTradeRejected?: boolean;

  @IsOptional()
  @IsBoolean()
  emailTradeCancelled?: boolean;

  @IsOptional()
  @IsBoolean()
  emailNewMessage?: boolean;

  @IsOptional()
  @IsBoolean()
  emailNewComment?: boolean;

  @IsOptional()
  @IsBoolean()
  emailNewLike?: boolean;

  @IsOptional()
  @IsBoolean()
  emailNewReview?: boolean;

  @IsOptional()
  @IsBoolean()
  pushTradeProposal?: boolean;

  @IsOptional()
  @IsBoolean()
  pushTradeAccepted?: boolean;

  @IsOptional()
  @IsBoolean()
  pushTradeRejected?: boolean;

  @IsOptional()
  @IsBoolean()
  pushTradeCancelled?: boolean;

  @IsOptional()
  @IsBoolean()
  pushNewMessage?: boolean;

  @IsOptional()
  @IsBoolean()
  pushNewComment?: boolean;

  @IsOptional()
  @IsBoolean()
  pushNewLike?: boolean;

  @IsOptional()
  @IsBoolean()
  pushNewReview?: boolean;
}
