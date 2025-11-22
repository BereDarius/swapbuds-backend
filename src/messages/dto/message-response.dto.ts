export class MessageResponseDto {
  id: string;
  content: string;
  type: string;
  senderId: string;
  conversationId: string;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  // Populated fields
  sender?: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
}
