export class ReviewResponseDto {
  id: string;
  rating: number;
  comment?: string;
  authorId: string;
  targetId: string;
  tradeId: string;
  createdAt: Date;
  updatedAt: Date;
  author?: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  target?: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
}
