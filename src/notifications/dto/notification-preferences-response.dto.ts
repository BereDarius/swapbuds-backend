export class NotificationPreferencesResponseDto {
  id: string;
  userId: string;

  // Email notifications
  emailTradeProposal: boolean;
  emailTradeAccepted: boolean;
  emailTradeRejected: boolean;
  emailTradeCancelled: boolean;
  emailNewMessage: boolean;
  emailNewComment: boolean;
  emailNewLike: boolean;
  emailNewReview: boolean;

  // Push/In-app notifications
  pushTradeProposal: boolean;
  pushTradeAccepted: boolean;
  pushTradeRejected: boolean;
  pushTradeCancelled: boolean;
  pushNewMessage: boolean;
  pushNewComment: boolean;
  pushNewLike: boolean;
  pushNewReview: boolean;

  createdAt: Date;
  updatedAt: Date;
}
