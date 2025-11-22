export class ConversationResponseDto {
  id: string;
  user1Id: string;
  user2Id: string;
  tradeId: string | null;
  lastMessageAt: Date | null;
  lastMessageContent: string | null;
  lastMessageSender: string | null;
  unreadCount?: number;
  createdAt: Date;
  updatedAt: Date;

  // Populated fields
  otherUser?: {
    id: string;
    username: string;
    avatarUrl: string | null;
    isActive: boolean;
  };

  trade?: {
    id: string;
    status: string;
    itemOffered: {
      id: string;
      title: string;
      images: Array<{ url: string }>;
    };
    itemRequested: {
      id: string;
      title: string;
      images: Array<{ url: string }>;
    };
  };
}
