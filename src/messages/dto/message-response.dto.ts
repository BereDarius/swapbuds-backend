export class MessageResponseDto {
  id: string;
  content: string;
  type: string;
  senderId: string;
  conversationId: string;
  isRead: boolean;
  readAt: Date | null;
  isDeleted: boolean;
  isEdited: boolean;
  editedAt: Date | null;
  deletedAt: Date | null;
  deletedBy: string | null;
  deleteReason: string | null;
  createdAt: Date;
  updatedAt: Date;

  // Populated fields
  sender?: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
}
